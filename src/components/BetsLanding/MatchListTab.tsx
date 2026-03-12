"use client";

import MatchListRow from "./MatchListRow";
import type { MatchListTabProps } from "./types";

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${dt.getMonth() + 1}/${dt.getDate()} (${days[dt.getDay()]})`;
}

export default function MatchListTab({
  matches, bets, memberMap, activeMemberCount, poolCounts,
  onMatchStatusChange, onBetsChange, members,
}: MatchListTabProps) {
  // Status line
  const closedCount = matches.filter((m) => m.status === "betting_closed").length;
  const mondayMatches = matches.filter((m) => m.match_type === "monday");
  const autoPlacedCount = mondayMatches.filter((m) =>
    bets.some((b) => b.match_id === m.id && b.created_via === "scheduled_job")
  ).length;

  const hasOptional = matches.some((m) => m.match_type === "optional");

  // Group by date
  const dateGroups: { date: string; label: string; matches: typeof matches }[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    if (!seen.has(m.date)) {
      seen.add(m.date);
      dateGroups.push({
        date: m.date,
        label: fmtDate(m.date),
        matches: matches.filter((x) => x.date === m.date),
      });
    }
  }

  return (
    <div>
      {/* Status line */}
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
        <span>已封盤 <span className="font-bold text-amber-600">{closedCount}</span>/{matches.length} 場</span>
        <span className="text-slate-300">·</span>
        <span>已派注 <span className="font-bold text-blue-500">{autoPlacedCount}</span>/{mondayMatches.length} 場</span>
      </div>

      {/* Match list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {dateGroups.map((group) => {
          const groupMatches = group.matches;
          return (
            <div key={group.date}>
              {/* Date header */}
              <div className="px-5 py-2.5 bg-slate-50 border-b border-gray-100">
                <span className="text-sm font-bold text-slate-600">{group.label}</span>
                <span className="text-sm text-slate-400 ml-2">{groupMatches.length} 場</span>
              </div>
              {/* Rows */}
              {groupMatches.map((match, idx) => {
                const matchBets = bets.filter((b) => b.match_id === match.id);
                const isAutoPlaced = bets.some(
                  (b) => b.match_id === match.id && b.created_via === "scheduled_job"
                );
                const isLastInGroup = idx === groupMatches.length - 1;
                const isLastGroup = group.date === dateGroups[dateGroups.length - 1].date;
                return (
                  <MatchListRow
                    key={match.id}
                    match={match}
                    matchBets={matchBets}
                    memberMap={memberMap}
                    activeMemberCount={activeMemberCount}
                    poolCount={poolCounts[match.id] || 0}
                    isAutoPlaced={isAutoPlaced}
                    members={members}
                    onMatchStatusChange={onMatchStatusChange}
                    onBetsChange={onBetsChange}
                    isLast={isLastInGroup && isLastGroup}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {hasOptional && (
        <p className="text-xs text-slate-400 text-center mt-4">熱身賽無派注（僅限例行賽）</p>
      )}
    </div>
  );
}
