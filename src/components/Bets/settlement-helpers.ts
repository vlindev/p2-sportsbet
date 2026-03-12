import type { BillingConfig, ActiveBet, PlayerShare } from "@/lib/settlement";
import type { Bet, MatchTeamPlayerShare } from "@/types";

export function toBillingConfig(row: {
  provider_rate_bps: number; free_period_months: number;
  contract_start_date: string; billing_enabled: boolean;
}): BillingConfig {
  // 🟠-6: Explicit month arithmetic — avoids JS Date month-end overflow (R20.3)
  const [y, m, d] = row.contract_start_date.split("-").map(Number);
  const totalMonths = (y * 12 + (m - 1)) + row.free_period_months;
  const endY = Math.floor(totalMonths / 12);
  const endM = (totalMonths % 12) + 1;
  const lastDay = new Date(endY, endM, 0).getDate();
  const endD = Math.min(d, lastDay);
  const endDate = `${endY}-${String(endM).padStart(2, "0")}-${String(endD).padStart(2, "0")}`;
  return {
    providerRateBps: row.provider_rate_bps,
    freePeriodEndDate: endDate,
    billingEnabled: row.billing_enabled,
  };
}

export function toActiveBets(bets: Bet[]): ActiveBet[] {
  return bets.filter(b => b.result === "win" || b.result === "loss").map(b => ({
    memberId: b.member_id, matchId: b.match_id, teamBetOn: b.team_bet_on as "A" | "B",
    amountLiang: b.amount_liang, betType: b.bet_type, result: b.result as "win" | "loss",
  }));
}

export function toPlayerShares(shares: MatchTeamPlayerShare[]): PlayerShare[] {
  return shares.map(s => ({ playerId: s.player_id, matchSide: s.match_side, shareBps: s.share_bps }));
}

/** Validate shares sum to 10,000 per side */
export function sharesValid(shares: MatchTeamPlayerShare[]): boolean {
  for (const side of ["A", "B"] as const) {
    const ss = shares.filter(s => s.match_side === side);
    if (ss.length === 0) return false;
    if (ss.reduce((s, r) => s + r.share_bps, 0) !== 10_000) return false;
  }
  return true;
}

/** Group array items by a key function */
export function groupBy<T>(items: T[], key: (item: T) => string | null): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    if (k) {
      if (!result[k]) result[k] = [];
      result[k].push(item);
    }
  }
  return result;
}
