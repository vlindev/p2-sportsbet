"use client";

import { useState } from "react";
import { placeBet } from "@/lib/betting-actions";
import type { Match } from "@/types";

type Props = {
  unbettedMondayMatches: Match[];
  memberId: string;
  amountToggle: 1 | 2;
  onAmountChange: (v: 1 | 2) => void;
  onBetsChange: () => void;
};

export default function MemberQuickActions({
  unbettedMondayMatches, memberId, amountToggle, onAmountChange, onBetsChange,
}: Props) {
  const [bulkBuying, setBulkBuying] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  if (unbettedMondayMatches.length === 0) return null;

  async function bulkBuy(team: "A" | "B") {
    if (bulkBuying || !memberId) return;
    setBulkBuying(true);
    setBulkError(null);

    let placed = 0;
    let skipped = 0;
    let lastError = "";
    for (const m of unbettedMondayMatches) {
      const result = await placeBet({
        matchId: m.id, memberId, teamBetOn: team,
        amountLiang: amountToggle, betType: "voluntary",
      });
      if (result.success && result.status === "accepted") { placed++; continue; }
      if (result.success && result.status === "pending") { placed++; continue; }
      // Duplicate = already betted, skip gracefully
      if (result.rejectReason === "此會員已有此場投注") { skipped++; continue; }
      lastError = result.rejectReason;
    }

    setBulkBuying(false);
    if (placed === 0 && skipped === 0 && lastError) { setBulkError(lastError); return; }
    onBetsChange();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3.5">
      {bulkError && <p className="text-xs text-red-500 mb-2">{bulkError}</p>}
      <div className="flex items-center justify-between flex-wrap gap-2">
      <span className="text-sm text-slate-500">
        週一未投注 {unbettedMondayMatches.length} 場 —
      </span>
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          <button onClick={() => bulkBuy("A")} disabled={bulkBuying}
            className="text-sm font-medium text-orange-500 border border-orange-300 hover:bg-orange-50 cursor-pointer px-3 py-1.5 rounded-md disabled:opacity-50">
            全部買 A 隊
          </button>
          <button onClick={() => bulkBuy("B")} disabled={bulkBuying}
            className="text-sm font-medium text-orange-500 border border-orange-300 hover:bg-orange-50 cursor-pointer px-3 py-1.5 rounded-md disabled:opacity-50">
            全部買 B 隊
          </button>
        </div>
        <span className="text-slate-200">|</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onAmountChange(1)}
            className={`text-sm font-medium px-3 py-1 rounded-md cursor-pointer ${
              amountToggle === 1 ? "bg-slate-800 text-white" : "border border-gray-200 text-slate-500"
            }`}>
            1兩
          </button>
          <button onClick={() => onAmountChange(2)}
            className={`text-sm font-medium px-3 py-1 rounded-md cursor-pointer ${
              amountToggle === 2 ? "bg-slate-800 text-white" : "border border-gray-200 text-slate-500"
            }`}>
            2兩
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
