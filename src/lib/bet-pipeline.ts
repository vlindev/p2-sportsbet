/**
 * Bet Pipeline — Routing, Validation, and Capacity Logic
 *
 * Pure TypeScript, no Supabase dependency. Decision logic only.
 * Database writes happen in the RPC / caller layer.
 *
 * Rules implemented:
 * - R12: Pipeline routing (mandatory_self → bets, others → bet_requests)
 * - R15: Capacity evaluation (soft ceiling)
 * - R8/R11: Bet amount validation (standard/small/sporadic)
 * - R5.4: Sporadic pool team restriction
 * - R23.9: Bet cancellation rules
 * - R23.3: Bookkeeper retains power after betting_closed
 */

// -- Types -----------------------------------------------------------------

import type { CreatedByRole, CreatedVia } from "../types";

export type BetType = "mandatory_self" | "mandatory_monday" | "voluntary";
export type MatchStatus = "scheduled" | "betting_closed" | "active" | "completed" | "cancelled";
export type BetConfig = "standard" | "small";
export type MatchSide = "A" | "B";

export type { CreatedByRole, CreatedVia };

export type BetInput = {
  memberId: string;
  matchId: string;
  teamBetOn: MatchSide;
  amountLiang: number;
  betType: BetType;
  sporadicPoolId: string | null;
  createdByRole: CreatedByRole;
  createdVia: CreatedVia;
};

export type MatchContext = {
  id: string;
  matchType: "monday" | "optional";
  status: MatchStatus;
  capacityZhi: number | null;
  betConfig: BetConfig;
};

export type SporadicPoolContext = {
  id: string;
  matchId: string;
  openedByTeam: MatchSide;
  capacityZhi: number;
};

export type RoutingResult = {
  destination: "bets" | "bet_requests";
  autoAccept: boolean;
  requiresCapacityCheck: boolean;
  rejected: boolean;
  rejectReason: string | null;
};

export type CapacityInput = {
  capacityZhi: number;
  currentExposureLiang: number;
  requestedAmountLiang: number;
};

export type CapacityResult = {
  decision: "accept" | "pending";
  acceptedAmount: number;
  availableLiang: number;
};

// -- Routing (R12) ---------------------------------------------------------

export function routeBet(
  input: BetInput,
  match: MatchContext,
  pool: SporadicPoolContext | null
): RoutingResult {
  const rejected = (reason: string): RoutingResult => ({
    destination: "bet_requests",
    autoAccept: false,
    requiresCapacityCheck: false,
    rejected: true,
    rejectReason: reason,
  });

  // R12.1: mandatory_self goes directly to bets — always, regardless of match state or capacity
  if (input.betType === "mandatory_self") {
    return {
      destination: "bets",
      autoAccept: true,
      requiresCapacityCheck: false,
      rejected: false,
      rejectReason: null,
    };
  }

  // Match status validation: betting must be open
  // R23.2: scheduled = open
  // R23.3: betting_closed = closed for members, bookkeeper retains full power
  // R23.4+: active/completed/cancelled = locked for everyone
  if (match.status === "active" || match.status === "completed" || match.status === "cancelled") {
    return rejected("match_not_open");
  }
  if (match.status === "betting_closed" && input.createdByRole !== "bookkeeper") {
    return rejected("match_not_open");
  }

  // R5.4: cannot bet on the team that opened the sporadic pool
  if (pool && input.teamBetOn === pool.openedByTeam) {
    return rejected("bet_on_opening_team");
  }

  // Determine capacity source
  // Sporadic pools always have capacity (R5.5)
  // Base match uses match-level capacity_zhi (may be null)
  const effectiveCapacityZhi = pool ? pool.capacityZhi : match.capacityZhi;

  // R12.3: no capacity → auto-accept
  if (effectiveCapacityZhi === null) {
    return {
      destination: "bet_requests",
      autoAccept: true,
      requiresCapacityCheck: false,
      rejected: false,
      rejectReason: null,
    };
  }

  // R12.4: has capacity → requires evaluation
  return {
    destination: "bet_requests",
    autoAccept: false,
    requiresCapacityCheck: true,
    rejected: false,
    rejectReason: null,
  };
}

// -- Capacity Evaluation (R15) ---------------------------------------------

export function evaluateCapacity(input: CapacityInput): CapacityResult {
  const capacityLiang = input.capacityZhi * 3; // R1.21: 1 zhi = 3 liang
  const availableLiang = capacityLiang - input.currentExposureLiang;

  // R15: if request fits within remaining capacity, accept in full
  if (input.requestedAmountLiang <= availableLiang) {
    return {
      decision: "accept",
      acceptedAmount: input.requestedAmountLiang,
      availableLiang,
    };
  }

  // R15.3: soft ceiling — over capacity goes to pending, NOT auto-rejected
  return {
    decision: "pending",
    acceptedAmount: 0,
    availableLiang,
  };
}

// -- Bet Amount Validation (R8/R11) ----------------------------------------

export function validateBetAmount(
  amountLiang: number,
  betConfig: BetConfig,
  sporadicPoolId: string | null
): boolean {
  if (amountLiang <= 0) return false;

  // R11.2 / R5.6: sporadic pool amounts
  if (sporadicPoolId !== null) {
    return amountLiang % 3 === 0 && amountLiang >= 3 && amountLiang <= 150;
  }

  // R8.4/R8.5: base match voluntary amounts
  if (betConfig === "standard") {
    return amountLiang === 1 || amountLiang === 2;
  }
  // small: 1 liang only
  return amountLiang === 1;
}

// -- Bet Cancellation (R23.9) ----------------------------------------------

export function canCancelBet(
  matchStatus: MatchStatus,
  cancellerRole: "member" | "bookkeeper"
): boolean {
  // R23.2: scheduled → anyone can cancel
  if (matchStatus === "scheduled") return true;

  // R23.3: betting_closed → bookkeeper only (hidden capability)
  if (matchStatus === "betting_closed") return cancellerRole === "bookkeeper";

  // R23.4+: active/completed/cancelled → nobody
  return false;
}
