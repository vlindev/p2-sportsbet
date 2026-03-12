"use client";

import type { Match, Bet } from "@/types";
import type { NewBetEntry } from "./types";
import { MATCH_TYPE_LABEL, MATCH_TYPE_STYLE } from "@/types";

type Props = {
  match: Match;
  memberMap: Record<string, string>;
  existingBet: Bet | null;
  isPlayer: boolean;
  playerTeam: "A" | "B" | null;
  newBet: NewBetEntry | undefined;
  onChange: (entry: NewBetEntry | undefined) => void;
};

export default function MatchBetRow({ match, memberMap, existingBet, isPlayer, playerTeam, newBet, onChange }: Props) {
  const handicapLabel = match.handicap_type === "\u4E0D\u8B93\u5206" ? "\u5E73\u76E4"
    : `\u8B93${match.handicap_value}${match.handicap_type === "\u8B93\u9EDE" ? "\u9EDE" : "\u6D1E"} ${match.handicap_team}\u8B93`;
  const pA = `${memberMap[match.team_a_player1_id] || "\u2014"} \u00B7 ${memberMap[match.team_a_player2_id] || "\u2014"}`;
  const pB = `${memberMap[match.team_b_player1_id] || "\u2014"} \u00B7 ${memberMap[match.team_b_player2_id] || "\u2014"}`;
  const isClosed = match.status === "betting_closed";

  function selectTeam(team: "A" | "B") {
    if (newBet?.teamBetOn === team) onChange(undefined);
    else onChange({ teamBetOn: team, amountLiang: null });
  }

  function selectAmount(amt: 1 | 2) {
    if (!newBet) return;
    if (newBet.amountLiang === amt) onChange({ ...newBet, amountLiang: null });
    else onChange({ ...newBet, amountLiang: amt });
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isClosed ? "border-amber-200" : "border-gray-100"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {match.name && <span className="text-sm font-semibold text-slate-700">{match.name}</span>}
        <span className="text-xs text-slate-400">{handicapLabel}</span>
        {match.start_time && <span className="text-xs text-slate-400">{match.start_time}</span>}
        {isClosed && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{"\u5C01\u76E4"}</span>}
        <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${MATCH_TYPE_STYLE[match.match_type]}`}>
          {MATCH_TYPE_LABEL[match.match_type]}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
        <span className="truncate">A{"\u968A"} {pA}</span>
        <span className="text-slate-300 shrink-0">vs</span>
        <span className="truncate">B{"\u968A"} {pB}</span>
      </div>

      {/* Bet state */}
      {isPlayer ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="text-slate-300">{"\uD83D\uDD12"}</span>
          <span>{"\u7403\u54E1"} {"\u2014"} {"\u5DF2\u81EA\u6295"} {playerTeam}{"\u968A"} 5{"\u5169"}</span>
        </div>
      ) : existingBet ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-emerald-500">{"\u2713"}</span>
          <span className="text-slate-600">
            {"\u5DF2\u4E0B\u6CE8"} {existingBet.team_bet_on}{"\u968A"} {existingBet.amount_liang}{"\u5169"}
            {existingBet.bet_type === "mandatory_monday" && <span className="text-slate-400 ml-1">({"\u81EA\u52D5\u88DC\u6CE8"})</span>}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {(["A", "B"] as const).map((t) => (
              <button key={t} onClick={() => selectTeam(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                  newBet?.teamBetOn === t ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-gray-200 hover:border-orange-300"
                }`}>
                {t} {"\u968A"}
              </button>
            ))}
          </div>
          {newBet && (
            <div className="flex gap-1.5">
              {([1, 2] as const).map((a) => (
                <button key={a} onClick={() => selectAmount(a)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                    newBet.amountLiang === a ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-gray-200 hover:border-slate-400"
                  }`}>
                  {a}{"\u5169"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
