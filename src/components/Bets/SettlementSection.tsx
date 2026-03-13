"use client";

import { ntdToLiang } from "@/lib/settlement";
import type { MemberMatchDetail } from "@/lib/settlement";
import type { Bet } from "@/types";
import ReportBetColumn from "./ReportBetColumn";
import SettlementRow, { type DetailLine } from "./SettlementRow";

type Props = {
  label: string;
  bets: Bet[];
  settlements: MemberMatchDetail[] | null; // null = no result yet
  memberMap: Record<string, string>;
  winningTeam: "A" | "B" | null;
  playerIds: { a1: string; a2: string; b1: string; b2: string };
  shares: { playerId: string; matchSide: "A" | "B"; shareBps: number }[];
  isPool?: boolean;
  openedByTeam?: "A" | "B";
};

function buildDetail(
  detail: MemberMatchDetail,
  memberBets: Bet[],
  isPlayer: boolean,
  isWinningSide: boolean,
  sharePercent: number,
): DetailLine[] | undefined {
  // External losers: trivial (net = -bet), not expandable
  if (!isPlayer && !isWinningSide) return undefined;

  const lines: DetailLine[] = [];

  // Bet lines
  for (const bet of memberBets) {
    const won = bet.result === "win";
    const prefix = isPlayer && bet.bet_type === "mandatory_self" ? "自投" : "投注";
    lines.push({
      type: "item",
      label: `${prefix} ${bet.team_bet_on}隊 ${bet.amount_liang}兩 (${won ? "贏" : "輸"})`,
      amountLiang: won ? bet.amount_liang : -bet.amount_liang,
    });
  }

  // Player flow
  if (isPlayer) {
    if (isWinningSide) {
      lines.push({ type: "item", label: `莊家收入 (${sharePercent}%)`, amountLiang: ntdToLiang(detail.flow1IncomeNtd) });
    } else {
      lines.push({ type: "item", label: `莊家負債 (${sharePercent}%)`, amountLiang: -ntdToLiang(detail.flow2LiabilityNtd) });
    }
    lines.push({ type: "divider" });
    if (detail.rakeNtd > 0) {
      lines.push({ type: "item", label: "小計", amountLiang: ntdToLiang(detail.netGainNtd) });
      lines.push({ type: "item", label: "抽水 (5%)", amountLiang: -ntdToLiang(detail.rakeNtd) });
      lines.push({ type: "divider" });
    }
  } else {
    if (detail.rakeNtd > 0) {
      lines.push({ type: "item", label: "抽水 (5%)", amountLiang: -ntdToLiang(detail.rakeNtd) });
    }
    lines.push({ type: "divider" });
  }

  lines.push({ type: "total", label: "淨額", amountLiang: ntdToLiang(detail.finalNetNtd) });
  return lines;
}

function getSharePct(shares: Props["shares"], playerId: string, side: "A" | "B"): number {
  const s = shares.find(sh => sh.playerId === playerId && sh.matchSide === side);
  return s ? Math.round(s.shareBps / 100) : 50;
}

export default function SettlementSection({ label, bets, settlements, memberMap, winningTeam, playerIds, shares, isPool, openedByTeam }: Props) {
  const teamABets = bets.filter(b => b.team_bet_on === "A");
  const teamBBets = bets.filter(b => b.team_bet_on === "B");
  const teamATotal = teamABets.reduce((s, b) => s + b.amount_liang, 0);
  const teamBTotal = teamBBets.reduce((s, b) => s + b.amount_liang, 0);
  const hasResult = winningTeam !== null;

  const aPlayerIds = [playerIds.a1, playerIds.a2];
  const bPlayerIds = [playerIds.b1, playerIds.b2];

  function buildSideRows(side: "A" | "B") {
    if (!settlements) return null;
    const sidePlayerIds = side === "A" ? aPlayerIds : bPlayerIds;
    const isWin = winningTeam === side;

    const players: { detail: MemberMatchDetail; bets: Bet[] }[] = [];
    const externals: { detail: MemberMatchDetail; bets: Bet[] }[] = [];

    for (const d of settlements) {
      const mBets = bets.filter(b => b.member_id === d.memberId);
      if (sidePlayerIds.includes(d.memberId)) {
        players.push({ detail: d, bets: mBets });
      } else if (mBets.length > 0 && mBets[0].team_bet_on === side) {
        externals.push({ detail: d, bets: mBets });
      }
    }

    externals.sort((a, b) => Math.abs(b.detail.finalNetNtd) - Math.abs(a.detail.finalNetNtd));

    return [...players, ...externals].map(({ detail, bets: mBets }) => {
      const isPlayer = sidePlayerIds.includes(detail.memberId);
      const pct = isPlayer ? getSharePct(shares, detail.memberId, side) : undefined;
      return (
        <SettlementRow
          key={detail.memberId}
          name={memberMap[detail.memberId] || "—"}
          isPlayer={isPlayer}
          sharePercent={pct}
          finalNetLiang={ntdToLiang(detail.finalNetNtd)}
          finalNetNtd={detail.finalNetNtd}
          expandDetail={buildDetail(detail, mBets, isPlayer, isWin, pct ?? 50)}
        />
      );
    });
  }

  return (
    <>
      {(!hasResult || !settlements) && (
        <>
          <p className="text-base font-bold text-slate-600 mb-3 mt-2">{label} — 投注明細</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ReportBetColumn side="A" sideBets={teamABets} sideTotal={teamATotal} winningTeam={winningTeam}
              hasResult={hasResult} memberMap={memberMap} isPool={isPool} isOpeningTeam={isPool && openedByTeam === "A"} openedByTeam={openedByTeam} />
            <ReportBetColumn side="B" sideBets={teamBBets} sideTotal={teamBTotal} winningTeam={winningTeam}
              hasResult={hasResult} memberMap={memberMap} isPool={isPool} isOpeningTeam={isPool && openedByTeam === "B"} openedByTeam={openedByTeam} />
          </div>
        </>
      )}

      {hasResult && settlements && (
        <>
          <p className="text-base font-bold text-slate-600 mb-3">{label} — 結算明細</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {(["A", "B"] as const).map(side => {
              const isWinner = winningTeam === side;
              const colClass = isPool
                ? isWinner ? "border-purple-200 bg-fuchsia-50/30" : "border-gray-200 bg-gray-50/50"
                : isWinner ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-gray-50/50";
              return (
                <div key={side} className={`rounded-xl border p-4 ${colClass}`}>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <span className={`text-base font-bold ${isWinner ? "text-emerald-700" : "text-slate-400"}`}>{side} 隊</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isWinner ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-slate-400"}`}>
                      {isWinner ? "勝" : "敗"}
                    </span>
                  </div>
                  {buildSideRows(side)}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
