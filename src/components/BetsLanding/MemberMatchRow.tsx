"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Match, Bet } from "@/types";

const BADGE_LABEL: Record<Match["match_type"], string> = { monday: "週一", optional: "熱身" };
const BADGE_STYLE: Record<Match["match_type"], string> = {
  monday: "bg-blue-100 text-blue-700",
  optional: "bg-lime-100 text-lime-700",
};

type Props = {
  match: Match;
  memberBet: Bet | undefined;
  memberId: string;
  memberMap: Record<string, string>;
  isPlayer: boolean;
  playerTeam: "A" | "B" | null;
  amountToggle: 1 | 2;
  onBetsChange: () => void;
};

export default function MemberMatchRow({
  match, memberBet, memberId, memberMap, isPlayer, playerTeam, amountToggle, onBetsChange,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isMonday = match.match_type === "monday";
  const hasBet = !!memberBet;
  const isMandatoryUnbetted = isMonday && !hasBet && !isPlayer;
  const isOptionalUnbetted = !isMonday && !hasBet;

  const handicapText = match.handicap_type === "不讓分"
    ? "平盤"
    : `${match.handicap_team} 讓 ${match.handicap_value} ${match.handicap_type === "讓點" ? "點" : "洞"}`;
  const handicapClass = match.handicap_type === "不讓分"
    ? "text-sm text-slate-400"
    : "text-sm text-orange-500 font-medium";

  const a1 = memberMap[match.team_a_player1_id] || "—";
  const a2 = memberMap[match.team_a_player2_id] || "—";
  const b1 = memberMap[match.team_b_player1_id] || "—";
  const b2 = memberMap[match.team_b_player2_id] || "—";

  async function quickPick(team: "A" | "B") {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const { error: reqErr } = await supabase.from("bet_requests").insert({
      match_id: match.id, member_id: memberId, team_bet_on: team,
      bet_type: "voluntary", requested_amount: amountToggle, accepted_amount: amountToggle,
      status: "accepted", created_by_role: "bookkeeper", created_via: "manual",
    });
    if (reqErr) { console.error("Quick-pick bet_request:", reqErr); setSaveError("儲存失敗，請重試"); setSaving(false); return; }

    const { error: betErr } = await supabase.from("bets").insert({
      match_id: match.id, member_id: memberId, team_bet_on: team,
      amount_liang: amountToggle, bet_type: "voluntary", result: "pending", status: "active",
      created_by_role: "bookkeeper", created_via: "manual",
    });
    if (betErr) { console.error("Quick-pick bet:", betErr); setSaveError("儲存失敗，請重試"); setSaving(false); return; }

    setSaving(false);
    onBetsChange();
  }

  // Bet status display
  let betStatusEl: React.ReactNode = null;
  let actionEl: React.ReactNode = null;

  if (isPlayer && hasBet) {
    // Player with mandatory_self bet
    betStatusEl = (
      <span className="text-sm font-medium text-emerald-600">
        {memberBet.team_bet_on} 隊 · {memberBet.amount_liang}兩
      </span>
    );
    actionEl = <span className="text-sm text-slate-300 px-2 py-1">選手</span>;
  } else if (hasBet) {
    // Has a bet (voluntary or auto-placed)
    const isAutoPlaced = memberBet.created_via === "scheduled_job";
    if (isAutoPlaced) {
      betStatusEl = (
        <span className="inline-flex items-center gap-1 text-sm text-slate-400">
          <span className="text-sm font-medium px-1.5 py-0.5 rounded bg-gray-100 text-slate-500">補</span>
          {memberBet.team_bet_on} 隊 · {memberBet.amount_liang}兩
        </span>
      );
    } else {
      betStatusEl = (
        <span className="text-sm font-medium text-emerald-600">
          {memberBet.team_bet_on} 隊 · {memberBet.amount_liang}兩
        </span>
      );
    }
    actionEl = (
      <button
        onClick={(e) => { e.stopPropagation(); router.push(`/bets?match=${match.id}&from=bets`); }}
        className="text-sm text-slate-400 hover:text-orange-500 cursor-pointer px-2 py-1 rounded hover:bg-orange-50"
      >
        編輯 →
      </button>
    );
  } else if (isMandatoryUnbetted) {
    betStatusEl = <span className="text-sm text-orange-500 font-medium">未投注</span>;
    actionEl = (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); quickPick("A"); }} disabled={saving}
          className="text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 cursor-pointer px-3 py-1.5 rounded-md disabled:opacity-50">
          A
        </button>
        <button onClick={(e) => { e.stopPropagation(); quickPick("B"); }} disabled={saving}
          className="text-sm font-medium text-orange-500 border border-orange-300 hover:bg-orange-50 cursor-pointer px-3 py-1.5 rounded-md disabled:opacity-50">
          B
        </button>
      </div>
    );
  } else if (isOptionalUnbetted) {
    betStatusEl = <span className="text-sm text-slate-300">未投注</span>;
    actionEl = (
      <button
        onClick={(e) => { e.stopPropagation(); router.push(`/bets?match=${match.id}&from=bets`); }}
        className="text-sm text-slate-400 border border-gray-200 hover:border-orange-300 hover:text-orange-500 cursor-pointer px-2.5 py-1 rounded hover:bg-orange-50"
      >
        新增 →
      </button>
    );
  }

  const rowBg = isMandatoryUnbetted ? "bg-orange-50/40" : "";

  return (
    <div className={`px-5 py-3.5 ${rowBg}`}>
    {saveError && <p className="text-xs text-red-500 mb-1">{saveError}</p>}
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${BADGE_STYLE[match.match_type]}`}>
            {BADGE_LABEL[match.match_type]}
          </span>
          <span className="text-base font-bold text-slate-700">{match.name || "賽事"}</span>
          <span className={handicapClass}>{handicapText}</span>
          {isPlayer && <span className="text-sm font-medium text-teal-600">選手</span>}
        </div>
        <p className="text-sm text-slate-400 truncate">
          A {a1} · {a2} ｜ B {b1} · {b2}
        </p>
      </div>
      <div className="shrink-0 text-right">{betStatusEl}</div>
      <div className="shrink-0">{actionEl}</div>
    </div>
    </div>
  );
}
