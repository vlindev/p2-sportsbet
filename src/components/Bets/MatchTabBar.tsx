"use client";

import { useRouter } from "next/navigation";
import type { Match } from "@/types";

type Props = {
  siblings: Match[];
  activeMatchId: string;
  fromParam: string;
};

export default function MatchTabBar({ siblings, activeMatchId, fromParam }: Props) {
  const router = useRouter();

  if (siblings.length <= 1) return null;

  const today = new Date().toISOString().slice(0, 10);
  const todayMatches = siblings.filter((s) => s.date === today);
  const otherMatches = siblings.filter((s) => s.date !== today);

  return (
    <div className="mb-4 relative">
      <select
        value={activeMatchId}
        onChange={(e) => router.push(`/bets?match=${e.target.value}&from=${fromParam}`)}
        className="w-full px-5 py-2.5 pr-12 text-sm border border-gray-200 rounded-lg bg-white text-slate-700 cursor-pointer hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
      >
        {todayMatches.length > 0 && (
          <optgroup label="今日賽事">
            {todayMatches.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.start_time || "賽事"}
              </option>
            ))}
          </optgroup>
        )}
        {otherMatches.length > 0 && (
          <optgroup label={todayMatches.length > 0 ? "本週其他" : "賽事"}>
            {otherMatches.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.start_time || "賽事"}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <svg className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  );
}
