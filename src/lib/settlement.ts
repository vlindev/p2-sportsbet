/**
 * Settlement Engine — Pure TypeScript
 *
 * Canonical rules: R16 (payout model), R17 (player shares), R18 (arithmetic),
 * R19 (rake), R20 (provider fee), R21 (settlement calculation).
 *
 * No Supabase dependency — takes data as input, returns calculated results.
 *
 * ── ARITHMETIC POLICY (R18.1) ──────────────────────────────
 *
 * ALL intermediate monetary arithmetic uses integer NTD. No exceptions.
 *
 * Two primitive operations, used everywhere:
 *   floorDiv(a, b)       — integer division toward -∞ (R18.3)
 *   roundHalfUp(a, b)    — integer division with 四捨五入 (0.5 rounds up)
 *
 * Both take integer inputs and return integers. The only JS float
 * operation is inside floorDiv (Math.floor(a / b)), which is exact
 * for all values within Number.MAX_SAFE_INTEGER (2^53).
 * Max intermediate in this system: ~127 billion (well within range).
 *
 * Liang conversion (÷1000) happens ONLY at the output boundary
 * via ntdToLiang(). It is never fed back into arithmetic.
 * ───────────────────────────────────────────────────────────
 */

// ============================================================
// Types
// ============================================================

export interface PlayerShare {
  playerId: string;
  matchSide: "A" | "B";
  shareBps: number; // 0–10000, sum per side = 10000 exactly
}

export interface ActiveBet {
  memberId: string;
  matchId: string;
  teamBetOn: "A" | "B";
  amountLiang: number;
  betType: "mandatory_self" | "mandatory_monday" | "voluntary";
  result: "win" | "loss";
}

export interface CompletedMatch {
  matchId: string;
  result: "team_a" | "team_b";
  teamAPlayer1Id: string;
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;
}

export interface BillingConfig {
  providerRateBps: number; // e.g. 100 = 1.00%
  freePeriodEndDate: string; // ISO date "YYYY-MM-DD"
  billingEnabled: boolean;
}

/** Per-member per-match settlement breakdown */
export interface MemberMatchDetail {
  memberId: string;
  matchId: string;
  // Pass 1: individual bet gains/losses (NTD)
  betGainNtd: number;
  betLossNtd: number;
  // Pass 2: player flow allocations (NTD), 0 for non-players
  flow1IncomeNtd: number; // winning player receives from losing bets
  flow2LiabilityNtd: number; // losing player pays to winning bets
  // Combined
  grossGainNtd: number; // betGainNtd + flow1IncomeNtd
  grossLossNtd: number; // betLossNtd + flow2LiabilityNtd
  netGainNtd: number; // grossGainNtd - grossLossNtd (can be negative)
  // Rake (only when netGainNtd > 0)
  rakeNtd: number;
  // Provider fee
  providerFeeNtd: number;
  providerFeeReason: "free_period" | "standard" | "none";
  // Final
  finalNetNtd: number; // netGainNtd - rakeNtd - providerFeeNtd
}

/** Monthly settlement per member (R21.3) — all values in integer NTD */
export interface MonthlySettlement {
  memberId: string;
  grossGainNtd: number;
  grossLossNtd: number;
  rakeNtd: number;
  providerFeeNtd: number;
  netNtd: number; // positive = 應收, negative = 應付
  matchDetails: MemberMatchDetail[];
}

// ============================================================
// Core Arithmetic (R18)
// ============================================================

/**
 * R18.3 — Integer division using mathematical floor toward negative infinity.
 * floorDiv(7, 2) = 3
 * floorDiv(-7, 2) = -4 (NOT -3)
 *
 * This is the ONLY function that touches JS float division. Every other
 * division in this file routes through floorDiv or roundHalfUp.
 */
export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/**
 * Integer division with round-half-up (四捨五入).
 * For POSITIVE a and b only (which is all rake/rounding use cases).
 *
 * roundHalfUp(5, 10) = 1   (0.5 rounds up)
 * roundHalfUp(4, 10) = 0   (0.4 rounds down)
 * roundHalfUp(15, 10) = 2  (1.5 rounds up)
 *
 * Implementation: floorDiv(a + floorDiv(b, 2), b)
 * For even b (all our use cases): floorDiv(a + b/2, b)
 */
export function roundHalfUp(a: number, b: number): number {
  return floorDiv(a + floorDiv(b, 2), b);
}

/**
 * R18.4 — Proportional allocation of totalNtd across players by share_bps.
 * Distributes remainder +1 NTD in ascending playerId order.
 * Invariant: SUM(allocations) = totalNtd EXACTLY.
 */
export function allocateByShares(
  totalNtd: number,
  shares: { playerId: string; shareBps: number }[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (shares.length === 0 || totalNtd === 0) return result;

  // Step 1: base allocation via floor division (R18.4 Step 1, R18.5)
  let allocated = 0;
  const bases: { playerId: string; base: number }[] = [];
  for (const s of shares) {
    const base = floorDiv(totalNtd * s.shareBps, 10_000);
    bases.push({ playerId: s.playerId, base });
    allocated += base;
  }

  // Step 2: remainder (R18.4 Step 2)
  let remainder = totalNtd - allocated;

  // Step 3: distribute +1 NTD in ascending playerId order (R18.4 Step 3)
  const sorted = [...bases].sort((a, b) => a.playerId.localeCompare(b.playerId));
  for (const entry of sorted) {
    if (remainder <= 0) break;
    entry.base += 1;
    remainder -= 1;
  }

  for (const entry of sorted) {
    result.set(entry.playerId, entry.base);
  }

  return result;
}

// ============================================================
// Rake (R19)
// ============================================================

/**
 * R19.4 — Per-winner rake calculation.
 * Input: net gain in NTD (must be > 0 for a winner).
 * Output: rounded rake in NTD (四捨五入到百位).
 *
 * Integer-only path:
 *   1. raw = netGainNtd × 5           (5% numerator, integer)
 *   2. roundHalfUp(raw, 10_000)       (÷100 for %, ÷100 for rounding unit)
 *   3. × 100                          (back to NTD)
 */
export function calculateRake(netGainNtd: number): number {
  if (netGainNtd <= 0) return 0;

  const fivePercentNumerator = netGainNtd * 5; // integer × integer = integer
  const roundedHundreds = roundHalfUp(fivePercentNumerator, 10_000);
  return roundedHundreds * 100;
}

// ============================================================
// Provider Fee (R20)
// ============================================================

/**
 * R20.4 — Provider fee per winner per match.
 * Applied to the rounded rake amount.
 */
export function calculateProviderFee(
  rakeNtd: number,
  config: BillingConfig,
  settlementDate: string
): { providerFeeNtd: number; reason: "free_period" | "standard" } {
  if (!config.billingEnabled || rakeNtd <= 0) {
    return { providerFeeNtd: 0, reason: "free_period" };
  }

  // R20.4: floor_div(rake_ntd × provider_rate_bps, 10000)
  const providerFeeRaw = floorDiv(rakeNtd * config.providerRateBps, 10_000);

  // R20.3–R20.4: check free period
  if (settlementDate < config.freePeriodEndDate) {
    return { providerFeeNtd: 0, reason: "free_period" };
  }

  return { providerFeeNtd: providerFeeRaw, reason: "standard" };
}

// ============================================================
// Per-Match Settlement (R16 + R21)
// ============================================================

/**
 * Calculate settlement for all members involved in a single completed match.
 *
 * R16: 1:1 payout model, players as house
 * R21: Pass 1 (bet gains/losses) + Pass 2 (player flows) + rake + provider fee
 */
export function calculateMatchPayout(
  match: CompletedMatch,
  bets: ActiveBet[],
  shares: PlayerShare[],
  billingConfig: BillingConfig,
  settlementDate: string
): MemberMatchDetail[] {
  const winningSide: "A" | "B" = match.result === "team_a" ? "A" : "B";
  const losingSide: "A" | "B" = winningSide === "A" ? "B" : "A";

  // Identify players
  const winningPlayerIds =
    winningSide === "A"
      ? [match.teamAPlayer1Id, match.teamAPlayer2Id]
      : [match.teamBPlayer1Id, match.teamBPlayer2Id];
  const losingPlayerIds =
    losingSide === "A"
      ? [match.teamAPlayer1Id, match.teamAPlayer2Id]
      : [match.teamBPlayer1Id, match.teamBPlayer2Id];

  const allPlayerIds = new Set([...winningPlayerIds, ...losingPlayerIds]);

  // Get shares for winning and losing sides
  const winningShares = shares
    .filter((s) => s.matchSide === winningSide)
    .map((s) => ({ playerId: s.playerId, shareBps: s.shareBps }));
  const losingShares = shares
    .filter((s) => s.matchSide === losingSide)
    .map((s) => ({ playerId: s.playerId, shareBps: s.shareBps }));

  // ── R16: Compute flow totals ──────────────────────────────

  // Flow 1: total losing bets → winning players (R16.3 Flow 1)
  const totalLosingNtd = bets
    .filter((b) => b.result === "loss")
    .reduce((sum, b) => sum + b.amountLiang * 1_000, 0);

  // Flow 2: total winning bets paid by losing players (R16.3 Flow 2)
  const totalWinningNtd = bets
    .filter((b) => b.result === "win")
    .reduce((sum, b) => sum + b.amountLiang * 1_000, 0);

  // ── R18.4: Allocate flows by share ratios ─────────────────

  // Flow 1 allocation: each winning player receives a share of totalLosingNtd
  const flow1Allocations = allocateByShares(totalLosingNtd, winningShares);

  // Flow 2 allocation: each losing player pays a share of totalWinningNtd
  const flow2Allocations = allocateByShares(totalWinningNtd, losingShares);

  // ── R21: Per-member settlement ────────────────────────────

  // Collect all unique member IDs involved
  const memberIds = new Set<string>();
  for (const bet of bets) memberIds.add(bet.memberId);
  for (const id of allPlayerIds) memberIds.add(id);

  const details: MemberMatchDetail[] = [];

  for (const memberId of memberIds) {
    const memberBets = bets.filter((b) => b.memberId === memberId);

    // Pass 1: individual bet gains/losses (R21.2 Pass 1)
    let betGainNtd = 0;
    let betLossNtd = 0;
    for (const bet of memberBets) {
      if (bet.result === "win") betGainNtd += bet.amountLiang * 1_000;
      if (bet.result === "loss") betLossNtd += bet.amountLiang * 1_000;
    }

    // Pass 2: player flows (R21.2 Pass 2)
    let flow1IncomeNtd = 0;
    let flow2LiabilityNtd = 0;

    if (winningPlayerIds.includes(memberId)) {
      flow1IncomeNtd = flow1Allocations.get(memberId) ?? 0;
    }
    if (losingPlayerIds.includes(memberId)) {
      flow2LiabilityNtd = flow2Allocations.get(memberId) ?? 0;
    }

    // Combined (R21.4)
    const grossGainNtd = betGainNtd + flow1IncomeNtd;
    const grossLossNtd = betLossNtd + flow2LiabilityNtd;
    const netGainNtd = grossGainNtd - grossLossNtd;

    // Rake (R19, R21 RAKE APPLICATION)
    const rakeNtd = calculateRake(netGainNtd);

    // Provider fee (R20)
    let providerFeeNtd = 0;
    let providerFeeReason: "free_period" | "standard" | "none" = "none";
    if (netGainNtd > 0) {
      const pf = calculateProviderFee(rakeNtd, billingConfig, settlementDate);
      providerFeeNtd = pf.providerFeeNtd;
      providerFeeReason = pf.reason;
    }

    // Final
    const finalNetNtd = netGainNtd - rakeNtd - providerFeeNtd;

    details.push({
      memberId,
      matchId: match.matchId,
      betGainNtd,
      betLossNtd,
      flow1IncomeNtd,
      flow2LiabilityNtd,
      grossGainNtd,
      grossLossNtd,
      netGainNtd,
      rakeNtd,
      providerFeeNtd,
      providerFeeReason,
      finalNetNtd,
    });
  }

  return details;
}

// ============================================================
// Monthly Settlement (R21.3)
// ============================================================

/**
 * Aggregate per-match details into monthly totals per member.
 * Runs calculateMatchPayout for each match, then sums across the month.
 */
export function calculateMonthlySettlement(
  matches: CompletedMatch[],
  allBets: ActiveBet[],
  allShares: PlayerShare[],
  billingConfig: BillingConfig,
  settlementDate: string
): MonthlySettlement[] {
  // Per-member accumulator
  const memberMap = new Map<
    string,
    {
      grossGainNtd: number;
      grossLossNtd: number;
      rakeNtd: number;
      providerFeeNtd: number;
      details: MemberMatchDetail[];
    }
  >();

  const getOrCreate = (memberId: string) => {
    let entry = memberMap.get(memberId);
    if (!entry) {
      entry = {
        grossGainNtd: 0,
        grossLossNtd: 0,
        rakeNtd: 0,
        providerFeeNtd: 0,
        details: [],
      };
      memberMap.set(memberId, entry);
    }
    return entry;
  };

  for (const match of matches) {
    const matchBets = allBets.filter((b) => b.matchId === match.matchId);
    const matchShares = allShares.filter(
      (s) =>
        // shares are per-match — filter by checking player is in this match
        [
          match.teamAPlayer1Id,
          match.teamAPlayer2Id,
          match.teamBPlayer1Id,
          match.teamBPlayer2Id,
        ].includes(s.playerId) &&
        // Verify side matches
        ((s.matchSide === "A" &&
          (s.playerId === match.teamAPlayer1Id ||
            s.playerId === match.teamAPlayer2Id)) ||
          (s.matchSide === "B" &&
            (s.playerId === match.teamBPlayer1Id ||
              s.playerId === match.teamBPlayer2Id)))
    );

    const details = calculateMatchPayout(
      match,
      matchBets,
      matchShares,
      billingConfig,
      settlementDate
    );

    for (const d of details) {
      const entry = getOrCreate(d.memberId);
      entry.grossGainNtd += d.grossGainNtd;
      entry.grossLossNtd += d.grossLossNtd;
      entry.rakeNtd += d.rakeNtd;
      entry.providerFeeNtd += d.providerFeeNtd;
      entry.details.push(d);
    }
  }

  // Build output — all values stay in integer NTD (R21.3)
  // Callers use ntdToLiang() at the display boundary only.
  const results: MonthlySettlement[] = [];
  for (const [memberId, entry] of memberMap) {
    results.push({
      memberId,
      grossGainNtd: entry.grossGainNtd,
      grossLossNtd: entry.grossLossNtd,
      rakeNtd: entry.rakeNtd,
      providerFeeNtd: entry.providerFeeNtd,
      netNtd:
        entry.grossGainNtd -
        entry.grossLossNtd -
        entry.rakeNtd -
        entry.providerFeeNtd,
      matchDetails: entry.details,
    });
  }

  return results;
}

// ============================================================
// Helpers
// ============================================================

/**
 * R17.4 — Generate default equal-split shares for a team side.
 * Returns shares summing to exactly 10000 BPS.
 */
export function generateDefaultShares(
  matchId: string,
  matchSide: "A" | "B",
  playerIds: string[]
): PlayerShare[] {
  const n = playerIds.length;
  if (n === 0) return [];

  const base = floorDiv(10_000, n);
  const remainder = 10_000 - base * n;

  // Sort by playerId ascending for deterministic remainder assignment (R17.4)
  const sorted = [...playerIds].sort((a, b) => a.localeCompare(b));

  return sorted.map((playerId, i) => ({
    playerId,
    matchSide,
    shareBps: base + (i < remainder ? 1 : 0),
  }));
}

/**
 * NTD to liang conversion (R6.5). Display helper — not for arithmetic.
 */
export function ntdToLiang(ntd: number): number {
  return ntd / 1_000;
}

/**
 * Liang to NTD conversion (R6.5). Always exact.
 */
export function liangToNtd(liang: number): number {
  return liang * 1_000;
}
