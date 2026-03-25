"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { placeBet } from "@/lib/betting-actions";
import MemberSelect from "@/components/MemberSelect";
import ShareRatioEditor from "./ShareRatioEditor";
import { X } from "lucide-react";
import type { Match, Bet, SporadicPool } from "@/types";

type Member = { id: string; name: string; active: boolean };

type Props = {
  pool: SporadicPool;
  match: Match;
  members: Member[];
  memberMap: Record<string, string>;
  poolIndex: number;
};

const ZHI_PRESETS = [1, 2, 3, 5, 10];

export default function PoolBetSection({ pool, match, members, memberMap, poolIndex }: Props) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [entryMemberId, setEntryMemberId] = useState("");
  const [entryTeam, setEntryTeam] = useState<"A" | "B" | null>(null);
  const [entryZhi, setEntryZhi] = useState<number | null>(null);
  const [customZhi, setCustomZhi] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchBets = useCallback(async () => {
    const { data, error } = await supabase.from("bets").select("*")
      .eq("sporadic_pool_id", pool.id).eq("status", "active")
      .order("team_bet_on").order("created_at");
    if (error) { console.error("Fetch pool bets:", error); return; }
    if (data) setBets(data as Bet[]);
  }, [pool.id]);

  useEffect(() => { fetchBets(); }, [fetchBets]);

  const teamABets = bets.filter(b => b.team_bet_on === "A");
  const teamBBets = bets.filter(b => b.team_bet_on === "B");
  const teamATotal = teamABets.reduce((s, b) => s + b.amount_liang, 0);
  const teamBTotal = teamBBets.reduce((s, b) => s + b.amount_liang, 0);
  const totalZhi = Math.round((teamATotal + teamBTotal) / 3);
  const capacityPct = Math.min(100, Math.round(totalZhi / pool.capacity_zhi * 100));

  // R5.4: NO ONE can bet on the opening team (universal — no player exception)
  const openingSide = pool.opened_by_team;

  // R5.4: auto-clear team selection if opening side selected
  useEffect(() => {
    if (entryTeam === openingSide) {
      setEntryTeam(null);
    }
  }, [entryTeam, openingSide]);

  const effectiveZhi = entryZhi ?? (customZhi ? parseInt(customZhi) || 0 : 0);
  const effectiveLiang = effectiveZhi * 3;

  async function addBet() {
    if (!entryMemberId || !entryTeam || effectiveZhi <= 0) return;
    // R5.4: universal — no one can bet on opening team (advisory, RPC is authority)
    if (entryTeam === openingSide) {
      setSaveError("不可投注開盤方"); return;
    }
    // R11.2: pool amount advisory check
    if (effectiveLiang < 3 || effectiveLiang > 150) {
      setSaveError("投注金額：1–50 支（3–150兩）"); return;
    }
    setSaving(true); setSaveError(null);
    const result = await placeBet({
      matchId: match.id, memberId: entryMemberId, teamBetOn: entryTeam,
      amountLiang: effectiveLiang, betType: "voluntary",
      sporadicPoolId: pool.id,
    });
    if (result.success && result.status === "accepted") {
      setEntryMemberId(""); setEntryTeam(null); setEntryZhi(null); setCustomZhi("");
      setSaving(false); setSaveError(null); fetchBets(); return;
    }
    if (result.success && result.status === "pending") {
      setSaveError("投注已送出，等待審核"); setSaving(false); return;
    }
    setSaveError(result.rejectReason); setSaving(false);
  }

  async function removeBet(bet: Bet) {
    setRemoving(bet.id);
    const { error } = await supabase.from("bets").delete().eq("id", bet.id);
    if (error) { console.error("delete pool bet:", error); setRemoving(null); return; }
    // 🟡-1: Clean up matching bet_request
    const { error: reqErr } = await supabase.from("bet_requests").delete()
      .eq("match_id", match.id).eq("member_id", bet.member_id)
      .eq("bet_type", bet.bet_type).eq("status", "accepted")
      .eq("sporadic_pool_id", pool.id);
    if (reqErr) console.error("cleanup pool bet_request:", reqErr);
    setRemoving(null);
    fetchBets();
  }

  function renderBetColumn(side: "A" | "B") {
    const sb = side === "A" ? teamABets : teamBBets;
    const isRestricted = side === openingSide;
    return (
      <div className={`rounded-xl p-4 ${isRestricted ? "border border-dashed border-fuchsia-200 bg-fuchsia-50/30" : "bg-white border border-gray-100"}`}>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <span className="text-base font-bold text-slate-700">{side} 隊</span>
          {isRestricted ? (
            <span className="text-xs font-semibold text-fuchsia-600">開盤方 · {sb.length}筆 · {Math.round(sb.reduce((s, b) => s + b.amount_liang, 0) / 3)}支</span>
          ) : (
            <span className="text-xs text-slate-400">{sb.length}筆 · {Math.round(sb.reduce((s, b) => s + b.amount_liang, 0) / 3)}支</span>
          )}
        </div>
        {sb.length === 0 ? <p className="text-sm text-slate-400 py-2">尚無投注</p> : (
          <div className="space-y-1.5">
            {sb.map(bet => (
              <div key={bet.id} className="flex items-center gap-2 text-sm group">
                <span className="flex-1 min-w-0 truncate text-slate-700">{memberMap[bet.member_id] || "—"}</span>
                <span className="font-medium tabular-nums text-slate-700">{bet.amount_liang}兩</span>
                <span className="text-xs text-slate-400">({Math.round(bet.amount_liang / 3)}支)</span>
                <button onClick={() => removeBet(bet)} disabled={removing === bet.id}
                  className="text-slate-300 hover:text-red-400 cursor-pointer transition-colors disabled:opacity-50">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {isRestricted && <p className="text-xs text-fuchsia-500 text-center mt-2">開盤方 · 不可投注</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 pt-5 border-t-2 border-fuchsia-200">
      {/* Pool header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700">加強{poolIndex + 1}</span>
        <span className="text-sm font-bold text-slate-700">{match.name ? `${match.name}-${poolIndex + 1}` : `加強盤 ${poolIndex + 1}`}</span>
        <span className="text-xs text-slate-400">{openingSide}隊開盤</span>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs text-slate-400">
          {pool.handicap_type === "不讓分" ? "平盤" : `${pool.handicap_team}隊讓${pool.handicap_value}${pool.handicap_type === "讓點" ? "點" : "洞"}`}
        </span>
      </div>

      {/* Capacity bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-slate-500">容量</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-fuchsia-400 rounded-full transition-all" style={{ width: `${capacityPct}%` }} />
        </div>
        <span className="text-sm font-bold text-fuchsia-600 tabular-nums">{totalZhi} / {pool.capacity_zhi} 支</span>
      </div>

      {/* Share ratio editor */}
      <ShareRatioEditor
        matchId={match.id}
        matchStatus={match.status}
        teamAPlayers={[
          { id: match.team_a_player1_id, name: memberMap[match.team_a_player1_id] || "—" },
          { id: match.team_a_player2_id, name: memberMap[match.team_a_player2_id] || "—" },
        ]}
        teamBPlayers={[
          { id: match.team_b_player1_id, name: memberMap[match.team_b_player1_id] || "—" },
          { id: match.team_b_player2_id, name: memberMap[match.team_b_player2_id] || "—" },
        ]}
        context="sporadic_pool"
        sporadicPoolId={pool.id}
        teamATotalBetsLiang={teamATotal}
        teamBTotalBetsLiang={teamBTotal}
      />

      {/* Bet columns */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {renderBetColumn("A")}
        {renderBetColumn("B")}
      </div>

      {/* Entry form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-medium text-slate-500 mb-3">新增投注（加強盤）</p>
        {saveError && <p className="text-sm text-red-500 mb-2">{saveError}</p>}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 items-center">
            <div className="flex-1 min-w-0">
              <MemberSelect members={members} value={entryMemberId}
                onChange={id => { setEntryMemberId(id); setSaveError(null); }} placeholder="搜尋會員..."
                betExclude={bets.map(b => b.member_id)} />
            </div>
            <div className="flex gap-1.5">
              {(["A", "B"] as const).map(t => {
                const isOpeningSide = t === openingSide;
                return (
                  <button key={t} onClick={() => !isOpeningSide && setEntryTeam(entryTeam === t ? null : t)} disabled={isOpeningSide}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      isOpeningSide ? "bg-gray-50 text-slate-300 border-gray-100 cursor-not-allowed"
                      : entryTeam === t ? "bg-orange-500 text-white border-orange-500 cursor-pointer"
                      : "bg-white text-slate-600 border-gray-200 hover:border-orange-300 cursor-pointer"
                    }`}>{t} 隊</button>
                );
              })}
            </div>
          </div>
          {entryTeam && (
            <div className="flex items-center gap-2 flex-wrap">
              {ZHI_PRESETS.map(z => (
                <button key={z} onClick={() => { setEntryZhi(entryZhi === z ? null : z); setCustomZhi(""); }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                    entryZhi === z ? "bg-fuchsia-500 text-white border-fuchsia-500" : "bg-white text-slate-600 border-gray-200 hover:border-fuchsia-300"
                  }`}>{z}支</button>
              ))}
              <input type="number" min={1} max={50} value={customZhi} placeholder="支"
                onChange={e => { setCustomZhi(e.target.value); setEntryZhi(null); }}
                className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center" />
              {effectiveZhi > 0 && <span className="text-sm text-slate-400">= {effectiveLiang}兩</span>}
              <button onClick={addBet} disabled={!entryMemberId || !entryTeam || effectiveZhi <= 0 || saving}
                className="px-5 py-1.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto">
                {saving ? "..." : "新增"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
