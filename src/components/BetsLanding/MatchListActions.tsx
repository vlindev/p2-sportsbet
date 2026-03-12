"use client";

import { useState, useEffect } from "react";
import { closeBetting, openBetting, runAutoPlacementAction } from "@/lib/betting-actions";
import CloseBettingModal from "@/components/CloseBettingModal";
import type { Match, Bet } from "@/types";
import type { LandingMember } from "./types";

type Props = {
  match: Match;
  matchBets: Bet[];
  members: LandingMember[];
  isAutoPlaced: boolean;
  onMatchStatusChange: (matchId: string, newStatus: Match["status"]) => void;
  onBetsChange: () => void;
};

export default function MatchListActions({ match, matchBets, members, isAutoPlaced, onMatchStatusChange, onBetsChange }: Props) {
  const [opening, setOpening] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(isAutoPlaced);
  const [r1711Toast, setR1711Toast] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeConfirming, setCloseConfirming] = useState(false);

  // Sync placed state when prop changes (e.g. after bets refetch)
  useEffect(() => { setPlaced(isAutoPlaced); }, [isAutoPlaced]);

  function handleCloseClick(e: React.MouseEvent) {
    e.stopPropagation();
    setShowCloseModal(true);
  }

  async function confirmClose() {
    setCloseConfirming(true);
    const result = await closeBetting(match.id, matchBets);
    setCloseConfirming(false);
    setShowCloseModal(false);
    if (!result.success) return;
    onMatchStatusChange(match.id, "betting_closed");
    if (result.adjusted) {
      setR1711Toast("分潤已自動調整");
      setTimeout(() => setR1711Toast(null), 3000);
    }
  }

  async function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (opening) return;
    setOpening(true);
    const result = await openBetting(match.id);
    setOpening(false);
    if (!result.success) return;
    onMatchStatusChange(match.id, "scheduled");
    setPlaced(false);
  }

  async function handleAutoPlace(e: React.MouseEvent) {
    e.stopPropagation();
    if (placing || placed) return;
    setPlacing(true);
    const result = await runAutoPlacementAction(match.id, members, matchBets);
    setPlacing(false);
    if (!result.success) return;
    setPlaced(true);
    onBetsChange();
  }

  // Compute modal data from matchBets
  const teamABets = matchBets.filter((b) => b.team_bet_on === "A");
  const teamBBets = matchBets.filter((b) => b.team_bet_on === "B");
  const bettorIds = new Set(matchBets.map((b) => b.member_id));

  if (match.status === "scheduled") {
    return (
      <>
        <button onClick={handleCloseClick}
          className="text-base font-medium text-white bg-amber-500 hover:bg-amber-600 cursor-pointer px-3 py-1.5 rounded-md">
          封盤
        </button>
        {showCloseModal && (
          <CloseBettingModal
            matchName={match.name || "此賽事"}
            matchType={match.match_type}
            teamACount={new Set(teamABets.map((b) => b.member_id)).size}
            teamBCount={new Set(teamBBets.map((b) => b.member_id)).size}
            teamATotal={teamABets.reduce((s, b) => s + b.amount_liang, 0)}
            teamBTotal={teamBBets.reduce((s, b) => s + b.amount_liang, 0)}
            unbettedCount={members.filter((m) => m.active).length - bettorIds.size}
            onConfirm={confirmClose}
            onCancel={() => setShowCloseModal(false)}
            confirming={closeConfirming}
          />
        )}
      </>
    );
  }

  // betting_closed
  const isMonday = match.match_type === "monday";

  return (
    <div className="flex flex-col items-start gap-1">
      {isMonday && !placed && (
        <button onClick={handleAutoPlace} disabled={placing}
          className="text-base font-medium text-white bg-blue-500 hover:bg-blue-600 cursor-pointer px-3 py-1.5 rounded-md disabled:opacity-50">
          {placing ? "..." : "派注"}
        </button>
      )}
      {isMonday && placed && (
        <span className="text-base text-emerald-600 font-medium pl-3 py-1.5">已派注 ✓</span>
      )}
      {!isMonday && (
        /* Optional matches after 封盤: only show 取消封盤 */
        null
      )}
      <button onClick={handleOpen} disabled={opening}
        className="text-sm text-slate-400 hover:text-slate-600 cursor-pointer pl-3">
        {opening ? "..." : "取消封盤"}
      </button>
      {r1711Toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium z-50">
          {r1711Toast}
        </div>
      )}
    </div>
  );
}
