"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { openBetting, runAutoPlacementAction, placeBet } from "@/lib/betting-actions";
import MemberSelect from "@/components/MemberSelect";
import { ArrowLeft, ArrowLeftRight, Pencil } from "lucide-react";
import MatchTabBar from "./MatchTabBar";
import MatchHeader from "./MatchHeader";
import BettingActions from "./BettingActions";
import ShareRatioEditor from "./ShareRatioEditor";
import PoolBetSection from "./PoolBetSection";
import type { Match, Bet, SporadicPool } from "@/types";

type Member = { id: string; name: string; active: boolean };
type Props = { matchId: string; backUrl: string; backLabel?: string };

const TYPE_ORDER: Record<string, number> = { mandatory_self: 0, voluntary: 1, mandatory_monday: 2 };

export default function MatchBetEntry({ matchId, backUrl, backLabel }: Props) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [siblings, setSiblings] = useState<Match[]>([]);
  const [pools, setPools] = useState<SporadicPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [entryMemberId, setEntryMemberId] = useState("");
  const [entryTeam, setEntryTeam] = useState<"A" | "B" | null>(null);
  const [entryAmount, setEntryAmount] = useState<1 | 2 | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editSide, setEditSide] = useState<"A" | "B" | null>(null);
  const [editChanges, setEditChanges] = useState<{ name: string; action: "adjust" | "swap"; from?: number | string; to?: number | string }[]>([]);
  const [editToast, setEditToast] = useState<string | null>(null);
  const [highlightBetIds, setHighlightBetIds] = useState<Set<string>>(new Set());
  const [editSortSnapshot, setEditSortSnapshot] = useState<string[]>([]);
  const adjustedBetIds = useRef<Set<string>>(new Set());

  // Modal state (controlled, passed to BettingActions)
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showBulkReduceModal, setShowBulkReduceModal] = useState(false);
  const [showAutoPlaceModal, setShowAutoPlaceModal] = useState(false);

  // Auto-placement state (absorbed from BettingActions)
  const [autoPlacing, setAutoPlacing] = useState(false);
  const [autoPlaceResult, setAutoPlaceResult] = useState<number | null>(null);

  const refreshBets = useCallback(async () => {
    const { data } = await supabase.from("bets").select("*")
      .eq("match_id", matchId).eq("status", "active").is("sporadic_pool_id", null)
      .order("team_bet_on").order("created_at");
    if (data) setBets(data as Bet[]);
  }, [matchId]);

  useEffect(() => {
    setLoading(true);
    async function load() {
      const [mRes, bRes, mbRes] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("bets").select("*").eq("match_id", matchId).eq("status", "active").is("sporadic_pool_id", null).order("team_bet_on").order("created_at"),
        supabase.from("members").select("id, name, active"),
      ]);
      if (mRes.error) { setFetchError("找不到此賽事"); setLoading(false); return; }
      if (bRes.error) console.error("Fetch bets:", bRes.error);
      if (mbRes.error) console.error("Fetch members:", mbRes.error);
      const m = mRes.data as Match;
      setMatch(m);
      setBets((bRes.data || []) as Bet[]);
      const mbs = (mbRes.data || []) as Member[];
      setMembers(mbs);
      setMemberMap(Object.fromEntries(mbs.map((mb) => [mb.id, mb.name])));
      const [sibRes, poolRes] = await Promise.all([
        supabase.from("matches").select("*").eq("date", m.date).neq("status", "cancelled").order("start_time"),
        supabase.from("sporadic_pools").select("*").eq("match_id", matchId).order("created_at"),
      ]);
      setSiblings((sibRes.data || []) as Match[]);
      setPools((poolRes.data || []).filter((p: SporadicPool) => p.result !== "cancelled") as SporadicPool[]);
      setLoading(false);
    }
    load();
  }, [matchId]);

  useEffect(() => { clearForm(); }, [matchId]);

  function clearForm() { setEntryMemberId(""); setEntryTeam(null); setEntryAmount(null); setSaveError(null); }

  const teamABets = bets.filter((b) => b.team_bet_on === "A");
  const teamBBets = bets.filter((b) => b.team_bet_on === "B");
  const teamATotal = teamABets.reduce((s, b) => s + b.amount_liang, 0);
  const teamBTotal = teamBBets.reduce((s, b) => s + b.amount_liang, 0);
  const fromParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") || "current" : "current";

  const isClosed = match?.status === "betting_closed";
  const unbettedCount = members.filter((m) => m.active).length - new Set(bets.map((b) => b.member_id)).size;
  const hasTwoLiangBets = bets.some((b) => b.amount_liang === 2 && b.bet_type === "voluntary" && b.status === "active");

  function handleMatchStatusChange(s: Match["status"]) {
    setMatch((prev) => prev ? { ...prev, status: s } : prev);
    setAutoPlaceResult(null);
  }

  async function handleToggle() {
    if (isClosed) {
      // Toggle OFF → open betting
      const result = await openBetting(matchId);
      if (!result.success) { console.error(result.error); return; }
      handleMatchStatusChange("scheduled");
    } else {
      // Toggle ON → open close modal for confirmation
      setShowCloseModal(true);
    }
  }

  async function runAutoPlacement() {
    if (autoPlacing) return;
    setAutoPlacing(true); setAutoPlaceResult(null);
    const { data: freshBets, error: betsErr } = await supabase
      .from("bets").select("member_id, team_bet_on, amount_liang")
      .eq("match_id", matchId).eq("status", "active").is("sporadic_pool_id", null);
    if (betsErr) { console.error("Fetch bets for auto-placement:", betsErr); setAutoPlacing(false); return; }
    const matchBets = (freshBets || []) as { member_id: string; team_bet_on: "A" | "B"; amount_liang: number }[];
    const result = await runAutoPlacementAction(matchId, members, matchBets);
    if (!result.success) { console.error(result.error); setAutoPlacing(false); return; }
    setAutoPlaceResult(result.count);
    setAutoPlacing(false);
    refreshBets();
  }

  async function addBet() {
    if (!entryMemberId || !entryTeam || !entryAmount || !match) return;
    setSaving(true); setSaveError(null);
    const result = await placeBet({
      matchId, memberId: entryMemberId, teamBetOn: entryTeam,
      amountLiang: entryAmount, betType: "voluntary",
    });
    if (result.success && result.status === "accepted") {
      clearForm(); setSaving(false); refreshBets(); return;
    }
    if (result.success && result.status === "pending") {
      setSaveError("投注已送出，等待審核"); setSaving(false); return;
    }
    setSaveError(result.rejectReason); setSaving(false);
  }


  async function adjustAmount(bet: Bet) {
    const newAmount = bet.amount_liang === 1 ? 2 : 1;
    // Convert to voluntary on any edit — removes 補 badge
    const { error } = await supabase.from("bets").update({
      amount_liang: newAmount, bet_type: "voluntary",
      created_by_role: "bookkeeper", created_via: "manual",
    }).eq("id", bet.id);
    if (error) { console.error("adjust bet:", error); return; }
    await supabase.from("bet_requests").update({ accepted_amount: newAmount })
      .eq("match_id", matchId).eq("member_id", bet.member_id)
      .eq("bet_type", bet.bet_type).eq("status", "accepted")
      .is("sporadic_pool_id", null);
    setEditChanges(prev => [...prev, { name: memberMap[bet.member_id] || "—", action: "adjust", from: bet.amount_liang, to: newAmount }]);
    adjustedBetIds.current.add(bet.id);
    // Local state update — no refetch during edit mode (prevents re-sort)
    setBets(prev => prev.map(b => b.id === bet.id
      ? { ...b, amount_liang: newAmount, bet_type: "voluntary", created_by_role: "bookkeeper", created_via: "manual" } as Bet
      : b));
  }

  async function swapTeam(bet: Bet) {
    const newTeam = bet.team_bet_on === "A" ? "B" : "A";
    // Convert to voluntary — no longer auto-placed after bookkeeper intervention
    const { error } = await supabase.from("bets").update({
      team_bet_on: newTeam, bet_type: "voluntary",
      created_by_role: "bookkeeper", created_via: "manual",
    }).eq("id", bet.id);
    if (error) { console.error("swap team:", error); return; }
    setEditChanges(prev => [...prev, { name: memberMap[bet.member_id] || "—", action: "swap", from: bet.team_bet_on, to: newTeam }]);
    setHighlightBetIds(new Set([bet.id]));
    setTimeout(() => setHighlightBetIds(new Set()), 5000);
    // Local state update — bet moves to other column immediately
    setBets(prev => prev.map(b => b.id === bet.id
      ? { ...b, team_bet_on: newTeam, bet_type: "voluntary", created_by_role: "bookkeeper", created_via: "manual" } as Bet
      : b));
  }

  function toggleEditSide(side: "A" | "B") {
    if (editSide === side) {
      // Exiting edit mode — show summary if changes were made
      if (editChanges.length > 0) {
        const adjustCount = editChanges.filter(c => c.action === "adjust").length;
        const swapCount = editChanges.filter(c => c.action === "swap").length;
        const parts: string[] = [];
        if (adjustCount > 0) parts.push(`已調整金額 ${adjustCount} 筆`);
        if (swapCount > 0) parts.push(`已換隊 ${swapCount} 筆`);
        setEditToast(parts.join(" · "));
        setTimeout(() => setEditToast(null), 5000);
      }
      // Highlight adjusted bets after re-sort
      if (adjustedBetIds.current.size > 0) {
        setHighlightBetIds(new Set(adjustedBetIds.current));
        setTimeout(() => setHighlightBetIds(new Set()), 5000);
        adjustedBetIds.current.clear();
      }
      setEditSide(null);
      setEditChanges([]);
      setEditSortSnapshot([]);
      // Sync local state with DB after edit session
      refreshBets();
    } else {
      // Entering edit mode — snapshot current display order
      const sideBets = bets.filter(b => b.team_bet_on === side);
      const currentSorted = [...sideBets].sort((a, b) => {
        const t = (TYPE_ORDER[a.bet_type] ?? 1) - (TYPE_ORDER[b.bet_type] ?? 1);
        if (t !== 0) return t;
        return b.amount_liang - a.amount_liang;
      });
      setEditSortSnapshot(currentSorted.map(b => b.id));
      setEditSide(side);
      setEditChanges([]);
      adjustedBetIds.current.clear();
    }
  }

  if (loading) return <div className="p-6 pt-10 text-slate-400 text-sm">載入中...</div>;
  if (fetchError || !match) return (
    <div className="p-6 pt-10">
      <p className="text-red-500 text-sm mb-4">{fetchError || "發生錯誤"}</p>
      <button onClick={() => router.push(backUrl)} className="text-sm text-slate-500 hover:text-orange-500 cursor-pointer">{backLabel || "← 返回賽事"}</button>
    </div>
  );

  return (
    <div className="p-6 pt-10 pb-64 min-h-screen max-w-3xl mx-auto">
      {/* Nav */}
      <button onClick={() => router.push(backUrl)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-500 cursor-pointer mb-4">
        <ArrowLeft size={16} /> {backLabel ? backLabel.replace("← ", "") : "返回賽事"}
      </button>
      <MatchTabBar siblings={siblings} activeMatchId={matchId} fromParam={fromParam} />

      <MatchHeader match={match} memberMap={memberMap}
        extraBadges={isClosed ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">封盤</span> : undefined}
      >
        <ShareRatioEditor
          matchId={matchId} matchStatus={match.status} context="base"
          teamAPlayers={[
            { id: match.team_a_player1_id, name: memberMap[match.team_a_player1_id] || "—" },
            { id: match.team_a_player2_id, name: memberMap[match.team_a_player2_id] || "—" },
          ]}
          teamBPlayers={[
            { id: match.team_b_player1_id, name: memberMap[match.team_b_player1_id] || "—" },
            { id: match.team_b_player2_id, name: memberMap[match.team_b_player2_id] || "—" },
          ]}
          teamATotalBetsLiang={teamATotal} teamBTotalBetsLiang={teamBTotal}
        />
      </MatchHeader>

      {/* Entry form card */}
      <div className={`bg-white rounded-2xl shadow-sm p-5 mb-4 border ${isClosed ? "border-amber-200" : "border-gray-100"}`}>
        {/* Header: 新增投注 + 未投注 + iPhone toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-500">新增投注</p>
            {!isClosed && unbettedCount > 0 && (
              <>
                <span className="text-sm text-slate-400">·</span>
                <span className="text-sm text-slate-400">未投注 <span className="font-bold text-orange-500">{unbettedCount}人</span></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`text-sm ${isClosed ? "font-medium text-amber-600" : "text-slate-400"}`}>
              {isClosed ? "已封盤" : "封盤"}
            </span>
            <button
              onClick={handleToggle}
              className={`relative w-[51px] h-[31px] rounded-full cursor-pointer transition-colors ${isClosed ? "bg-amber-500" : "bg-slate-200"}`}
              title={isClosed ? "取消封盤 — 點擊後需確認" : "封盤 — 點擊後需確認"}
            >
              <span className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform ${isClosed ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        {/* Amber banner when betting_closed */}
        {isClosed && (
          <div className="bg-amber-50 rounded-lg px-4 py-3 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-amber-700">會員無法自行下注</span>
              <div className="flex items-center gap-3">
                {match.match_type === "monday" && (
                  <button onClick={() => autoPlaceResult === null && !autoPlacing ? setShowAutoPlaceModal(true) : undefined}
                    disabled={autoPlacing || autoPlaceResult !== null}
                    className="text-base font-medium text-blue-500 hover:text-blue-700 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {autoPlacing ? "派注中..." : autoPlaceResult !== null ? `已派 ${autoPlaceResult} 注` : "自動派注"}
                  </button>
                )}
                {hasTwoLiangBets && (
                  <button onClick={() => setShowBulkReduceModal(true)}
                    className="text-base font-medium text-orange-500 hover:text-orange-700 cursor-pointer transition-colors">
                    全額降注
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Entry form */}
        {saveError && <p className="text-sm text-red-500 mb-2">{saveError}</p>}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <MemberSelect members={members} value={entryMemberId} onChange={(id) => { setEntryMemberId(id); setSaveError(null); }} placeholder="搜尋會員..."
              betExclude={bets.map(b => b.member_id)} />
          </div>
          <div className="flex gap-1.5">
            {(["A", "B"] as const).map((t) => (
              <button key={t} onClick={() => setEntryTeam(entryTeam === t ? null : t)}
                className={`px-4 py-2.5 text-base font-medium rounded-lg border cursor-pointer transition-colors ${
                  entryTeam === t ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-gray-200 hover:border-orange-300"
                }`}>{t} 隊</button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {([1, 2] as const).map((a) => (
              <button key={a} onClick={() => setEntryAmount(entryAmount === a ? null : a)}
                className={`px-3 py-2.5 text-base font-medium rounded-lg border cursor-pointer transition-colors ${
                  entryAmount === a ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-gray-200 hover:border-orange-300"
                }`}>{a}兩</button>
            ))}
          </div>
          <button onClick={addBet} disabled={!entryMemberId || !entryTeam || !entryAmount || saving}
            className="px-5 py-2.5 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? "..." : "新增"}
          </button>
        </div>
      </div>

      {/* BettingActions — modals + toast only */}
      <BettingActions
        match={match} bets={bets} matchId={matchId} members={members} memberMap={memberMap}
        onMatchStatusChange={handleMatchStatusChange}
        onBetsChange={refreshBets}
        showCloseModal={showCloseModal}
        onCloseModalClose={() => setShowCloseModal(false)}
        showBulkReduceModal={showBulkReduceModal}
        onBulkReduceModalClose={() => setShowBulkReduceModal(false)}
      />

      {/* Auto-placement confirmation modal */}
      {showAutoPlaceModal && (() => {
        const unbettedMembers = members.filter(m => m.active && !bets.some(b => b.member_id === m.id));
        const autoDelta = Math.abs(teamATotal - teamBTotal);
        return (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAutoPlaceModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-800 mb-1">確認自動派注</h3>
              <p className="text-sm text-slate-400 mb-4">未投注會員自動派注1兩（系統分配）</p>

              {unbettedCount === 0 ? (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-center">
                    <p className="text-sm font-medium text-emerald-700">所有會員皆已投注，無需自動派注</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm font-semibold text-slate-500 mb-2 pb-2 border-b border-gray-200">{match.name || "此賽事"}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">A 隊</span>
                        <span className="font-medium text-slate-700">{teamABets.length}人 · {teamATotal}兩</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">B 隊</span>
                        <span className="font-medium text-slate-700">{teamBBets.length}人 · {teamBTotal}兩</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-end">
                      <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-md ${autoDelta <= 5 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>
                        差距 {autoDelta}兩
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setShowAutoPlaceModal(false)}
                    className="w-full px-4 py-2.5 text-base font-medium text-slate-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    關閉
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 mb-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">未投注會員</span>
                      <span className="text-lg font-bold text-slate-800">{unbettedCount} 人</span>
                    </div>
                  </div>
                  <details className="mb-3">
                    <summary className="text-sm text-blue-500 font-medium cursor-pointer px-4 py-1.5">查看名單 ▾</summary>
                    <div className="bg-slate-50 rounded-b-xl px-4 pb-3 -mt-0.5">
                      {unbettedMembers.map(m => (
                        <p key={m.id} className="text-sm text-slate-500 py-0.5">{m.name}</p>
                      ))}
                    </div>
                  </details>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm font-semibold text-slate-500 mb-2 pb-2 border-b border-gray-200">{match.name || "此賽事"}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">A 隊（目前）</span>
                        <span className="font-medium text-slate-700">{teamABets.length}人 · {teamATotal}兩</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">B 隊（目前）</span>
                        <span className="font-medium text-slate-700">{teamBBets.length}人 · {teamBTotal}兩</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-end">
                      <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-md ${autoDelta <= 5 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>
                        差距 {autoDelta}兩
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAutoPlaceModal(false)}
                      className="flex-1 px-4 py-2.5 text-base font-medium text-slate-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                      取消
                    </button>
                    <button onClick={() => { setShowAutoPlaceModal(false); runAutoPlacement(); }}
                      className="flex-1 px-4 py-2.5 text-base font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 cursor-pointer transition-colors">
                      確認派注 {unbettedCount} 人
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Edit summary toast — top banner */}
      {editToast && (
        <div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium mb-3 text-center">
          {editToast}
        </div>
      )}

      {/* Bet columns */}
      <p className="text-base font-bold text-slate-600 mb-3">投注明細</p>
      <div className="grid grid-cols-2 gap-4 mb-5">
        {(["A", "B"] as const).map((side) => {
          const sb = side === "A" ? teamABets : teamBBets;
          const st = side === "A" ? teamATotal : teamBTotal;
          const sorted = [...sb].sort((a, b) => {
            // During edit: use snapshot order (exact position from when pencil was clicked)
            if (editSide === side && editSortSnapshot.length > 0) {
              const aIdx = editSortSnapshot.indexOf(a.id);
              const bIdx = editSortSnapshot.indexOf(b.id);
              return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
            }
            // Normal: type then amount desc
            const t = (TYPE_ORDER[a.bet_type] ?? 1) - (TYPE_ORDER[b.bet_type] ?? 1);
            if (t !== 0) return t;
            return b.amount_liang - a.amount_liang;
          });
          let altIndex = 0;
          return (
            <div key={side} className={`rounded-xl shadow-sm p-4 transition-colors ${editSide === side ? "bg-orange-50 border-2 border-orange-300" : "bg-slate-50/70 border border-gray-100"}`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-700">{side} 隊</span>
                  {editSide === side && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500 text-white">編輯中</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500 tabular-nums">{sb.length}筆 · {st}兩</span>
                  {bets.some(b => b.bet_type === "voluntary" || b.bet_type === "mandatory_monday") && (
                    <button onClick={() => toggleEditSide(side)}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${editSide === side ? "bg-orange-500 text-white" : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"}`}
                      title={editSide === side ? "完成編輯" : "編輯投注"}>
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>
              {sb.length === 0 ? <p className="text-sm text-slate-400 py-2">尚無投注</p> : (
                <div>
                  {sorted.map((bet, idx) => {
                    const isAuto = bet.bet_type === "mandatory_monday";
                    const isSelf = bet.bet_type === "mandatory_self";
                    const isEditing = editSide === side && !isSelf;
                    const prevBet = idx > 0 ? sorted[idx - 1] : null;
                    const showDivider = prevBet?.bet_type === "mandatory_self" && bet.bet_type !== "mandatory_self";
                    const rowBg = isSelf
                      ? "bg-teal-50/50"
                      : altIndex++ % 2 === 0 ? "bg-white" : "bg-slate-50";
                    const isHighlighted = highlightBetIds.has(bet.id);
                    return (
                      <div key={bet.id}>
                      {showDivider && (
                        <div className="flex items-center gap-2 px-2 py-0.5">
                          <div className="flex-1 border-t border-dashed border-slate-300" />
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">選手 ↑ · 投注 ↓</span>
                          <div className="flex-1 border-t border-dashed border-slate-300" />
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-2 text-base py-2.5 px-2 rounded transition-colors duration-700 ${
                          isHighlighted ? "bg-orange-100 ring-1 ring-orange-300" : `${rowBg} hover:bg-blue-100`
                        }`}
                      >
                        <span className={`flex-1 min-w-0 truncate ${isSelf ? "font-medium text-slate-700" : isAuto ? "text-slate-400" : "text-slate-700"}`}>
                          {memberMap[bet.member_id] || "—"}
                        </span>
                        {isAuto && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">補</span>
                        )}
                        {isEditing ? (
                          <>
                            <div className="flex gap-1">
                              {([1, 2] as const).map((a) => (
                                <button key={a} onClick={() => { if (a !== bet.amount_liang) adjustAmount(bet); }}
                                  className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors ${
                                    bet.amount_liang === a ? "bg-orange-500 text-white" : "text-slate-400 hover:text-slate-600"
                                  }`}>{a}兩</button>
                              ))}
                            </div>
                            <button onClick={() => swapTeam(bet)}
                              className="relative group p-2 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
                              <ArrowLeftRight size={14} />
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs text-white bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap">
                                換隊
                              </span>
                            </button>
                          </>
                        ) : (
                          <span className={`font-medium tabular-nums ${isAuto ? "text-slate-400" : "text-slate-700"}`}>{bet.amount_liang}兩</span>
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pool bet sections */}
      {pools.map((pool, i) => (
        <PoolBetSection key={pool.id} pool={pool} match={match} members={members} memberMap={memberMap} poolIndex={i} />
      ))}

    </div>
  );
}
