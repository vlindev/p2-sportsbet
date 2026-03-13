import type { Bet } from "@/types";
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

  const sectionData = sections.map((sec) => {
    const teamABets = sec.bets.filter(b => b.team_bet_on === "A");
    const teamBBets = sec.bets.filter(b => b.team_bet_on === "B");
    const teamATotal = teamABets.reduce((s, b) => s + b.amount_liang, 0);
    const teamBTotal = teamBBets.reduce((s, b) => s + b.amount_liang, 0);
    const totalBets = teamATotal + teamBTotal;
    const totalRakeNtd = sec.settlements?.reduce((s, d) => s + d.rakeNtd, 0) ?? 0;
    const totalRakeLiang = ntdToLiang(totalRakeNtd);

    grandTotalBetsLiang += totalBets;
    grandTotalRakeNtd += totalRakeNtd;

    return { ...sec, teamATotal, teamBTotal, teamABets, teamBBets, totalBets, totalRakeNtd, totalRakeLiang };
  });

  const hasMultiple = sections.length > 1;
  const hasCalcError = sections.some(s => !s.settlements);
  const grandTotalRakeLiang = ntdToLiang(grandTotalRakeNtd);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      {!hasMultiple ? (
        <>
          {/* Single section — three metric cards (R8) */}
          <p className="text-sm font-semibold text-slate-500 mb-4">總計</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricCard label="總投注" value={fmtLiang(sectionData[0].totalBets)} detail={fmtNtd(sectionData[0].totalBets * 1000)} />
            <MetricCard label="A 隊" value={fmtLiang(sectionData[0].teamATotal)} detail={`${sectionData[0].teamABets.length} 筆`} />
            <MetricCard label="B 隊" value={fmtLiang(sectionData[0].teamBTotal)} detail={`${sectionData[0].teamBBets.length} 筆`} />
          </div>
          <div className="flex items-center justify-between px-1 py-2 border-t border-gray-100">
            <span className="text-sm text-slate-500">抽水</span>
            {sectionData[0].settlements ? (
              <span className="text-sm font-semibold text-slate-800 tabular-nums">
                {fmtLiang(sectionData[0].totalRakeLiang)}
                <span className="text-slate-400 font-normal ml-1.5">({fmtNtd(sectionData[0].totalRakeNtd)})</span>
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-400">--</span>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Multi-section (pools) — row-based per section */}
          {sectionData.map((sec) => {
            const teamAZhi = sec.isPool ? Math.round(sec.teamATotal / 3) : 0;
            const teamBZhi = sec.isPool ? Math.round(sec.teamBTotal / 3) : 0;
            return (
              <div key={sec.label}>
                <p className={`text-sm font-semibold mt-1.5 mb-0.5 ${sec.isPool ? "text-fuchsia-700" : "text-slate-400"}`}>
                  {sec.label}
                </p>
                <Row label="投注" value={fmtLiang(sec.totalBets)} ntd={fmtNtd(sec.totalBets * 1000)} />
                <Row label="A 隊" value={`${fmtLiang(sec.teamATotal)}${sec.isPool ? ` (${teamAZhi}支)` : ""}`} />
                <Row label={sec.isPool && sec.openedByTeam === "B" ? "B 隊（開盤方）" : "B 隊"}
                  value={`${fmtLiang(sec.teamBTotal)}${sec.isPool ? ` (${teamBZhi}支)` : ""}`} />
                {sec.settlements ? (
                  <Row label="抽水" value={fmtLiang(sec.totalRakeLiang)} ntd={fmtNtd(sec.totalRakeNtd)} />
                ) : (
                  <Row label="抽水" value="--" />
                )}
              </div>
            );
          })}
          <div className="border-t-2 border-slate-200 my-3" />
          <Row label="合計投注" value={fmtLiang(grandTotalBetsLiang)} ntd={fmtNtd(grandTotalBetsLiang * 1000)} bold />
          {hasCalcError ? (
            <Row label="合計抽水" value="--" bold />
          ) : (
            <Row label="合計抽水" value={fmtLiang(grandTotalRakeLiang)} ntd={fmtNtd(grandTotalRakeNtd)} bold />
          )}
        </>
      )}

      <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
        <button className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 bg-white text-slate-300 cursor-not-allowed opacity-50" disabled>
          匯出 Excel (即將推出)
        </button>
        <button className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 bg-white text-slate-300 cursor-not-allowed opacity-50" disabled>
          快速截圖 (即將推出)
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center">
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
      <p className="text-sm text-slate-400 mt-0.5">{detail}</p>
    </div>
  );
}

function Row({ label, value, ntd, bold }: { label: string; value: string; ntd?: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm py-0.5 ${bold ? "text-base" : ""}`}>
      <span className={`${bold ? "font-semibold text-slate-700" : "text-slate-500"}`}>{label}</span>
      <span className="font-semibold text-slate-800">
        {value}
        {ntd && <span className="text-slate-400 font-normal ml-1.5">({ntd})</span>}
      </span>
    </div>
  );
}
