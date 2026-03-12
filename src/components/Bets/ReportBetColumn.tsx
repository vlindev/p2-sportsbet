"use client";

import type { Bet } from "@/types";

const TYPE_ORDER: Record<string, number> = {
  mandatory_self: 0,
  voluntary: 1,
  mandatory_monday: 2,
};

type Props = {
  side: "A" | "B";
  sideBets: Bet[];
  sideTotal: number;
  winningTeam: string | null;
  hasResult: boolean;
  memberMap: Record<string, string>;
  isPool?: boolean;
  isOpeningTeam?: boolean;
  openedByTeam?: "A" | "B";
};

function formatLiang(n: number): string {
  return Number.isInteger(n) ? `${n}兩` : `${n.toFixed(1)}兩`;
}

export default function ReportBetColumn({ side, sideBets, sideTotal, winningTeam, hasResult, memberMap, isPool, isOpeningTeam, openedByTeam }: Props) {
  const isWinner = winningTeam === side;
  const isLoser = hasResult && !isWinner;
  const headerLabel = `${side} 隊`;
  const resultLabel = isWinner ? "勝" : isLoser ? "敗" : "";
  const totalZhi = isPool ? Math.round(sideTotal / 3) : 0;

  const borderClass = isPool
    ? isWinner ? "border-purple-200 bg-fuchsia-50/30" : "border-gray-200 bg-gray-50/30"
    : isWinner ? "border-emerald-200 bg-emerald-50/30" : isLoser ? "border-gray-200 bg-gray-50/30" : "border-gray-200";

  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <span className={`text-base font-bold ${isWinner ? "text-emerald-700" : isLoser ? "text-slate-400" : "text-slate-700"}`}>
          {headerLabel}
        </span>
        {resultLabel && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isWinner ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-slate-400"}`}>
            {resultLabel}
          </span>
        )}
        {isOpeningTeam && (
          <span className="text-[11px] font-semibold text-fuchsia-700 ml-auto">開盤方</span>
        )}
        <span className={`${isOpeningTeam ? "" : "ml-auto"} text-sm ${isWinner ? "text-emerald-600" : isLoser ? "text-slate-400" : "text-slate-500"}`}>
          {sideBets.length} 筆
        </span>
      </div>

      {sideBets.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">尚無投注</p>
      ) : (
        <div className="space-y-1.5">
          {[...sideBets].sort((a, b) => {
            const t = (TYPE_ORDER[a.bet_type] ?? 1) - (TYPE_ORDER[b.bet_type] ?? 1);
            if (t !== 0) return t;
            return b.amount_liang - a.amount_liang;
          }).map((bet) => {
            const isAuto = bet.bet_type === "mandatory_monday";
            const nameColor = isAuto ? "text-slate-400" : isLoser ? "text-slate-400" : "text-slate-700";
            const amountColor = isAuto ? "text-slate-400" : isWinner ? "text-emerald-600" : isLoser ? "text-slate-400" : "text-slate-700";
            return (
              <div key={bet.id} className="flex items-center gap-2 text-sm">
                <span className={`flex-1 min-w-0 truncate ${nameColor}`}>
                  {memberMap[bet.member_id] || "—"}
                </span>
                {!isPool && isAuto && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">補</span>
                )}
                <span className={`font-medium tabular-nums ${amountColor}`}>
                  {bet.amount_liang}兩
                </span>
                {isPool && (
                  <span className="text-xs text-slate-400 tabular-nums">({Math.round(bet.amount_liang / 3)}支)</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={`flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-sm font-semibold ${isWinner ? "text-emerald-700" : isLoser ? "text-slate-400" : "text-slate-600"}`}>
        <span>小計: {formatLiang(sideTotal)}{isPool ? ` (${totalZhi}支)` : ""}</span>
      </div>
      {isOpeningTeam && openedByTeam && (
        <p className="text-xs text-fuchsia-700 mt-1">僅限 {openedByTeam}隊選手投注</p>
      )}
    </div>
  );
}
