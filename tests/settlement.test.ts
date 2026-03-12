/**
 * Settlement Engine — Verification Tests
 *
 * Run: npx tsx tests/settlement.test.ts
 *
 * Primary test: Session 20 verified example (organizer-confirmed).
 * Edge cases: odd splits, small bets, remainder distribution, provider fee.
 */

import {
  floorDiv,
  roundHalfUp,
  allocateByShares,
  calculateRake,
  calculateProviderFee,
  calculateMatchPayout,
  calculateMonthlySettlement,
  generateDefaultShares,
  ntdToLiang,
  type ActiveBet,
  type CompletedMatch,
  type PlayerShare,
  type BillingConfig,
  type MemberMatchDetail,
} from "../src/lib/settlement";

// ── Test harness ────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(
      `  ✗ FAIL: ${message}\n    Expected: ${expected}\n    Actual:   ${actual}`
    );
  }
}

function section(name: string) {
  console.log(`\n─── ${name} ───`);
}

// ── Shared test data ────────────────────────────────────────

const FREE_PERIOD_CONFIG: BillingConfig = {
  providerRateBps: 100, // 1%
  freePeriodEndDate: "2026-12-31",
  billingEnabled: true,
};

const ACTIVE_BILLING_CONFIG: BillingConfig = {
  providerRateBps: 100, // 1%
  freePeriodEndDate: "2026-01-01",
  billingEnabled: true,
};

// ════════════════════════════════════════════════════════════
// 1. Core Arithmetic (R18)
// ════════════════════════════════════════════════════════════

section("R18: floorDiv");

assertEqual(floorDiv(7, 2), 3, "floorDiv(7, 2) = 3");
assertEqual(floorDiv(-7, 2), -4, "floorDiv(-7, 2) = -4 (floor toward -∞)");
assertEqual(floorDiv(10, 5), 2, "floorDiv(10, 5) = 2");
assertEqual(floorDiv(0, 3), 0, "floorDiv(0, 3) = 0");
assertEqual(floorDiv(1, 3), 0, "floorDiv(1, 3) = 0");
assertEqual(floorDiv(10000, 10000), 1, "floorDiv(10000, 10000) = 1");

section("R18: roundHalfUp (四捨五入)");

assertEqual(roundHalfUp(5, 10), 1, "roundHalfUp(5, 10) = 1 (0.5 rounds up)");
assertEqual(roundHalfUp(4, 10), 0, "roundHalfUp(4, 10) = 0");
assertEqual(roundHalfUp(15, 10), 2, "roundHalfUp(15, 10) = 2");
assertEqual(roundHalfUp(25, 10), 3, "roundHalfUp(25, 10) = 3");
assertEqual(roundHalfUp(0, 10), 0, "roundHalfUp(0, 10) = 0");

// Rake-specific: roundHalfUp(netGainNtd * 5, 10000) should match expected
assertEqual(roundHalfUp(1000 * 5, 10_000), 1, "Rake round: 1兩 → 1 hundred");
assertEqual(roundHalfUp(5000 * 5, 10_000), 3, "Rake round: 5兩 → 3 hundreds");
assertEqual(roundHalfUp(20000 * 5, 10_000), 10, "Rake round: 20兩 → 10 hundreds");
assertEqual(roundHalfUp(3000 * 5, 10_000), 2, "Rake round: 3兩 → 2 hundreds");

section("R18.4: allocateByShares");

// 50/50 split of 30,000 NTD
{
  const alloc = allocateByShares(30_000, [
    { playerId: "p1", shareBps: 5_000 },
    { playerId: "p2", shareBps: 5_000 },
  ]);
  assertEqual(alloc.get("p1"), 15_000, "50/50 of 30,000: p1 = 15,000");
  assertEqual(alloc.get("p2"), 15_000, "50/50 of 30,000: p2 = 15,000");
}

// 50/50 split of 7,000 NTD (odd amount)
{
  const alloc = allocateByShares(7_000, [
    { playerId: "p1", shareBps: 5_000 },
    { playerId: "p2", shareBps: 5_000 },
  ]);
  // floor(7000 * 5000 / 10000) = floor(3500) = 3500 each
  // remainder = 7000 - 7000 = 0
  assertEqual(alloc.get("p1"), 3_500, "50/50 of 7,000: p1 = 3,500");
  assertEqual(alloc.get("p2"), 3_500, "50/50 of 7,000: p2 = 3,500");
}

// 50/50 split of 1 NTD (extreme minimum)
{
  const alloc = allocateByShares(1, [
    { playerId: "p1", shareBps: 5_000 },
    { playerId: "p2", shareBps: 5_000 },
  ]);
  // floor(1 * 5000 / 10000) = floor(0.5) = 0 each
  // remainder = 1 - 0 = 1 → p1 gets +1
  assertEqual(alloc.get("p1"), 1, "50/50 of 1 NTD: p1 = 1 (remainder)");
  assertEqual(alloc.get("p2"), 0, "50/50 of 1 NTD: p2 = 0");
}

// 60/40 split of 10,000 NTD
{
  const alloc = allocateByShares(10_000, [
    { playerId: "p1", shareBps: 6_000 },
    { playerId: "p2", shareBps: 4_000 },
  ]);
  assertEqual(alloc.get("p1"), 6_000, "60/40 of 10,000: p1 = 6,000");
  assertEqual(alloc.get("p2"), 4_000, "60/40 of 10,000: p2 = 4,000");
}

// 70/30 split of 10,001 NTD (remainder test)
{
  const alloc = allocateByShares(10_001, [
    { playerId: "p1", shareBps: 7_000 },
    { playerId: "p2", shareBps: 3_000 },
  ]);
  // p1: floor(10001 * 7000 / 10000) = floor(7000.7) = 7000
  // p2: floor(10001 * 3000 / 10000) = floor(3000.3) = 3000
  // remainder = 10001 - 10000 = 1 → p1 gets +1 (ascending id order)
  assertEqual(alloc.get("p1"), 7_001, "70/30 of 10,001: p1 = 7,001");
  assertEqual(alloc.get("p2"), 3_000, "70/30 of 10,001: p2 = 3,000");
}

// Sum invariant: allocations must equal total exactly
{
  const total = 99_999;
  const alloc = allocateByShares(total, [
    { playerId: "a", shareBps: 3_333 },
    { playerId: "b", shareBps: 3_333 },
    { playerId: "c", shareBps: 3_334 },
  ]);
  const sum = (alloc.get("a") ?? 0) + (alloc.get("b") ?? 0) + (alloc.get("c") ?? 0);
  assertEqual(sum, total, "Allocation sum invariant: 99,999 split 3 ways");
}

// ════════════════════════════════════════════════════════════
// 2. Rake (R19)
// ════════════════════════════════════════════════════════════

section("R19: calculateRake");

// Session 20 verified examples
assertEqual(calculateRake(20_000), 1_000, "Rake on 20兩 = $1,000");
assertEqual(calculateRake(1_000), 100, "Rake on 1兩 = $100 (0.5 rounds up)");
assertEqual(calculateRake(2_000), 100, "Rake on 2兩 = $100");
assertEqual(calculateRake(5_000), 300, "Rake on 5兩 = $300");

// Edge cases
assertEqual(calculateRake(0), 0, "Rake on 0 = $0");
assertEqual(calculateRake(-5_000), 0, "Rake on negative = $0 (losers not raked)");
assertEqual(calculateRake(3_000), 200, "Rake on 3兩: 150 NTD → rounds to $200");
assertEqual(calculateRake(4_000), 200, "Rake on 4兩: 200 NTD → $200");

// Very small: 0.1兩 would be 100 NTD net gain (not realistic but tests formula)
// This can't happen with whole-liang bets for externals, but player flows can produce it
assertEqual(calculateRake(100), 0, "Rake on $100: 5 NTD raw → rounds to $0");
assertEqual(calculateRake(500), 0, "Rake on $500: 25 NTD raw → rounds to $0");
assertEqual(calculateRake(900), 0, "Rake on $900: 45 NTD raw → rounds to $0");
assertEqual(calculateRake(1_000), 100, "Rake on $1,000: 50 NTD raw → rounds to $100");

// ════════════════════════════════════════════════════════════
// 3. Provider Fee (R20)
// ════════════════════════════════════════════════════════════

section("R20: calculateProviderFee");

// During free period
{
  const pf = calculateProviderFee(1_000, FREE_PERIOD_CONFIG, "2026-06-15");
  assertEqual(pf.providerFeeNtd, 0, "Free period: fee = 0");
  assertEqual(pf.reason, "free_period", "Free period: reason = free_period");
}

// After free period
{
  const pf = calculateProviderFee(1_000, ACTIVE_BILLING_CONFIG, "2026-06-15");
  // floor_div(1000 * 100, 10000) = floor_div(100000, 10000) = 10 NTD
  assertEqual(pf.providerFeeNtd, 10, "Active billing: 1% of $1,000 = $10");
  assertEqual(pf.reason, "standard", "Active billing: reason = standard");
}

// Provider fee on $300 rake
{
  const pf = calculateProviderFee(300, ACTIVE_BILLING_CONFIG, "2026-06-15");
  // floor_div(300 * 100, 10000) = floor_div(30000, 10000) = 3 NTD
  assertEqual(pf.providerFeeNtd, 3, "Active billing: 1% of $300 = $3");
}

// Zero rake
{
  const pf = calculateProviderFee(0, ACTIVE_BILLING_CONFIG, "2026-06-15");
  assertEqual(pf.providerFeeNtd, 0, "Zero rake: fee = 0");
}

// ════════════════════════════════════════════════════════════
// 4. generateDefaultShares (R17.4)
// ════════════════════════════════════════════════════════════

section("R17.4: generateDefaultShares");

{
  const shares = generateDefaultShares("m1", "A", ["p1", "p2"]);
  assertEqual(shares.length, 2, "2 players → 2 share records");
  assertEqual(shares[0].shareBps, 5_000, "Player 1: 5000 BPS");
  assertEqual(shares[1].shareBps, 5_000, "Player 2: 5000 BPS");
  const sum = shares.reduce((s, sh) => s + sh.shareBps, 0);
  assertEqual(sum, 10_000, "Sum = 10000 exactly");
}

// 3 players (hypothetical future)
{
  const shares = generateDefaultShares("m1", "A", ["p1", "p2", "p3"]);
  // base = floor(10000/3) = 3333, remainder = 1
  // p1 gets +1 → 3334, p2 = 3333, p3 = 3333
  const sum = shares.reduce((s, sh) => s + sh.shareBps, 0);
  assertEqual(sum, 10_000, "3-player sum = 10000 exactly");
  assertEqual(shares[0].shareBps, 3_334, "3 players: first gets remainder (+1)");
  assertEqual(shares[1].shareBps, 3_333, "3 players: second = base");
  assertEqual(shares[2].shareBps, 3_333, "3 players: third = base");
}

// ════════════════════════════════════════════════════════════
// 5. SESSION 20 VERIFIED EXAMPLE (primary test)
// ════════════════════════════════════════════════════════════

section("Session 20: Full match payout (organizer-verified)");

// Match: A vs B. A wins. 50/50 player shares. Free period (no provider fee).
const s20Match: CompletedMatch = {
  matchId: "s20",
  result: "team_a",
  teamAPlayer1Id: "張大明",
  teamAPlayer2Id: "李志強",
  teamBPlayer1Id: "王建宏",
  teamBPlayer2Id: "林俊傑",
};

const s20Bets: ActiveBet[] = [
  // Team A players (self-bets)
  { memberId: "張大明", matchId: "s20", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
  { memberId: "李志強", matchId: "s20", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
  // External bettors on A
  { memberId: "小陳", matchId: "s20", teamBetOn: "A", amountLiang: 1, betType: "voluntary", result: "win" },
  { memberId: "小林", matchId: "s20", teamBetOn: "A", amountLiang: 2, betType: "voluntary", result: "win" },
  { memberId: "小王", matchId: "s20", teamBetOn: "A", amountLiang: 5, betType: "voluntary", result: "win" },
  // External bettors on B
  { memberId: "小黃", matchId: "s20", teamBetOn: "B", amountLiang: 4, betType: "voluntary", result: "loss" },
  { memberId: "小趙", matchId: "s20", teamBetOn: "B", amountLiang: 3, betType: "voluntary", result: "loss" },
  { memberId: "小周", matchId: "s20", teamBetOn: "B", amountLiang: 6, betType: "voluntary", result: "loss" },
  { memberId: "小吳", matchId: "s20", teamBetOn: "B", amountLiang: 2, betType: "voluntary", result: "loss" },
  { memberId: "小蔡", matchId: "s20", teamBetOn: "B", amountLiang: 5, betType: "voluntary", result: "loss" },
  // Team B players (self-bets)
  { memberId: "王建宏", matchId: "s20", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
  { memberId: "林俊傑", matchId: "s20", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
];

const s20Shares: PlayerShare[] = [
  { playerId: "張大明", matchSide: "A", shareBps: 5_000 },
  { playerId: "李志強", matchSide: "A", shareBps: 5_000 },
  { playerId: "王建宏", matchSide: "B", shareBps: 5_000 },
  { playerId: "林俊傑", matchSide: "B", shareBps: 5_000 },
];

const s20Details = calculateMatchPayout(
  s20Match,
  s20Bets,
  s20Shares,
  FREE_PERIOD_CONFIG,
  "2026-03-10"
);

function findMember(details: MemberMatchDetail[], id: string) {
  return details.find((d) => d.memberId === id)!;
}

// ── Winning players ─────────────────────────────────────────

const zhangDaMing = findMember(s20Details, "張大明");
assertEqual(zhangDaMing.betGainNtd, 5_000, "張大明 Pass1: +5兩 bet win = $5,000");
assertEqual(zhangDaMing.flow1IncomeNtd, 15_000, "張大明 Pass2: flow1 = $15,000");
assertEqual(zhangDaMing.netGainNtd, 20_000, "張大明 net = $20,000 (20兩)");
assertEqual(zhangDaMing.rakeNtd, 1_000, "張大明 rake = $1,000 (1兩)");
assertEqual(zhangDaMing.providerFeeNtd, 0, "張大明 provider fee = $0 (free period)");
assertEqual(zhangDaMing.finalNetNtd, 19_000, "張大明 final = $19,000 (19兩)");

const liZhiQiang = findMember(s20Details, "李志強");
assertEqual(liZhiQiang.netGainNtd, 20_000, "李志強 net = 20兩");
assertEqual(liZhiQiang.rakeNtd, 1_000, "李志強 rake = $1,000");
assertEqual(liZhiQiang.finalNetNtd, 19_000, "李志強 final = 19兩");

// ── External winners ────────────────────────────────────────

const xiaoChen = findMember(s20Details, "小陳");
assertEqual(xiaoChen.betGainNtd, 1_000, "小陳 bet win = $1,000");
assertEqual(xiaoChen.flow1IncomeNtd, 0, "小陳 flow1 = 0 (not a player)");
assertEqual(xiaoChen.netGainNtd, 1_000, "小陳 net = $1,000 (1兩)");
assertEqual(xiaoChen.rakeNtd, 100, "小陳 rake = $100 (0.1兩) — 50 NTD rounds up");
assertEqual(xiaoChen.finalNetNtd, 900, "小陳 final = $900 (0.9兩)");

const xiaoLin = findMember(s20Details, "小林");
assertEqual(xiaoLin.netGainNtd, 2_000, "小林 net = 2兩");
assertEqual(xiaoLin.rakeNtd, 100, "小林 rake = $100");
assertEqual(xiaoLin.finalNetNtd, 1_900, "小林 final = 1.9兩");

const xiaoWang = findMember(s20Details, "小王");
assertEqual(xiaoWang.netGainNtd, 5_000, "小王 net = 5兩");
assertEqual(xiaoWang.rakeNtd, 300, "小王 rake = $300 (250 rounds to 300)");
assertEqual(xiaoWang.finalNetNtd, 4_700, "小王 final = 4.7兩");

// ── External losers ─────────────────────────────────────────

const xiaoHuang = findMember(s20Details, "小黃");
assertEqual(xiaoHuang.betLossNtd, 4_000, "小黃 loss = $4,000");
assertEqual(xiaoHuang.netGainNtd, -4_000, "小黃 net = -4兩");
assertEqual(xiaoHuang.rakeNtd, 0, "小黃 rake = $0 (losers not raked)");
assertEqual(xiaoHuang.finalNetNtd, -4_000, "小黃 final = -4兩");

// ── Losing players ──────────────────────────────────────────

const wangJianHong = findMember(s20Details, "王建宏");
assertEqual(wangJianHong.betLossNtd, 5_000, "王建宏 Pass1: -5兩 self-bet loss");
assertEqual(wangJianHong.flow2LiabilityNtd, 9_000, "王建宏 Pass2: flow2 = $9,000");
assertEqual(wangJianHong.netGainNtd, -14_000, "王建宏 net = -14兩");
assertEqual(wangJianHong.rakeNtd, 0, "王建宏 rake = $0");
assertEqual(wangJianHong.finalNetNtd, -14_000, "王建宏 final = -14兩");

const linJunJie = findMember(s20Details, "林俊傑");
assertEqual(linJunJie.netGainNtd, -14_000, "林俊傑 net = -14兩");
assertEqual(linJunJie.finalNetNtd, -14_000, "林俊傑 final = -14兩");

// ── Balance check: sum of all final nets = -(total rake) ────
{
  const totalFinalNet = s20Details.reduce((s, d) => s + d.finalNetNtd, 0);
  const totalRake = s20Details.reduce((s, d) => s + d.rakeNtd, 0);
  assertEqual(totalRake, 2_500, "Total rake = $2,500 (2.5兩) per Session 20");
  assertEqual(totalFinalNet, -totalRake, "Sum of finals = -(total rake) [zero-sum + rake]");
}

// ════════════════════════════════════════════════════════════
// 6. Edge Case: Uneven player shares (60/40)
// ════════════════════════════════════════════════════════════

section("Edge case: 60/40 player shares");

{
  const match: CompletedMatch = {
    matchId: "e1",
    result: "team_a",
    teamAPlayer1Id: "pA1",
    teamAPlayer2Id: "pA2",
    teamBPlayer1Id: "pB1",
    teamBPlayer2Id: "pB2",
  };

  const bets: ActiveBet[] = [
    { memberId: "pA1", matchId: "e1", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pA2", matchId: "e1", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pB1", matchId: "e1", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "pB2", matchId: "e1", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "ext1", matchId: "e1", teamBetOn: "A", amountLiang: 2, betType: "voluntary", result: "win" },
    { memberId: "ext2", matchId: "e1", teamBetOn: "B", amountLiang: 2, betType: "voluntary", result: "loss" },
  ];

  // 60/40 for winning side A, 50/50 for losing side B
  const shares: PlayerShare[] = [
    { playerId: "pA1", matchSide: "A", shareBps: 6_000 },
    { playerId: "pA2", matchSide: "A", shareBps: 4_000 },
    { playerId: "pB1", matchSide: "B", shareBps: 5_000 },
    { playerId: "pB2", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, FREE_PERIOD_CONFIG, "2026-03-10");

  // Total losing: 5+5+2 = 12兩 = $12,000
  // Flow 1: pA1 gets 60% of 12,000 = 7,200. pA2 gets 40% = 4,800.
  const pA1 = findMember(details, "pA1");
  assertEqual(pA1.flow1IncomeNtd, 7_200, "60/40: pA1 flow1 = $7,200 (60% of $12,000)");
  assertEqual(pA1.betGainNtd, 5_000, "60/40: pA1 bet gain = $5,000");
  assertEqual(pA1.netGainNtd, 12_200, "60/40: pA1 net = $12,200");

  const pA2 = findMember(details, "pA2");
  assertEqual(pA2.flow1IncomeNtd, 4_800, "60/40: pA2 flow1 = $4,800 (40%)");
  assertEqual(pA2.netGainNtd, 9_800, "60/40: pA2 net = $9,800");

  // Total winning: 5+5+2 = 12兩 = $12,000
  // Flow 2: pB1 pays 50% of 12,000 = 6,000. pB2 pays 6,000.
  const pB1 = findMember(details, "pB1");
  assertEqual(pB1.flow2LiabilityNtd, 6_000, "60/40: pB1 flow2 = $6,000");
  assertEqual(pB1.netGainNtd, -11_000, "60/40: pB1 net = -$11,000");

  // Balance: sum of all finalNet should equal -(total rake)
  const totalFinal = details.reduce((s, d) => s + d.finalNetNtd, 0);
  const totalRake = details.reduce((s, d) => s + d.rakeNtd, 0);
  assertEqual(totalFinal, -totalRake, "60/40 balance: sum finals = -rake");
}

// ════════════════════════════════════════════════════════════
// 7. Edge Case: Odd total with remainder distribution
// ════════════════════════════════════════════════════════════

section("Edge case: Odd losing total — remainder goes to lower ID player");

{
  const match: CompletedMatch = {
    matchId: "e2",
    result: "team_a",
    teamAPlayer1Id: "alpha",
    teamAPlayer2Id: "beta",
    teamBPlayer1Id: "gamma",
    teamBPlayer2Id: "delta",
  };

  // Total losing = 7兩 = $7,000. 50/50 split → 3,500 each (exact, no remainder)
  // Total winning = 3兩 = $3,000. 50/50 → 1,500 each (exact)
  const bets: ActiveBet[] = [
    { memberId: "alpha", matchId: "e2", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "beta", matchId: "e2", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "gamma", matchId: "e2", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "delta", matchId: "e2", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "ext1", matchId: "e2", teamBetOn: "A", amountLiang: 1, betType: "voluntary", result: "win" },
    { memberId: "ext2", matchId: "e2", teamBetOn: "B", amountLiang: 1, betType: "voluntary", result: "loss" },
    { memberId: "ext3", matchId: "e2", teamBetOn: "B", amountLiang: 1, betType: "voluntary", result: "loss" },
  ];

  const shares: PlayerShare[] = [
    { playerId: "alpha", matchSide: "A", shareBps: 5_000 },
    { playerId: "beta", matchSide: "A", shareBps: 5_000 },
    { playerId: "gamma", matchSide: "B", shareBps: 5_000 },
    { playerId: "delta", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, FREE_PERIOD_CONFIG, "2026-03-10");

  // Total losing: 5+5+1+1 = 12兩 = $12,000
  // Flow 1: 50/50 of $12,000 = $6,000 each
  const alpha = findMember(details, "alpha");
  assertEqual(alpha.flow1IncomeNtd, 6_000, "Odd total: alpha flow1 = $6,000");
  // alpha net: 5000 (bet) + 6000 (flow1) = 11000
  assertEqual(alpha.netGainNtd, 11_000, "Odd total: alpha net = $11,000");

  // Total winning: 5+5+1 = 11兩 = $11,000
  // Flow 2: 50/50 of $11,000 → floor(11000*5000/10000) = floor(5500) = 5500 each
  // remainder = 11000 - 11000 = 0
  const gamma = findMember(details, "gamma");
  assertEqual(gamma.flow2LiabilityNtd, 5_500, "Odd total: gamma flow2 = $5,500");
  assertEqual(gamma.netGainNtd, -10_500, "Odd total: gamma net = -$10,500");
}

// ════════════════════════════════════════════════════════════
// 8. Edge Case: Single external bettor (minimum match)
// ════════════════════════════════════════════════════════════

section("Edge case: 4 players only, no external bettors");

{
  const match: CompletedMatch = {
    matchId: "e3",
    result: "team_b",
    teamAPlayer1Id: "pA1",
    teamAPlayer2Id: "pA2",
    teamBPlayer1Id: "pB1",
    teamBPlayer2Id: "pB2",
  };

  // Only mandatory self-bets (4 × 5兩)
  const bets: ActiveBet[] = [
    { memberId: "pA1", matchId: "e3", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "pA2", matchId: "e3", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "pB1", matchId: "e3", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pB2", matchId: "e3", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "win" },
  ];

  const shares: PlayerShare[] = [
    { playerId: "pA1", matchSide: "A", shareBps: 5_000 },
    { playerId: "pA2", matchSide: "A", shareBps: 5_000 },
    { playerId: "pB1", matchSide: "B", shareBps: 5_000 },
    { playerId: "pB2", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, FREE_PERIOD_CONFIG, "2026-03-10");

  // B wins. Total losing = 10兩 = $10,000. Flow1: each B player gets $5,000.
  // Total winning = 10兩 = $10,000. Flow2: each A player pays $5,000.
  const pB1 = findMember(details, "pB1");
  assertEqual(pB1.betGainNtd, 5_000, "Players only: pB1 bet gain = $5,000");
  assertEqual(pB1.flow1IncomeNtd, 5_000, "Players only: pB1 flow1 = $5,000");
  assertEqual(pB1.netGainNtd, 10_000, "Players only: pB1 net = $10,000");
  assertEqual(pB1.rakeNtd, 500, "Players only: pB1 rake = $500 (10兩 → 500 rounds to 500)");
  assertEqual(pB1.finalNetNtd, 9_500, "Players only: pB1 final = $9,500");

  const pA1 = findMember(details, "pA1");
  assertEqual(pA1.betLossNtd, 5_000, "Players only: pA1 bet loss = $5,000");
  assertEqual(pA1.flow2LiabilityNtd, 5_000, "Players only: pA1 flow2 = $5,000");
  assertEqual(pA1.netGainNtd, -10_000, "Players only: pA1 net = -$10,000");
  assertEqual(pA1.finalNetNtd, -10_000, "Players only: pA1 final = -$10,000");
}

// ════════════════════════════════════════════════════════════
// 9. Edge Case: Provider fee active (after free period)
// ════════════════════════════════════════════════════════════

section("Edge case: Provider fee active");

{
  const match: CompletedMatch = {
    matchId: "e4",
    result: "team_a",
    teamAPlayer1Id: "pA1",
    teamAPlayer2Id: "pA2",
    teamBPlayer1Id: "pB1",
    teamBPlayer2Id: "pB2",
  };

  const bets: ActiveBet[] = [
    { memberId: "pA1", matchId: "e4", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pA2", matchId: "e4", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pB1", matchId: "e4", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "pB2", matchId: "e4", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "ext1", matchId: "e4", teamBetOn: "B", amountLiang: 2, betType: "voluntary", result: "loss" },
  ];

  const shares: PlayerShare[] = [
    { playerId: "pA1", matchSide: "A", shareBps: 5_000 },
    { playerId: "pA2", matchSide: "A", shareBps: 5_000 },
    { playerId: "pB1", matchSide: "B", shareBps: 5_000 },
    { playerId: "pB2", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, ACTIVE_BILLING_CONFIG, "2026-06-15");

  // pA1: bet gain $5,000 + flow1 $6,000 (50% of $12,000 losing) = net $11,000
  // Rake: 11,000 * 5 / 10000 = 5.5 → round to 6 → $600
  // Provider fee: floor_div(600 * 100, 10000) = 6 NTD
  const pA1 = findMember(details, "pA1");
  assertEqual(pA1.netGainNtd, 11_000, "Provider fee test: pA1 net = $11,000");
  assertEqual(pA1.rakeNtd, 600, "Provider fee test: pA1 rake = $600");
  assertEqual(pA1.providerFeeNtd, 6, "Provider fee test: pA1 provider fee = $6");
  assertEqual(pA1.providerFeeReason, "standard", "Provider fee test: reason = standard");
  assertEqual(pA1.finalNetNtd, 11_000 - 600 - 6, "Provider fee test: pA1 final = $10,394");
}

// ════════════════════════════════════════════════════════════
// 10. Monthly Settlement (R21.3)
// ════════════════════════════════════════════════════════════

section("R21.3: Monthly settlement (2 matches)");

{
  const match1: CompletedMatch = {
    matchId: "m1",
    result: "team_a",
    teamAPlayer1Id: "p1",
    teamAPlayer2Id: "p2",
    teamBPlayer1Id: "p3",
    teamBPlayer2Id: "p4",
  };

  const match2: CompletedMatch = {
    matchId: "m2",
    result: "team_b",
    teamAPlayer1Id: "p1",
    teamAPlayer2Id: "p3",
    teamBPlayer1Id: "p2",
    teamBPlayer2Id: "p4",
  };

  const allBets: ActiveBet[] = [
    // Match 1: A wins
    { memberId: "p1", matchId: "m1", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "p2", matchId: "m1", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "p3", matchId: "m1", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "p4", matchId: "m1", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    // Match 2: B wins (p1 on A loses, p2 on B wins)
    { memberId: "p1", matchId: "m2", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "p3", matchId: "m2", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "p2", matchId: "m2", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "p4", matchId: "m2", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "win" },
  ];

  const allShares: PlayerShare[] = [
    // Match 1
    { playerId: "p1", matchSide: "A", shareBps: 5_000 },
    { playerId: "p2", matchSide: "A", shareBps: 5_000 },
    { playerId: "p3", matchSide: "B", shareBps: 5_000 },
    { playerId: "p4", matchSide: "B", shareBps: 5_000 },
    // Match 2
    { playerId: "p1", matchSide: "A", shareBps: 5_000 },
    { playerId: "p3", matchSide: "A", shareBps: 5_000 },
    { playerId: "p2", matchSide: "B", shareBps: 5_000 },
    { playerId: "p4", matchSide: "B", shareBps: 5_000 },
  ];

  const monthly = calculateMonthlySettlement(
    [match1, match2],
    allBets,
    allShares,
    FREE_PERIOD_CONFIG,
    "2026-03-31"
  );

  // p1: match1 winner (+10兩 net before rake), match2 loser (-10兩 net)
  // Match 1: bet +5000, flow1 +5000 = net +10000. Rake: 500.
  // Match 2: bet -5000, flow2 -5000 = net -10000. No rake.
  // Monthly: grossGain = $10,000, grossLoss = $10,000, rake = $500, net = -$500
  const p1 = monthly.find((m) => m.memberId === "p1")!;
  assertEqual(p1.matchDetails.length, 2, "Monthly: p1 has 2 match details");
  assertEqual(p1.grossGainNtd, 10_000, "Monthly: p1 grossGain = $10,000");
  assertEqual(p1.grossLossNtd, 10_000, "Monthly: p1 grossLoss = $10,000");
  assertEqual(p1.rakeNtd, 500, "Monthly: p1 rake = $500");
  assertEqual(p1.netNtd, -500, "Monthly: p1 net = -$500");
  // Display conversion at boundary only
  assertEqual(ntdToLiang(p1.netNtd), -0.5, "Monthly: p1 net in liang = -0.5兩");
}

// ════════════════════════════════════════════════════════════
// 11. Edge Case: Small bet (3兩 小盤)
// ════════════════════════════════════════════════════════════

section("Edge case: 小盤 (3兩 mandatory self-bet)");

{
  const match: CompletedMatch = {
    matchId: "e5",
    result: "team_a",
    teamAPlayer1Id: "pA1",
    teamAPlayer2Id: "pA2",
    teamBPlayer1Id: "pB1",
    teamBPlayer2Id: "pB2",
  };

  const bets: ActiveBet[] = [
    { memberId: "pA1", matchId: "e5", teamBetOn: "A", amountLiang: 3, betType: "mandatory_self", result: "win" },
    { memberId: "pA2", matchId: "e5", teamBetOn: "A", amountLiang: 3, betType: "mandatory_self", result: "win" },
    { memberId: "pB1", matchId: "e5", teamBetOn: "B", amountLiang: 3, betType: "mandatory_self", result: "loss" },
    { memberId: "pB2", matchId: "e5", teamBetOn: "B", amountLiang: 3, betType: "mandatory_self", result: "loss" },
    { memberId: "ext1", matchId: "e5", teamBetOn: "A", amountLiang: 1, betType: "voluntary", result: "win" },
  ];

  const shares: PlayerShare[] = [
    { playerId: "pA1", matchSide: "A", shareBps: 5_000 },
    { playerId: "pA2", matchSide: "A", shareBps: 5_000 },
    { playerId: "pB1", matchSide: "B", shareBps: 5_000 },
    { playerId: "pB2", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, FREE_PERIOD_CONFIG, "2026-03-10");

  // Total losing = 3+3 = 6兩 = $6,000. Flow1: each A player gets $3,000.
  // Total winning = 3+3+1 = 7兩 = $7,000. Flow2: each B player pays $3,500.
  const pA1 = findMember(details, "pA1");
  assertEqual(pA1.betGainNtd, 3_000, "小盤: pA1 bet gain = $3,000");
  assertEqual(pA1.flow1IncomeNtd, 3_000, "小盤: pA1 flow1 = $3,000");
  assertEqual(pA1.netGainNtd, 6_000, "小盤: pA1 net = $6,000 (6兩)");
  // Rake: 6000 * 5 = 30000. 30000/10000 = 3.0. round(3.0) = 3. rake = $300.
  assertEqual(pA1.rakeNtd, 300, "小盤: pA1 rake = $300");

  const pB1 = findMember(details, "pB1");
  assertEqual(pB1.flow2LiabilityNtd, 3_500, "小盤: pB1 flow2 = $3,500");
  assertEqual(pB1.netGainNtd, -6_500, "小盤: pB1 net = -$6,500");
}

// ════════════════════════════════════════════════════════════
// 12. Degenerate: All external bettors on winning side
//     (losing side = only players' self-bets)
// ════════════════════════════════════════════════════════════

section("Degenerate: All externals bet on winning side (lopsided)");

{
  const match: CompletedMatch = {
    matchId: "d1",
    result: "team_a",
    teamAPlayer1Id: "pA1",
    teamAPlayer2Id: "pA2",
    teamBPlayer1Id: "pB1",
    teamBPlayer2Id: "pB2",
  };

  // Every external bettor on A. Only B players' self-bets are losses.
  const bets: ActiveBet[] = [
    { memberId: "pA1", matchId: "d1", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pA2", matchId: "d1", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pB1", matchId: "d1", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "pB2", matchId: "d1", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "ext1", matchId: "d1", teamBetOn: "A", amountLiang: 3, betType: "voluntary", result: "win" },
    { memberId: "ext2", matchId: "d1", teamBetOn: "A", amountLiang: 5, betType: "voluntary", result: "win" },
    { memberId: "ext3", matchId: "d1", teamBetOn: "A", amountLiang: 2, betType: "voluntary", result: "win" },
  ];

  const shares: PlayerShare[] = [
    { playerId: "pA1", matchSide: "A", shareBps: 5_000 },
    { playerId: "pA2", matchSide: "A", shareBps: 5_000 },
    { playerId: "pB1", matchSide: "B", shareBps: 5_000 },
    { playerId: "pB2", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, FREE_PERIOD_CONFIG, "2026-03-10");

  // total_losing = 5+5 = 10兩 = $10,000 (only B players' self-bets)
  // total_winning = 5+5+3+5+2 = 20兩 = $20,000
  // Flow 1: winning players split $10,000 → $5,000 each
  // Flow 2: losing players split $20,000 → $10,000 each (massive liability!)

  const pA1 = findMember(details, "pA1");
  assertEqual(pA1.flow1IncomeNtd, 5_000, "Lopsided: pA1 flow1 = $5,000");
  assertEqual(pA1.netGainNtd, 10_000, "Lopsided: pA1 net = $10,000");

  const pB1 = findMember(details, "pB1");
  assertEqual(pB1.flow2LiabilityNtd, 10_000, "Lopsided: pB1 flow2 = $10,000 (amplified)");
  assertEqual(pB1.netGainNtd, -15_000, "Lopsided: pB1 net = -$15,000");
  assertEqual(pB1.rakeNtd, 0, "Lopsided: pB1 rake = 0 (loser)");

  const ext1 = findMember(details, "ext1");
  assertEqual(ext1.netGainNtd, 3_000, "Lopsided: ext1 net = $3,000");
  assertEqual(ext1.flow1IncomeNtd, 0, "Lopsided: ext1 flow1 = 0 (not a player)");

  // Balance check
  const totalFinal = details.reduce((s, d) => s + d.finalNetNtd, 0);
  const totalRake = details.reduce((s, d) => s + d.rakeNtd, 0);
  assertEqual(totalFinal, -totalRake, "Lopsided: sum finals = -rake");
}

// ════════════════════════════════════════════════════════════
// 13. Degenerate: Zero losing bets (all bets are wins)
//     Cannot happen with mandatory self-bets, but tests code robustness
// ════════════════════════════════════════════════════════════

section("Degenerate: Zero bets on losing side");

{
  const match: CompletedMatch = {
    matchId: "d2",
    result: "team_a",
    teamAPlayer1Id: "pA1",
    teamAPlayer2Id: "pA2",
    teamBPlayer1Id: "pB1",
    teamBPlayer2Id: "pB2",
  };

  // Only winning bets — no losing bets at all
  const bets: ActiveBet[] = [
    { memberId: "pA1", matchId: "d2", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "pA2", matchId: "d2", teamBetOn: "A", amountLiang: 5, betType: "mandatory_self", result: "win" },
    { memberId: "ext1", matchId: "d2", teamBetOn: "A", amountLiang: 2, betType: "voluntary", result: "win" },
  ];

  const shares: PlayerShare[] = [
    { playerId: "pA1", matchSide: "A", shareBps: 5_000 },
    { playerId: "pA2", matchSide: "A", shareBps: 5_000 },
    { playerId: "pB1", matchSide: "B", shareBps: 5_000 },
    { playerId: "pB2", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, FREE_PERIOD_CONFIG, "2026-03-10");

  // total_losing = 0 → Flow 1: allocateByShares(0, ...) → all get 0
  // total_winning = 12兩 = $12,000 → Flow 2: losing players each pay $6,000
  // But losing players have no bets, so betLoss = 0, only flow2Liability

  const pA1 = findMember(details, "pA1");
  assertEqual(pA1.flow1IncomeNtd, 0, "Zero losers: pA1 flow1 = 0 (nothing to collect)");
  assertEqual(pA1.netGainNtd, 5_000, "Zero losers: pA1 net = $5,000 (bet win only)");

  const pB1 = findMember(details, "pB1");
  assertEqual(pB1.betLossNtd, 0, "Zero losers: pB1 bet loss = 0 (no bet placed)");
  assertEqual(pB1.flow2LiabilityNtd, 6_000, "Zero losers: pB1 flow2 = $6,000");
  assertEqual(pB1.netGainNtd, -6_000, "Zero losers: pB1 net = -$6,000");

  // No division by zero, no crash, balance holds
  const totalFinal = details.reduce((s, d) => s + d.finalNetNtd, 0);
  const totalRake = details.reduce((s, d) => s + d.rakeNtd, 0);
  assertEqual(totalFinal, -totalRake, "Zero losers: sum finals = -rake");
}

// ════════════════════════════════════════════════════════════
// 14. Degenerate: Zero winning bets (all bets are losses)
// ════════════════════════════════════════════════════════════

section("Degenerate: Zero bets on winning side");

{
  const match: CompletedMatch = {
    matchId: "d3",
    result: "team_a",
    teamAPlayer1Id: "pA1",
    teamAPlayer2Id: "pA2",
    teamBPlayer1Id: "pB1",
    teamBPlayer2Id: "pB2",
  };

  // Only losing bets — no winning bets at all
  const bets: ActiveBet[] = [
    { memberId: "pB1", matchId: "d3", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "pB2", matchId: "d3", teamBetOn: "B", amountLiang: 5, betType: "mandatory_self", result: "loss" },
    { memberId: "ext1", matchId: "d3", teamBetOn: "B", amountLiang: 3, betType: "voluntary", result: "loss" },
  ];

  const shares: PlayerShare[] = [
    { playerId: "pA1", matchSide: "A", shareBps: 5_000 },
    { playerId: "pA2", matchSide: "A", shareBps: 5_000 },
    { playerId: "pB1", matchSide: "B", shareBps: 5_000 },
    { playerId: "pB2", matchSide: "B", shareBps: 5_000 },
  ];

  const details = calculateMatchPayout(match, bets, shares, FREE_PERIOD_CONFIG, "2026-03-10");

  // total_losing = 13兩 = $13,000 → Flow 1: winning players split $13,000
  // total_winning = 0 → Flow 2: allocateByShares(0, ...) → losing players pay 0

  const pA1 = findMember(details, "pA1");
  assertEqual(pA1.betGainNtd, 0, "Zero winners: pA1 bet gain = 0 (no bet placed)");
  assertEqual(pA1.flow1IncomeNtd, 6_500, "Zero winners: pA1 flow1 = $6,500 (50% of $13,000)");
  assertEqual(pA1.netGainNtd, 6_500, "Zero winners: pA1 net = $6,500");

  const pB1 = findMember(details, "pB1");
  assertEqual(pB1.flow2LiabilityNtd, 0, "Zero winners: pB1 flow2 = 0 (nothing to pay out)");
  assertEqual(pB1.netGainNtd, -5_000, "Zero winners: pB1 net = -$5,000 (own bet loss only)");

  // No division by zero, no crash, balance holds
  const totalFinal = details.reduce((s, d) => s + d.finalNetNtd, 0);
  const totalRake = details.reduce((s, d) => s + d.rakeNtd, 0);
  assertEqual(totalFinal, -totalRake, "Zero winners: sum finals = -rake");
}

// ════════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════════

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("⚠️  Some tests FAILED — review output above");
  process.exit(1);
} else {
  console.log("All tests passed.");
}
