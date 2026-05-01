"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calculateMatchPayout, liangToNtd } from "@/lib/settlement";
import type { CompletedMatch, BillingConfig, MemberMatchDetail } from "@/lib/settlement";
import type { Match, Bet, SporadicPool, MatchTeamPlayerShare } from "@/types";
import { toBillingConfig, toActiveBets, toPlayerShares, groupBy, sharesValid } from "@/lib/settlement-helpers";
import MatchTabBar from "./MatchTabBar";
import MatchHeader from "./MatchHeader";
import ShareRatioEditor from "./ShareRatioEditor";
import SettlementSection from "./SettlementSection";
import PoolReportHeader from "./PoolReportHeader";
import SettlementSummary from "./SettlementSummary";

type Props = { matchId: string; backUrl: string; backLabel?: string };
type Member = { id: string; name: string };

type MatchSettlementRow = {
  id: string;
  member_id: string;
  match_id: string;
  settlement_context: "base" | "sporadic_pool";
  sporadic_pool_id: string | null;
  settlement_date: string;
  gross_liang: number;
  rake_liang: number;
  provider_fee_liang: number;
  net_liang: number;
  detail_jsonb: MemberMatchDetail | null;
};

/** Convert a DB settlement row to MemberMatchDetail for SettlementSection.
 *  Reads from detail_jsonb (NTD) if available, otherwise derives from canonical columns. */
function rowToDetail(row: MatchSettlementRow, matchId: string): MemberMatchDetail {
  if (row.detail_jsonb) return row.detail_jsonb;
  // Fallback: derive from canonical columns (less detail, but functional)
  const netNtd = liangToNtd(row.net_liang);
  const rakeNtd = liangToNtd(row.rake_liang);
  const grossGainNtd = liangToNtd(row.gross_liang);
  const providerFeeNtd = liangToNtd(row.provider_fee_liang);
  return {
    memberId: row.member_id,
    matchId,
    betGainNtd: 0, betLossNtd: 0,
    flow1IncomeNtd: 0, flow2LiabilityNtd: 0,
    grossGainNtd, grossLossNtd: grossGainNtd - netNtd - rakeNtd - providerFeeNtd,
    netGainNtd: netNtd + rakeNtd + providerFeeNtd,
    rakeNtd, providerFeeNtd,
    providerFeeReason: providerFeeNtd > 0 ? "standard" : "none",
    finalNetNtd: netNtd,
  };
}

export default function MatchSettlementReport({ matchId, backUrl, backLabel }: Props) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [baseBets, setBaseBets] = useState<Bet[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [siblings, setSiblings] = useState<Match[]>([]);
  const [pools, setPools] = useState<SporadicPool[]>([]);
  const [poolBets, setPoolBets] = useState<Record<string, Bet[]>>({});
  const [baseShares, setBaseShares] = useState<MatchTeamPlayerShare[]>([]);
  const [poolShares, setPoolShares] = useState<Record<string, MatchTeamPlayerShare[]>>({});
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);
  const [settlementRows, setSettlementRows] = useState<MatchSettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState<"base" | string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setBillingError(false);
    setShowDiagnostic(null);
    const [matchRes, betsRes, membersRes, sharesRes, billingRes, settlementRes] = await Promise.all([
      supabase.from("matches").select("*").eq("id", matchId).single(),
      supabase.from("bets").select("*").eq("match_id", matchId).eq("status", "active").order("team_bet_on").order("created_at"),
      supabase.from("members").select("id, name"),
      supabase.from("match_team_player_shares").select("*").eq("match_id", matchId),
      supabase.from("club_billing_config").select("*").limit(1).single(),
      supabase.from("match_settlements").select("*").eq("match_id", matchId),
    ]);

    if (matchRes.error) { setFetchError("找不到此賽事"); setLoading(false); return; }
    if (betsRes.error) console.error("Fetch bets:", betsRes.error);
    if (membersRes.error) console.error("Fetch members:", membersRes.error);
    if (sharesRes.error) console.error("Fetch shares:", sharesRes.error);
    if (billingRes.error) { console.error("Fetch billing config:", billingRes.error); setBillingError(true); }

    const m = matchRes.data as Match;
    setMatch(m);
    setMemberMap(Object.fromEntries((membersRes.data || []).map((mb: Member) => [mb.id, mb.name])));

    const allBets = (betsRes.data || []) as Bet[];
    setBaseBets(allBets.filter(b => !b.sporadic_pool_id));
    setPoolBets(groupBy(allBets, b => b.sporadic_pool_id));

    const allShares = (sharesRes.data || []) as MatchTeamPlayerShare[];
    setBaseShares(allShares.filter(s => s.context === "base"));
    setPoolShares(groupBy(allShares.filter(s => s.context === "sporadic_pool"), s => s.sporadic_pool_id));

    if (!billingRes.error && billingRes.data) setBillingConfig(toBillingConfig(billingRes.data));
    setSettlementRows((settlementRes.data || []) as MatchSettlementRow[]);

    const [sibRes, poolRes] = await Promise.all([
      supabase.from("matches").select("*").eq("date", m.date).neq("status", "cancelled").order("start_time"),
      supabase.from("sporadic_pools").select("*").eq("match_id", matchId).order("created_at"),
    ]);
    setSiblings((sibRes.data || []) as Match[]);
    setPools((poolRes.data || []).filter((p: SporadicPool) => p.result !== "cancelled" && p.result !== "voided") as SporadicPool[]);
    setLoading(false);
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  const fromParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("from") || "completed"
    : "completed";

  if (loading) return <div className="p-6 pt-10 text-slate-400 text-sm">載入中...</div>;
  if (fetchError || !match) return (
    <div className="p-6 pt-10">
      <p className="text-red-500 text-sm mb-4">{fetchError || "發生錯誤"}</p>
      <button onClick={() => router.push(backUrl)} className="text-sm text-slate-500 hover:text-orange-500 cursor-pointer">{backLabel || "← 返回賽事"}</button>
    </div>
  );

  const hasResult = match.result === "team_a" || match.result === "team_b";
  const winningTeam: "A" | "B" | null = match.result === "team_a" ? "A" : match.result === "team_b" ? "B" : null;
  const hasPools = pools.length > 0;
  const pIds = { a1: match.team_a_player1_id, a2: match.team_a_player2_id, b1: match.team_b_player1_id, b2: match.team_b_player2_id };

  const baseSharesOk = sharesValid(baseShares);

  // Read base settlement from DB
  const baseSettlementRows = settlementRows.filter(r => r.settlement_context === "base");
  const baseSettlement: MemberMatchDetail[] | null =
    hasResult && baseSettlementRows.length > 0
      ? baseSettlementRows.map(r => rowToDetail(r, match.id))
      : null;
  const baseSettlementMissing = hasResult && baseSettlementRows.length === 0;

  // Diagnostic preview: calculate client-side on demand
  let diagnosticBaseSettlement: MemberMatchDetail[] | null = null;
  if (showDiagnostic === "base" && billingConfig && baseSharesOk) {
    const cm: CompletedMatch = {
      matchId: match.id, result: match.result as "team_a" | "team_b",
      teamAPlayer1Id: pIds.a1, teamAPlayer2Id: pIds.a2, teamBPlayer1Id: pIds.b1, teamBPlayer2Id: pIds.b2,
    };
    diagnosticBaseSettlement = calculateMatchPayout(cm, toActiveBets(baseBets), toPlayerShares(baseShares), billingConfig, match.date);
  }

  // Read pool settlements from DB
  const poolSettlements: Record<string, MemberMatchDetail[] | null> = {};
  const poolSettlementMissing: Record<string, boolean> = {};
  const diagnosticPoolSettlements: Record<string, MemberMatchDetail[] | null> = {};

  for (const pool of pools) {
    const poolHasResult = pool.result === "team_a" || pool.result === "team_b";
    const poolRows = settlementRows.filter(r => r.settlement_context === "sporadic_pool" && r.sporadic_pool_id === pool.id);

    if (poolHasResult && poolRows.length > 0) {
      poolSettlements[pool.id] = poolRows.map(r => rowToDetail(r, pool.id));
    } else {
      poolSettlements[pool.id] = null;
    }
    poolSettlementMissing[pool.id] = poolHasResult && poolRows.length === 0;

    // Diagnostic preview for this pool
    if (showDiagnostic === pool.id && billingConfig) {
      const pShares = poolShares[pool.id] || [];
      if (poolHasResult && sharesValid(pShares)) {
        const poolAsMatch: CompletedMatch = {
          matchId: pool.id, result: pool.result as "team_a" | "team_b",
          teamAPlayer1Id: pIds.a1, teamAPlayer2Id: pIds.a2, teamBPlayer1Id: pIds.b1, teamBPlayer2Id: pIds.b2,
        };
        diagnosticPoolSettlements[pool.id] = calculateMatchPayout(poolAsMatch, toActiveBets(poolBets[pool.id] || []), toPlayerShares(pShares), billingConfig, match.date);
      }
    }
  }

  // Summary sections — use DB settlements
  const summarySections = [
    { label: hasPools ? "基本盤" : "總計", bets: baseBets, settlements: baseSettlement },
    ...pools.map((pool, i) => ({
      label: `加強盤 #${i + 1}`, bets: poolBets[pool.id] || [], settlements: poolSettlements[pool.id],
      isPool: true, openedByTeam: pool.opened_by_team,
    })),
  ];

  return (
    <div className="p-6 pt-10 pb-32 min-h-screen max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.push(backUrl)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
          <ArrowLeft size={16} /> {backLabel ? backLabel.replace("← ", "") : "返回賽事"}
        </button>
        <button onClick={load} className="text-slate-400 hover:text-orange-500 cursor-pointer transition-colors ml-1" title="重新載入">
          <RefreshCw size={14} />
        </button>
      </div>
      <MatchTabBar siblings={siblings} activeMatchId={matchId} fromParam={fromParam} />

      <MatchHeader match={match} memberMap={memberMap}
        extraBadges={hasPools ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700">加強盤 ×{pools.length}</span> : undefined}
      >
        {hasResult && (
          <div className="mx-6 mb-2 bg-emerald-50 rounded-lg py-2.5 text-center">
            <span className="text-base font-semibold text-emerald-600">{winningTeam === "A" ? "A 隊勝" : "B 隊勝"}</span>
          </div>
        )}
        <ShareRatioEditor matchId={matchId} matchStatus={match.status} context="base"
          teamAPlayers={[{ id: pIds.a1, name: memberMap[pIds.a1] || "—" }, { id: pIds.a2, name: memberMap[pIds.a2] || "—" }]}
          teamBPlayers={[{ id: pIds.b1, name: memberMap[pIds.b1] || "—" }, { id: pIds.b2, name: memberMap[pIds.b2] || "—" }]}
          teamATotalBetsLiang={baseBets.filter(b => b.team_bet_on === "A").reduce((s, b) => s + b.amount_liang, 0)}
          teamBTotalBetsLiang={baseBets.filter(b => b.team_bet_on === "B").reduce((s, b) => s + b.amount_liang, 0)}
        />
      </MatchHeader>

      {!hasResult && (
        <div className="text-center text-sm text-slate-500 py-6 mt-4 mb-8 bg-slate-100 rounded-xl border border-slate-200">
          比賽進行中，結算待結果輸入後計算
        </div>
      )}

      {hasResult && billingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 my-4 flex items-start gap-2">
          <span>⚠</span><span>無法載入費率設定，結算無法計算。請聯繫系統管理員</span>
        </div>
      )}
      {hasResult && !billingError && !baseSharesOk && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 my-4 flex items-start gap-2">
          <span>⚠</span><span>佔成資料異常，結算無法計算。請聯繫系統管理員</span>
        </div>
      )}

      {/* Base settlement: failure state if rows missing */}
      {baseSettlementMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 my-4">
          <p className="font-medium mb-1">結算資料尚未生成</p>
          <button onClick={() => setShowDiagnostic(showDiagnostic === "base" ? null : "base")}
            className="text-xs text-amber-600 underline underline-offset-2 cursor-pointer hover:text-amber-800">
            {showDiagnostic === "base" ? "隱藏預覽" : "預覽計算結果"}
          </button>
        </div>
      )}

      {/* Diagnostic preview for base — clearly labelled */}
      {showDiagnostic === "base" && diagnosticBaseSettlement && (
        <>
          <div className="bg-amber-100/50 border border-dashed border-amber-300 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium mb-2 text-center">
            未確認預覽 — 僅供診斷參考，非正式結算
          </div>
          <SettlementSection label={hasPools ? "基本盤" : "投注明細"} bets={baseBets} settlements={diagnosticBaseSettlement}
            memberMap={memberMap} winningTeam={winningTeam} playerIds={pIds}
            shares={toPlayerShares(baseShares)} />
        </>
      )}

      {/* Normal base settlement from DB */}
      {!baseSettlementMissing && (
        <SettlementSection label={hasPools ? "基本盤" : "投注明細"} bets={baseBets} settlements={baseSettlement}
          memberMap={memberMap} winningTeam={winningTeam} playerIds={pIds}
          shares={toPlayerShares(baseShares)} />
      )}

      {pools.map((pool, i) => {
        const poolWinner: "A" | "B" | null = pool.result === "team_a" ? "A" : pool.result === "team_b" ? "B" : null;
        const poolMissing = poolSettlementMissing[pool.id];
        const diagnosticPool = diagnosticPoolSettlements[pool.id] || null;
        return (
          <div key={pool.id}>
            <PoolReportHeader poolIndex={i} pool={pool} />

            {/* Pool settlement: failure state if rows missing */}
            {poolMissing && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 my-4">
                <p className="font-medium mb-1">結算資料尚未生成</p>
                <button onClick={() => setShowDiagnostic(showDiagnostic === pool.id ? null : pool.id)}
                  className="text-xs text-amber-600 underline underline-offset-2 cursor-pointer hover:text-amber-800">
                  {showDiagnostic === pool.id ? "隱藏預覽" : "預覽計算結果"}
                </button>
              </div>
            )}

            {/* Diagnostic preview for pool */}
            {showDiagnostic === pool.id && diagnosticPool && (
              <>
                <div className="bg-amber-100/50 border border-dashed border-amber-300 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium mb-2 text-center">
                  未確認預覽 — 僅供診斷參考，非正式結算
                </div>
                <SettlementSection label={`加強盤 #${i + 1}`} bets={poolBets[pool.id] || []}
                  settlements={diagnosticPool} memberMap={memberMap} winningTeam={poolWinner}
                  playerIds={pIds} shares={toPlayerShares(poolShares[pool.id] || [])}
                  isPool openedByTeam={pool.opened_by_team} />
              </>
            )}

            {/* Normal pool settlement from DB */}
            {!poolMissing && (
              <SettlementSection label={`加強盤 #${i + 1}`} bets={poolBets[pool.id] || []}
                settlements={poolSettlements[pool.id]} memberMap={memberMap} winningTeam={poolWinner}
                playerIds={pIds} shares={toPlayerShares(poolShares[pool.id] || [])}
                isPool openedByTeam={pool.opened_by_team} />
            )}
          </div>
        );
      })}

      {hasResult && <SettlementSummary sections={summarySections} />}
    </div>
  );
}
