/**
 * Bet Pipeline — Routing & Validation Tests
 *
 * Run: npx tsx tests/bet-pipeline.test.ts
 *
 * Tests the pipeline routing logic (R12), capacity checks (R15),
 * bet validation (R8/R11), sporadic pool rules (R5), and
 * cancellation rules (R23.9).
 *
 * Pure TypeScript — no Supabase dependency. Tests the decision
 * logic, not the database writes.
 */

import {
  routeBet,
  validateBetAmount,
  canCancelBet,
  evaluateCapacity,
  type BetInput,
  type MatchContext,
  type SporadicPoolContext,
  type RoutingResult,
  type CapacityResult,
} from "../src/lib/bet-pipeline";

// -- Test harness ----------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label} — expected ${expected}, got ${actual}`);
  }
}

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

// -- Fixtures --------------------------------------------------------------

const baseMatch: MatchContext = {
  id: "match-1",
  matchType: "monday",
  status: "scheduled",
  capacityZhi: null, // Monday = no capacity limit (R9.5)
  betConfig: "standard", // Monday always standard (R8.5)
};

const optionalMatchWithCapacity: MatchContext = {
  id: "match-3",
  matchType: "optional",
  status: "scheduled",
  capacityZhi: 20, // 20 zhi = 60 liang
  betConfig: "standard",
};

const sporadicPool: SporadicPoolContext = {
  id: "pool-1",
  matchId: "match-1",
  openedByTeam: "A",
  capacityZhi: 20, // Always required on sporadic pools (R5.5)
};

// -- R12: PIPELINE ROUTING -------------------------------------------------

section("R12: Pipeline Routing");

// R12.1: mandatory_self goes DIRECTLY to bets, never through bet_requests
{
  const input: BetInput = {
    memberId: "player-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 5,
    betType: "mandatory_self",
    sporadicPoolId: null,
    createdByRole: "system",
    createdVia: "rule_engine",
  };
  const result = routeBet(input, baseMatch, null);
  assertEq(result.destination, "bets", "R12.1 — mandatory_self routes directly to bets");
  assert(!result.requiresCapacityCheck, "R12.1 — mandatory_self skips capacity check");
}

// R12.2: voluntary bet goes through bet_requests
{
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "bookkeeper",
    createdVia: "manual",
  };
  const result = routeBet(input, baseMatch, null);
  assertEq(result.destination, "bet_requests", "R12.2 — voluntary routes through bet_requests");
}

// R12.2: mandatory_monday goes through bet_requests (R10.5)
{
  const input: BetInput = {
    memberId: "member-2",
    matchId: "match-1",
    teamBetOn: "B",
    amountLiang: 1,
    betType: "mandatory_monday",
    sporadicPoolId: null,
    createdByRole: "system",
    createdVia: "scheduled_job",
  };
  const result = routeBet(input, baseMatch, null);
  assertEq(result.destination, "bet_requests", "R10.5 — mandatory_monday routes through bet_requests");
}

// R12.3: no capacity → auto-accept immediately
{
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "bookkeeper",
    createdVia: "manual",
  };
  const result = routeBet(input, baseMatch, null);
  assertEq(result.autoAccept, true, "R12.3 — no capacity (null) → auto-accept");
}

// R12.4: has capacity → requires capacity evaluation
{
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-3",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "bookkeeper",
    createdVia: "manual",
  };
  const result = routeBet(input, optionalMatchWithCapacity, null);
  assertEq(result.autoAccept, false, "R12.4 — has capacity → no auto-accept");
  assert(result.requiresCapacityCheck, "R12.4 — has capacity → requires capacity check");
}

// -- Sporadic pool routing -------------------------------------------------

section("Sporadic Pool Routing");

// Sporadic pool bets always go through bet_requests (never mandatory_self on pools)
{
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "B", // opposing opened_by_team A (R5.4)
    amountLiang: 3,
    betType: "voluntary",
    sporadicPoolId: "pool-1",
    createdByRole: "bookkeeper",
    createdVia: "manual",
  };
  const result = routeBet(input, baseMatch, sporadicPool);
  assertEq(result.destination, "bet_requests", "Sporadic — routes through bet_requests");
  assert(result.requiresCapacityCheck, "Sporadic — always has capacity (R5.5), requires check");
}

// R5.4: cannot bet on the team that opened the pool
{
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A", // same as opened_by_team → INVALID
    amountLiang: 3,
    betType: "voluntary",
    sporadicPoolId: "pool-1",
    createdByRole: "bookkeeper",
    createdVia: "manual",
  };
  const result = routeBet(input, baseMatch, sporadicPool);
  assert(result.rejected, "R5.4 — cannot bet on team that opened the pool");
  assertEq(result.rejectReason, "bet_on_opening_team", "R5.4 — correct rejection reason");
}

// -- R15: CAPACITY EVALUATION ----------------------------------------------

section("R15: Capacity Evaluation");

// Under capacity → auto-accept
{
  const result = evaluateCapacity({
    capacityZhi: 20, // 60 liang
    currentExposureLiang: 30,
    requestedAmountLiang: 6,
  });
  assertEq(result.decision, "accept", "R15 — under capacity → accept");
  assertEq(result.acceptedAmount, 6, "R15 — accept full amount");
}

// Exactly at capacity → accept
{
  const result = evaluateCapacity({
    capacityZhi: 20,
    currentExposureLiang: 54,
    requestedAmountLiang: 6,
  });
  assertEq(result.decision, "accept", "R15 — exactly at capacity → accept");
}

// Over capacity → pending (R15.3: soft ceiling, don't auto-reject)
{
  const result = evaluateCapacity({
    capacityZhi: 20, // 60 liang
    currentExposureLiang: 58,
    requestedAmountLiang: 6,
  });
  assertEq(result.decision, "pending", "R15.3 — over capacity → pending (soft ceiling)");
}

// Zero current exposure → accept
{
  const result = evaluateCapacity({
    capacityZhi: 20,
    currentExposureLiang: 0,
    requestedAmountLiang: 3,
  });
  assertEq(result.decision, "accept", "R15 — zero exposure → accept");
}

// -- R8/R11: BET AMOUNT VALIDATION -----------------------------------------

section("R8/R11: Bet Amount Validation");

// Standard base match: valid amounts are 1 or 2 (R8.4)
assertEq(validateBetAmount(1, "standard", null), true, "R8.4 — standard: 1 liang valid");
assertEq(validateBetAmount(2, "standard", null), true, "R8.4 — standard: 2 liang valid");
assertEq(validateBetAmount(3, "standard", null), false, "R8.4 — standard: 3 liang invalid");
assertEq(validateBetAmount(0, "standard", null), false, "R8.4 — standard: 0 liang invalid");

// Small base match: valid amount is 1 only (R8.5)
assertEq(validateBetAmount(1, "small", null), true, "R8.5 — small: 1 liang valid");
assertEq(validateBetAmount(2, "small", null), false, "R8.5 — small: 2 liang invalid");

// Sporadic pool: amount % 3 = 0, >= 3, <= 150 (R5.6 / R11.2)
assertEq(validateBetAmount(3, "standard", "pool-1"), true, "R11.2 — sporadic: 3 liang (1 zhi) valid");
assertEq(validateBetAmount(6, "standard", "pool-1"), true, "R11.2 — sporadic: 6 liang (2 zhi) valid");
assertEq(validateBetAmount(150, "standard", "pool-1"), true, "R11.2 — sporadic: 150 liang (50 zhi) valid");
assertEq(validateBetAmount(4, "standard", "pool-1"), false, "R11.2 — sporadic: 4 liang invalid (not % 3)");
assertEq(validateBetAmount(2, "standard", "pool-1"), false, "R11.2 — sporadic: 2 liang invalid (< 3)");
assertEq(validateBetAmount(153, "standard", "pool-1"), false, "R11.2 — sporadic: 153 liang invalid (> 150)");
assertEq(validateBetAmount(0, "standard", "pool-1"), false, "R11.2 — sporadic: 0 liang invalid");

// -- R23.9: BET CANCELLATION -----------------------------------------------

section("R23.9: Bet Cancellation");

// Scheduled: member can cancel
assertEq(canCancelBet("scheduled", "member"), true, "R23.9 — scheduled: member can cancel");
assertEq(canCancelBet("scheduled", "bookkeeper"), true, "R23.9 — scheduled: bookkeeper can cancel");

// Betting closed: only bookkeeper
assertEq(canCancelBet("betting_closed", "member"), false, "R23.9 — betting_closed: member cannot cancel");
assertEq(canCancelBet("betting_closed", "bookkeeper"), true, "R23.9 — betting_closed: bookkeeper can cancel");

// Active: nobody
assertEq(canCancelBet("active", "member"), false, "R23.9 — active: member cannot cancel");
assertEq(canCancelBet("active", "bookkeeper"), false, "R23.9 — active: bookkeeper cannot cancel");

// Completed: nobody
assertEq(canCancelBet("completed", "member"), false, "R23.9 — completed: member cannot cancel");
assertEq(canCancelBet("completed", "bookkeeper"), false, "R23.9 — completed: bookkeeper cannot cancel");

// Cancelled: nobody
assertEq(canCancelBet("cancelled", "member"), false, "R23.9 — cancelled: member cannot cancel");

// -- R26: ATTRIBUTION VALIDATION -------------------------------------------

section("R26: Attribution — route with correct defaults");

// System-generated mandatory_self gets system + rule_engine (R26.7)
{
  const input: BetInput = {
    memberId: "player-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 5,
    betType: "mandatory_self",
    sporadicPoolId: null,
    createdByRole: "system",
    createdVia: "rule_engine",
  };
  const result = routeBet(input, baseMatch, null);
  assertEq(result.destination, "bets", "R26.7 — system/rule_engine routes to bets");
}

// Bookkeeper voluntary gets routed through bet_requests
{
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "bookkeeper",
    createdVia: "manual",
  };
  const result = routeBet(input, baseMatch, null);
  assertEq(result.destination, "bet_requests", "R26 — bookkeeper/manual routes to bet_requests");
}

// -- R7.5/R15.4: Mandatory self-bets don't count toward capacity -----------

section("R7.5/R15.4: Self-bets excluded from capacity");

// mandatory_self never requires capacity check regardless of match capacity
{
  const input: BetInput = {
    memberId: "player-1",
    matchId: "match-3",
    teamBetOn: "A",
    amountLiang: 5,
    betType: "mandatory_self",
    sporadicPoolId: null,
    createdByRole: "system",
    createdVia: "rule_engine",
  };
  const result = routeBet(input, optionalMatchWithCapacity, null);
  assertEq(result.destination, "bets", "R7.5 — mandatory_self direct to bets even with capacity");
  assert(!result.requiresCapacityCheck, "R15.4 — mandatory_self skips capacity check");
}

// -- Match status validation -----------------------------------------------

section("Match Status: Betting only when open");

// Bet on active match → rejected
{
  const activeMatch: MatchContext = { ...baseMatch, status: "active" };
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "member",
    createdVia: "manual",
  };
  const result = routeBet(input, activeMatch, null);
  assert(result.rejected, "Bet on active match → rejected");
  assertEq(result.rejectReason, "match_not_open", "Active match → correct rejection reason");
}

// Bet on completed match → rejected
{
  const completedMatch: MatchContext = { ...baseMatch, status: "completed" };
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "member",
    createdVia: "manual",
  };
  const result = routeBet(input, completedMatch, null);
  assert(result.rejected, "Bet on completed match → rejected");
}

// Bet on betting_closed by member → rejected
{
  const closedMatch: MatchContext = { ...baseMatch, status: "betting_closed" };
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "member",
    createdVia: "manual",
  };
  const result = routeBet(input, closedMatch, null);
  assert(result.rejected, "Member bet on betting_closed match → rejected");
}

// Bet on betting_closed by bookkeeper → allowed (R23.3)
{
  const closedMatch: MatchContext = { ...baseMatch, status: "betting_closed" };
  const input: BetInput = {
    memberId: "member-1",
    matchId: "match-1",
    teamBetOn: "A",
    amountLiang: 2,
    betType: "voluntary",
    sporadicPoolId: null,
    createdByRole: "bookkeeper",
    createdVia: "manual",
  };
  const result = routeBet(input, closedMatch, null);
  assert(!result.rejected, "Bookkeeper bet on betting_closed match → allowed (R23.3)");
}

// -- Summary ---------------------------------------------------------------

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.log("SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED");
}
