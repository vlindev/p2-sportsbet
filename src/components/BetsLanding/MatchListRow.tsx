"use client";

import { useRouter } from "next/navigation";
import SplitBar from "./SplitBar";
import MatchListActions from "./MatchListActions";
import type { Match, Bet } from "@/types";
import type { LandingMember } from "./types";

const BADGE_LABEL: Record<Match["match_type"], string> = { monday: "週一", optional: "熱身" };
const BADGE_STYLE: Record<Match["match_type"], string> = {
  monday: "bg-blue-100 text-blue-700",
  optional: "bg-lime-100 text-lime-700",
};

type Props = {
  match: Match;
  matchBets: Bet[];
  memberMap: Record<string, string>;
  activeMemberCount: number;
  poolCount: number;
  isAutoPlaced: boolean;
  members: LandingMember[];
  onMatchStatusChange: (matchId: string, newStatus: Match["status"]) => void;
  onBetsChange: () => void;
  isLast: boolean;
};

export default function MatchListRow({
  match, matchBets, memberMap, activeMemberCount, poolCount,
  isAutoPlaced, members, onMatchStatusChange, onBetsChange, isLast,
}: Props) {
  const router = useRouter();

  // Unique bettors per side (a member with mandatory_self + voluntary = 1 bettor per side)
  const bettorsA = new Set(matchBets.filter((b) => b.team_bet_on === "A").map((b) => b.member_id)).size;
  const bettorsB = new Set(matchBets.filter((b) => b.team_bet_on === "B").map((b) => b.member_id)).size;
  const amountA = matchBets.filter((b) => b.team_bet_on === "A").reduce((s, b) => s + b.amount_liang, 0);
  const amountB = matchBets.filter((b) => b.team_bet_on === "B").reduce((s, b) => s + b.amount_liang, 0);

  const isMonday = match.match_type === "monday";
  const total = isMonday ? activeMemberCount : null;
  const capacity = !isMonday ? match.capacity_zhi : undefined;

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

  return (
    <div
      onClick={() => router.push(`/bets?match=${match.id}&from=bets`)}
      className={`match-row grid grid-cols-12 gap-2 px-5 py-4 items-center cursor-pointer transition-all duration-150 hover:bg-slate-50 active:bg-slate-100 ${
        isLast ? "" : "border-b border-gray-50"
      }`}
    >
      {/* Col 1: Match info (5/12) */}
      <div className="col-span-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${BADGE_STYLE[match.match_type]}`}>
            {BADGE_LABEL[match.match_type]}
          </span>
          <span className="text-base font-bold text-slate-800">{match.name || "賽事"}</span>
          <span className={handicapClass}>{handicapText}</span>
          {poolCount > 0 && (
            <span className="text-sm font-medium px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700">
              加強 ×{poolCount}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          A {a1} · {a2} ｜ B {b1} · {b2}
        </p>
      </div>

      {/* Col 2: Split bar (4/12) */}
      <div className="col-span-4 pr-12">
        <SplitBar
          countA={bettorsA}
          countB={bettorsB}
          total={total}
          amountA={amountA}
          amountB={amountB}
          capacity={capacity ?? undefined}
        />
      </div>

      {/* Col 3: Actions (2/12) */}
      <div className="col-span-2">
        <MatchListActions
          match={match}
          matchBets={matchBets}
          members={members}
          isAutoPlaced={isAutoPlaced}
          onMatchStatusChange={onMatchStatusChange}
          onBetsChange={onBetsChange}
        />
      </div>

      {/* Col 4: Chevron (1/12) */}
      <div className="col-span-1 text-right text-slate-300 text-lg">&#x203A;</div>
    </div>
  );
}
