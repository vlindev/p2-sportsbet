import type { Match, Bet } from "@/types";

export type LandingMember = { id: string; name: string; active: boolean };

/** Per-match derived data for Tab 1 (match list) */
export type MatchRowData = {
  match: Match;
  bettorCountA: number;
  bettorCountB: number;
  amountA: number;
  amountB: number;
  totalMembers: number; // active member count (monday) or capacity_zhi (optional)
  isMonday: boolean;
  isAutoPlaced: boolean;
  poolCount: number;
  playerNames: { a1: string; a2: string; b1: string; b2: string };
};

export type MatchListTabProps = {
  matches: Match[];
  bets: Bet[];
  memberMap: Record<string, string>;
  activeMemberCount: number;
  poolCounts: Record<string, number>;
  onMatchStatusChange: (matchId: string, newStatus: Match["status"]) => void;
  onBetsChange: () => void;
  members: LandingMember[];
};

export type MemberLookupTabProps = {
  matches: Match[];
  bets: Bet[];
  members: LandingMember[];
  memberMap: Record<string, string>;
  onBetsChange: () => void;
};
