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

  return (
    <div className="mb-4">
      <select
        value={activeMatchId}
        onChange={(e) => router.push(`/bets?match=${e.target.value}&from=${fromParam}`)}
        className="w-full px-3.5 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white text-slate-700 cursor-pointer hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
      >
        {siblings.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name || s.start_time || "賽事"}
          </option>
        ))}
      </select>
    </div>
  );
}
