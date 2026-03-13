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
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${MATCH_TYPE_STYLE[match.match_type]}`}>
          {MATCH_TYPE_LABEL[match.match_type]}
        </span>
        {extraBadges}
        <span className="text-sm text-slate-500">
          {match.date}{match.start_time ? ` · ${match.start_time}` : ""}
        </span>
      </div>
      {match.name && <p className="text-lg font-bold text-slate-800 mb-3">{match.name}</p>}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-800 mb-0.5">A 隊</p>
          <p className="text-sm text-slate-500">
            {memberMap[match.team_a_player1_id] || "—"} <span className="font-bold text-slate-400">·</span> {memberMap[match.team_a_player2_id] || "—"}
          </p>
        </div>
        <div className="shrink-0 px-2 text-center">
          {match.handicap_type === "不讓分" ? (
            <span className="text-xl font-black text-slate-800">vs</span>
          ) : (
            <>
              <span className="text-base font-black text-slate-800">{match.handicap_team === "B" ? "◀" : "▶"}</span>
              <p className="text-sm font-bold text-orange-500 whitespace-nowrap">
                讓 {match.handicap_value} {match.handicap_type === "讓點" ? "點" : "洞"}
              </p>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-base font-bold text-slate-800 mb-0.5">B 隊</p>
          <p className="text-sm text-slate-500">
            {memberMap[match.team_b_player1_id] || "—"} <span className="font-bold text-slate-400">·</span> {memberMap[match.team_b_player2_id] || "—"}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
