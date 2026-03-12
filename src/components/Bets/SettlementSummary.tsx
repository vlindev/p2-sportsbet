import type { Bet, SporadicPool } from "@/types";
import type { MemberMatchDetail } from "@/lib/settlement";
import { ntdToLiang } from "@/lib/settlement";

type SectionSummary = {
  label: string;
  bets: Bet[];
  settlements: MemberMatchDetail[] | null;
  isPool?: boolean;
  openedByTeam?: "A" | "B";
};

type Props = {
  sections: SectionSummary[];
};

function fmtLiang(n: number): string {
  return Number.isInteger(n) ? `${n}兩` : `${n.toFixed(1)}兩`;
}

function fmtNtd(ntd: number): string {
  return `$${Math.abs(ntd).toLocaleString()}`;
}

export default function SettlementSummary({ sections }: Props) {
  let grandTotalBetsLiang = 0;
  let grandTotalRakeNtd = 0;

  const sectionRows = sections.map((sec) => {
    const teamABets = sec.bets.filter(b => b.team_bet_on === "A");
    const teamBBets = sec.bets.filter(b => b.team_bet_on === "B");
    const teamATotal = teamABets.reduce((s, b) => s + b.amount_liang, 0);
    const teamBTotal = teamBBets.reduce((s, b) => s + b.amount_liang, 0);
    const totalBets = teamATotal + teamBTotal;
    const totalRakeNtd = sec.settlements?.reduce((s, d) => s + d.rakeNtd, 0) ?? 0;
    const totalRakeLiang = ntdToLiang(totalRakeNtd);

    grandTotalBetsLiang += totalBets;
    grandTotalRakeNtd += totalRakeNtd;

    const teamAZhi = sec.isPool ? Math.round(teamATotal / 3) : 0;
    const teamBZhi = sec.isPool ? Math.round(teamBTotal / 3) : 0;

    return (
      <div key={sec.label}>
        <p className={`text-[13px] font-semibold mt-1.5 mb-0.5 ${sec.isPool ? "text-fuchsia-700" : "text-slate-400"}`}>
          {sec.label}
        </p>
        <Row label="投注" value={`${fmtLiang(totalBets)}`} ntd={fmtNtd(totalBets * 1000)} />
        <Row label="A 隊" value={`${fmtLiang(teamATotal)}${sec.isPool ? ` (${teamAZhi}支)` : ""}`} />
        <Row label={sec.isPool && sec.openedByTeam === "B" ? "B 隊（開盤方）" : "B 隊"}
          value={`${fmtLiang(teamBTotal)}${sec.isPool ? ` (${teamBZhi}支)` : ""}`} />
        {sec.settlements && <Row label="抽水" value={fmtLiang(totalRakeLiang)} ntd={fmtNtd(totalRakeNtd)} />}
      </div>
    );
  });

  const hasMultiple = sections.length > 1;
  const grandTotalRakeLiang = ntdToLiang(grandTotalRakeNtd);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      {sectionRows}

      {hasMultiple && (
        <>
          <div className="border-t-2 border-slate-200 my-3" />
          <Row label="合計投注" value={fmtLiang(grandTotalBetsLiang)} ntd={fmtNtd(grandTotalBetsLiang * 1000)} bold />
          <Row label="合計抽水" value={fmtLiang(grandTotalRakeLiang)} ntd={fmtNtd(grandTotalRakeNtd)} bold />
        </>
      )}

      {!hasMultiple && !sections[0]?.settlements && (
        <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-gray-100">
          結算金額待比賽結果輸入後計算
        </p>
      )}

      <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
        <button className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg border border-gray-200 bg-white text-slate-500 hover:border-orange-300 hover:text-orange-500 cursor-pointer transition-colors">
          匯出 Excel
        </button>
        <button className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg border border-gray-200 bg-white text-slate-500 hover:border-orange-300 hover:text-orange-500 cursor-pointer transition-colors">
          快速截圖
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, ntd, bold }: { label: string; value: string; ntd?: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm py-0.5 ${bold ? "text-[15px]" : ""}`}>
      <span className={`${bold ? "font-semibold text-slate-700" : "text-slate-500"}`}>{label}</span>
      <span className={`${bold ? "font-semibold" : "font-semibold"} text-slate-800`}>
        {value}
        {ntd && <span className="text-slate-400 font-normal ml-1.5">({ntd})</span>}
      </span>
    </div>
  );
}
