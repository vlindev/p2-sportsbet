"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { closeBetting } from "@/lib/betting-actions";
import CloseBettingModal from "@/components/CloseBettingModal";
import type { Match, Bet } from "@/types";

type Member = { id: string; name: string; active: boolean };

type Props = {
  match: Match;
  bets: Bet[];
  matchId: string;
  members: Member[];
  memberMap: Record<string, string>;
  onMatchStatusChange: (newStatus: Match["status"]) => void;
  onBetsChange: () => void;
  // Controlled modal state (owned by MatchBetEntry)
  showCloseModal: boolean;
  onCloseModalClose: () => void;
  showBulkReduceModal: boolean;
  onBulkReduceModalClose: () => void;
};

export default function BettingActions({
  match, bets, matchId, members, memberMap,
  onMatchStatusChange, onBetsChange,
  showCloseModal, onCloseModalClose,
  showBulkReduceModal, onBulkReduceModalClose,
}: Props) {
  const [closeConfirming, setCloseConfirming] = useState(false);
  const [bulkReducing, setBulkReducing] = useState(false);
  const [bulkReduceSide, setBulkReduceSide] = useState<"A" | "B" | "all">("all");
  const [r1711Toast, setR1711Toast] = useState<string | null>(null);

  async function confirmClose() {
    setCloseConfirming(true);
    const result = await closeBetting(matchId, bets);
    setCloseConfirming(false);
    onCloseModalClose();
    if (!result.success) { console.error(result.error); return; }
    onMatchStatusChange("betting_closed");
    if (result.adjusted) {
      setR1711Toast(`${match.name || "此賽事"} 選手佔成已自動調整`);
      setTimeout(() => setR1711Toast(null), 4000);
    }
  }

  const twoLiangBets = bets.filter((b) => b.amount_liang === 2 && b.bet_type === "voluntary" && b.status === "active");
  const twoLiangCount = (side: "A" | "B" | "all") =>
    side === "all" ? twoLiangBets.length : twoLiangBets.filter((b) => b.team_bet_on === side).length;

  async function runBulkReduce() {
    setBulkReducing(true);
    const targetBets = bulkReduceSide === "all"
      ? twoLiangBets
      : twoLiangBets.filter((b) => b.team_bet_on === bulkReduceSide);
    const ids = targetBets.map((b) => b.id);
    if (ids.length === 0) { setBulkReducing(false); onBulkReduceModalClose(); return; }

    const { error } = await supabase.from("bets").update({ amount_liang: 1 }).in("id", ids);
    if (error) { console.error("Bulk reduce:", error); setBulkReducing(false); return; }

    const memberIds = targetBets.map((b) => b.member_id);
    if (memberIds.length > 0) {
      await supabase.from("bet_requests")
        .update({ accepted_amount: 1 })
        .eq("match_id", matchId)
        .eq("bet_type", "voluntary")
        .eq("status", "accepted")
        .in("member_id", memberIds);
    }

    const sideLabel = bulkReduceSide === "all" ? "全部" : `${bulkReduceSide}隊`;
    const { error: auditErr } = await supabase.from("audit_log").insert({
      entity_type: "match",
      entity_id: matchId,
      action_type: "bulk_reduction",
      old_value: { bet_ids: ids, amount_liang: 2 },
      new_value: { amount_liang: 1, side: bulkReduceSide, count: ids.length },
      performed_by: `bookkeeper:${sideLabel}`,
    });
    if (auditErr) console.error("Audit log:", auditErr);

    setBulkReducing(false);
    onBulkReduceModalClose();
    onBetsChange();
  }

  return (
    <>
      {showBulkReduceModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onBulkReduceModalClose}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-1">全額降注</h3>
            <p className="text-sm text-slate-500 mb-1">確認將「{match.name || "此賽事"}」所有 2兩投注改為 1兩？</p>
            <p className="text-sm text-orange-500 mb-4">此操作無法還原，需逐筆修改。</p>
            <div className="space-y-2 mb-2">
              {(["all", "A", "B"] as const).map((option) => {
                const count = twoLiangCount(option);
                const label = option === "all" ? "全部" : `${option} 隊`;
                return (
                  <label key={option} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-[1.5px] cursor-pointer transition-colors ${
                    bulkReduceSide === option ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <input type="radio" name="bulkSide" checked={bulkReduceSide === option}
                      onChange={() => setBulkReduceSide(option)} className="accent-orange-500" />
                    <span className="text-base text-slate-700">{label}</span>
                    <span className="text-sm text-slate-400 ml-auto">{count} 筆</span>
                  </label>
                );
              })}
            </div>
            {/* Affected member preview */}
            {twoLiangCount(bulkReduceSide) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-b-xl px-4 py-3 mb-4 -mt-0.5">
                <p className="text-sm font-semibold text-amber-800 mb-2">受影響會員</p>
                <div className="flex gap-4">
                  {(["A", "B"] as const).filter(s => bulkReduceSide === "all" || bulkReduceSide === s).map(s => (
                    <div key={s} className="flex-1">
                      {bulkReduceSide === "all" && <p className="text-sm font-medium text-amber-700 mb-1">{s} 隊</p>}
                      {twoLiangBets.filter(b => b.team_bet_on === s).map(b => (
                        <div key={b.id} className="flex justify-between text-sm text-amber-700 py-0.5">
                          <span>{memberMap[b.member_id] || "—"}</span>
                          <span className="font-semibold">2 → 1兩</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onBulkReduceModalClose}
                className="flex-1 px-4 py-2.5 text-base font-medium text-slate-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                取消
              </button>
              <button onClick={runBulkReduce} disabled={bulkReducing || twoLiangCount(bulkReduceSide) === 0}
                className="flex-1 px-4 py-2.5 text-base font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {bulkReducing ? "處理中..." : `確認降注 ${twoLiangCount(bulkReduceSide)} 筆`}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCloseModal && (
        <CloseBettingModal
          matchName={match.name || "此賽事"}
          matchType={match.match_type}
          teamACount={new Set(bets.filter((b) => b.team_bet_on === "A").map((b) => b.member_id)).size}
          teamBCount={new Set(bets.filter((b) => b.team_bet_on === "B").map((b) => b.member_id)).size}
          teamATotal={bets.filter((b) => b.team_bet_on === "A").reduce((s, b) => s + b.amount_liang, 0)}
          teamBTotal={bets.filter((b) => b.team_bet_on === "B").reduce((s, b) => s + b.amount_liang, 0)}
          unbettedCount={members.filter((m) => m.active).length - new Set(bets.map((b) => b.member_id)).size}
          onConfirm={confirmClose}
          onCancel={onCloseModalClose}
          confirming={closeConfirming}
        />
      )}
      {r1711Toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium z-50 animate-fade-in">
          {r1711Toast}
        </div>
      )}
    </>
  );
}
