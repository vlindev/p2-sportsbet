"use client";

import { useState } from "react";

export type DetailLine =
  | { type: "item"; label: string; amountLiang: number }
  | { type: "divider" }
  | { type: "total"; label: string; amountLiang: number };

type Props = {
  name: string;
  isPlayer: boolean;
  sharePercent?: number;
  finalNetLiang: number;
  finalNetNtd: number;
  expandDetail?: DetailLine[];
};

function fmtLiang(n: number): string {
  const abs = Math.abs(n);
  const str = Number.isInteger(abs) ? `${abs}兩` : `${abs.toFixed(1)}兩`;
  return n > 0 ? `+${str}` : n < 0 ? `-${str}` : `0兩`;
}

export default function SettlementRow({ name, isPlayer, sharePercent, finalNetLiang, finalNetNtd, expandDetail }: Props) {
  const [open, setOpen] = useState(false);
  const canExpand = !!expandDetail;

  return (
    <div>
      <div
        className={`flex items-center gap-2 text-sm py-1.5 px-1 rounded-md transition-colors ${canExpand ? "cursor-pointer hover:bg-slate-200/50" : ""}`}
        onClick={canExpand ? () => setOpen(!open) : undefined}
      >
        <span className="flex-1 min-w-0 truncate font-medium text-slate-700">
          {name}
          {isPlayer && <span className="text-xs text-slate-400 font-normal ml-0.5">（選手）</span>}
          {sharePercent != null && sharePercent !== 50 && (
            <span className="text-xs text-slate-400 font-normal ml-1">({sharePercent}%)</span>
          )}
        </span>
        <span className={`font-semibold tabular-nums whitespace-nowrap ${
          finalNetLiang > 0 ? "text-emerald-600" : finalNetLiang < 0 ? "text-red-600" : "text-slate-600"
        }`}>
          {fmtLiang(finalNetLiang)}
        </span>
        <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap ml-1">
          ({finalNetNtd < 0 ? "-" : ""}${Math.abs(finalNetNtd).toLocaleString()})
        </span>
      </div>
      {open && expandDetail && (
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 mt-0.5 mb-1.5 text-[13px] text-slate-500 leading-7">
          {expandDetail.map((line, i) => {
            if (line.type === "divider") return <div key={i} className="border-t border-slate-200 my-1" />;
            const isTot = line.type === "total";
            return (
              <div key={i} className={`flex justify-between ${isTot ? "font-semibold text-slate-700" : ""}`}>
                <span>{line.label}</span>
                <span className={`tabular-nums ${
                  line.amountLiang > 0 ? "text-emerald-600" : line.amountLiang < 0 ? "text-red-600" : ""
                } ${isTot ? "font-semibold" : "font-medium"}`}>
                  {fmtLiang(line.amountLiang)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
