"use client";

import type { Match } from "@/types";
import { MATCH_TYPE_LABEL, MATCH_TYPE_STYLE } from "@/types";

type Props = {
  match: Match;
  memberMap: Record<string, string>;
  extraBadges?: React.ReactNode;
  children?: React.ReactNode;
};

export default function MatchHeader({ match, memberMap, extraBadges, children }: Props) {
  const aP1 = memberMap[match.team_a_player1_id] || "—";
  const aP2 = memberMap[match.team_a_player2_id] || "—";
  const bP1 = memberMap[match.team_b_player1_id] || "—";
  const bP2 = memberMap[match.team_b_player2_id] || "—";

  const isFlat = match.handicap_type === "不讓分";
  const handicapUnit = match.handicap_type === "讓點" ? "點" : "洞";
  // Arrow points from the giving team toward the receiving team
  const arrowRight = match.handicap_team === "A";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
      {/* Header: badges + match name + date */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${MATCH_TYPE_STYLE[match.match_type]}`}>
              {MATCH_TYPE_LABEL[match.match_type]}
            </span>
            {extraBadges}
            {match.name && <span className="text-sm text-slate-400 font-medium">{match.name}</span>}
          </div>
          <span className="text-sm text-slate-500">
            {match.date}{match.start_time ? ` · ${match.start_time}` : ""}
          </span>
        </div>
      </div>

      {/* Matchup: hero player names + directional handicap */}
      <div className="px-6 pt-2 pb-5">
        <div className="flex items-center justify-center gap-0 mb-2">
          <div className="flex-1 text-right pr-7">
            <p className="text-lg font-bold text-slate-800 leading-snug">{aP1} · {aP2}</p>
          </div>
          <div className="shrink-0 min-w-[100px] text-center">
            {isFlat ? (
              <span className="text-base font-bold text-slate-400">平盤</span>
            ) : arrowRight ? (
              <span className="text-base font-bold text-orange-500">讓 {match.handicap_value} {handicapUnit} →</span>
            ) : (
              <span className="text-base font-bold text-orange-500">← 讓 {match.handicap_value} {handicapUnit}</span>
            )}
          </div>
          <div className="flex-1 text-left pl-7">
            <p className="text-lg font-bold text-slate-800 leading-snug">{bP1} · {bP2}</p>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex-1 text-right pr-7">
            <span className="text-sm font-semibold text-slate-400">A 隊</span>
          </div>
          <div className="shrink-0 min-w-[100px]" />
          <div className="flex-1 text-left pl-7">
            <span className="text-sm font-semibold text-slate-400">B 隊</span>
          </div>
        </div>
      </div>

      {/* Children: result banner, share footer, etc. */}
      {children}
    </div>
  );
}
