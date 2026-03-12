"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
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

    const reqs = unbettedMondayMatches.map((m) => ({
      match_id: m.id, member_id: memberId, team_bet_on: team,
      bet_type: "voluntary", requested_amount: amountToggle, accepted_amount: amountToggle,
      status: "accepted", created_by_role: "bookkeeper", created_via: "manual",
    }));
    const { error: reqErr } = await supabase.from("bet_requests").insert(reqs);
    if (reqErr) { console.error("Bulk buy bet_requests:", reqErr); setBulkError("批次投注失敗，請重試"); setBulkBuying(false); return; }

    const bets = unbettedMondayMatches.map((m) => ({
      match_id: m.id, member_id: memberId, team_bet_on: team,
      amount_liang: amountToggle, bet_type: "voluntary", result: "pending", status: "active",
      created_by_role: "bookkeeper", created_via: "manual",
    }));
    const { error: betErr } = await supabase.from("bets").insert(bets);
    if (betErr) { console.error("Bulk buy bets:", betErr); setBulkError("批次投注失敗，請重試"); setBulkBuying(false); return; }

    setBulkBuying(false);
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
