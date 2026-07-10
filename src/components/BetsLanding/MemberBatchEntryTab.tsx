"use client";

import { useState } from "react";
import MemberSelect from "@/components/MemberSelect";
import MatchBetRow from "@/components/Bets/MatchBetRow";
import { placeBet } from "@/lib/betting-actions";
import type { Bet, Match } from "@/types";
import type { LandingMember, NewBatchBetEntry } from "./types";

type Props = {
  matches: Match[];
  bets: Bet[];
  members: LandingMember[];
  memberMap: Record<string, string>;
  onBetsChange: () => void;
};

type BatchResult = { matchId: string; matchName: string; status: "accepted" | "pending" | "skipped" | "error"; message: string };

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${dt.getMonth() + 1}/${dt.getDate()} (${days[dt.getDay()]})`;
}

function playerTeam(match: Match, memberId: string): "A" | "B" | null {
  if (match.team_a_player1_id === memberId || match.team_a_player2_id === memberId) return "A";
  if (match.team_b_player1_id === memberId || match.team_b_player2_id === memberId) return "B";
  return null;
}

export default function MemberBatchEntryTab({ matches, bets, members, memberMap, onBetsChange }: Props) {
  const dates = Array.from(new Set(matches.map((m) => m.date)));
  const [selectedDate, setSelectedDate] = useState(dates[0] || "");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [newBets, setNewBets] = useState<Map<string, NewBatchBetEntry>>(new Map());
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);

  const activeDate = selectedDate || dates[0] || "";
  const dateMatches = matches.filter((m) => m.date === activeDate);
  const selectedMemberBets = selectedMemberId ? bets.filter((b) => b.member_id === selectedMemberId) : [];
  const completeEntries = Array.from(newBets.entries()).filter(([, e]) => e.amountLiang !== null);

  function resetForMember(id: string) {
    setSelectedMemberId(id);
    setNewBets(new Map());
    setResults([]);
  }

  function updateNewBet(matchId: string, entry: NewBatchBetEntry | undefined) {
    setNewBets((prev) => {
      const next = new Map(prev);
      if (entry) next.set(matchId, entry);
      else next.delete(matchId);
      return next;
    });
  }

  async function submitBatch() {
    if (!selectedMemberId || completeEntries.length === 0 || saving) return;
    setSaving(true);
    const summary: BatchResult[] = [];

    for (const [matchId, entry] of completeEntries) {
      if (entry.amountLiang === null) continue;
      const match = matches.find((m) => m.id === matchId);
      const label = match?.name || "賽事";
      const result = await placeBet({
        matchId,
        memberId: selectedMemberId,
        teamBetOn: entry.teamBetOn,
        amountLiang: entry.amountLiang,
        betType: "voluntary",
      });
      if (result.success && result.status === "accepted") {
        summary.push({ matchId, matchName: label, status: "accepted", message: "已新增" });
      } else if (result.success && result.status === "pending") {
        summary.push({ matchId, matchName: label, status: "pending", message: "等待審核" });
      } else {
        const skipped = result.rejectReason === "此會員已有此場投注" || result.rejectReason === "此會員已有待處理的投注請求";
        summary.push({ matchId, matchName: label, status: skipped ? "skipped" : "error", message: result.rejectReason });
      }
    }

    setResults(summary);
    setSaving(false);
    setNewBets(new Map());
    onBetsChange();
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-500 mb-2 block">比賽日期</label>
          <div className="flex gap-2 flex-wrap">
            {dates.map((d) => (
              <button key={d} onClick={() => { setSelectedDate(d); setNewBets(new Map()); setResults([]); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg border cursor-pointer ${
                  activeDate === d ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-gray-200 hover:border-orange-300"
                }`}>
                {fmtDate(d)}
                <span className={`ml-1.5 text-xs ${activeDate === d ? "text-orange-100" : "text-slate-400"}`}>
                  {matches.filter((m) => m.date === d).length}場
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-500 mb-2 block">會員</label>
          <div className="max-w-sm">
            <MemberSelect members={members} value={selectedMemberId} onChange={resetForMember} placeholder="搜尋會員姓名..." />
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {results.map((r) => (
            <div key={r.matchId} className="px-4 py-2.5 flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{r.matchName}</span>
              <span className={r.status === "error" ? "text-red-500" : r.status === "skipped" ? "text-slate-400" : "text-emerald-600"}>
                {r.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedMemberId && (
        <div className="space-y-3">
          {dateMatches.map((match) => {
            const pt = playerTeam(match, selectedMemberId);
            return (
              <MatchBetRow key={match.id} match={match} memberMap={memberMap}
                existingBet={selectedMemberBets.find((b) => b.match_id === match.id) || null}
                isPlayer={pt !== null} playerTeam={pt}
                newBet={newBets.get(match.id)} onChange={(e) => updateNewBet(match.id, e)} />
            );
          })}
        </div>
      )}

      {completeEntries.length > 0 && (
        <div className="sticky bottom-24 md:bottom-4">
          <button onClick={submitBatch} disabled={saving}
            className="w-full bg-orange-500 text-white text-base font-semibold py-3 rounded-xl hover:bg-orange-600 cursor-pointer disabled:opacity-50 shadow-lg">
            {saving ? "儲存中..." : `確認新增 ${completeEntries.length} 筆投注`}
          </button>
        </div>
      )}
    </div>
  );
}
