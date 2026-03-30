import { supabase } from "@/lib/supabase";
import { calculateMatchPayout, ntdToLiang } from "@/lib/settlement";
import type { CompletedMatch, BillingConfig, MemberMatchDetail } from "@/lib/settlement";
import type { Bet, MatchTeamPlayerShare } from "@/types";
import { toActiveBets, toPlayerShares } from "@/lib/settlement-helpers";

type SettlementResult = { success: boolean; error?: string };

/**
 * Persist base match settlement into match_settlements + update monthly settlements.
 * Called after submit_match_result or correct_match_result succeeds.
 * Never throws — returns { success: false, error } on failure.
 */
export async function persistMatchSettlement(params: {
  match: CompletedMatch & { date: string };
  baseBets: Bet[];
  baseShares: MatchTeamPlayerShare[];
  billingConfig: BillingConfig;
}): Promise<SettlementResult> {
  try {
    const { match, baseBets, baseShares, billingConfig } = params;

    const details = calculateMatchPayout(
      match,
      toActiveBets(baseBets),
      toPlayerShares(baseShares),
      billingConfig,
      match.date,
    );

    const rows = details.map((d) => ({
      member_id: d.memberId,
      match_id: d.matchId,
      settlement_context: "base" as const,
      sporadic_pool_id: null,
      settlement_date: match.date,
      gross_liang: ntdToLiang(d.grossGainNtd),
      rake_liang: ntdToLiang(d.rakeNtd),
      provider_fee_liang: ntdToLiang(d.providerFeeNtd),
      net_liang: ntdToLiang(d.finalNetNtd),
      // NTD units — intentional, render layer converts via ntdToLiang() at display time
      detail_jsonb: d,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("match_settlements")
      .upsert(rows, { onConflict: "member_id,match_id,settlement_context,sporadic_pool_id", ignoreDuplicates: false });

    if (upsertError) {
      return { success: false, error: `match_settlements upsert failed: ${upsertError.message}` };
    }

    const monthlyResult = await upsertMonthlySettlements(details, match.date);
    if (!monthlyResult.success) {
      return monthlyResult;
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `persistMatchSettlement error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Persist sporadic pool settlement into match_settlements + update monthly settlements.
 * Called after submit_pool_result or correct_pool_result succeeds.
 * Never throws — returns { success: false, error } on failure.
 */
export async function persistPoolSettlement(params: {
  pool: { id: string; match_id: string };
  match: { date: string; id: string };
  poolBets: Bet[];
  poolShares: MatchTeamPlayerShare[];
  billingConfig: BillingConfig;
  poolResult: "team_a" | "team_b";
}): Promise<SettlementResult> {
  try {
    const { pool, match, poolBets, poolShares, billingConfig, poolResult } = params;

    // Pool calculation uses pool.id as matchId in CompletedMatch
    // and the match's player IDs (same 4 players)
    const poolAsMatch: CompletedMatch = {
      matchId: pool.id,
      result: poolResult,
      teamAPlayer1Id: "",
      teamAPlayer2Id: "",
      teamBPlayer1Id: "",
      teamBPlayer2Id: "",
    };

    // We need player IDs from the match — fetch them
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("team_a_player1_id, team_a_player2_id, team_b_player1_id, team_b_player2_id")
      .eq("id", match.id)
      .single();

    if (matchError || !matchData) {
      return { success: false, error: `Failed to fetch match players: ${matchError?.message}` };
    }

    poolAsMatch.teamAPlayer1Id = matchData.team_a_player1_id;
    poolAsMatch.teamAPlayer2Id = matchData.team_a_player2_id;
    poolAsMatch.teamBPlayer1Id = matchData.team_b_player1_id;
    poolAsMatch.teamBPlayer2Id = matchData.team_b_player2_id;

    const details = calculateMatchPayout(
      poolAsMatch,
      toActiveBets(poolBets),
      toPlayerShares(poolShares),
      billingConfig,
      match.date,
    );

    const rows = details.map((d) => ({
      member_id: d.memberId,
      match_id: match.id,
      settlement_context: "sporadic_pool" as const,
      sporadic_pool_id: pool.id,
      settlement_date: match.date,
      gross_liang: ntdToLiang(d.grossGainNtd),
      rake_liang: ntdToLiang(d.rakeNtd),
      provider_fee_liang: ntdToLiang(d.providerFeeNtd),
      net_liang: ntdToLiang(d.finalNetNtd),
      // NTD units — intentional, render layer converts via ntdToLiang() at display time
      detail_jsonb: d,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("match_settlements")
      .upsert(rows, { onConflict: "member_id,match_id,settlement_context,sporadic_pool_id", ignoreDuplicates: false });

    if (upsertError) {
      return { success: false, error: `match_settlements pool upsert failed: ${upsertError.message}` };
    }

    const monthlyResult = await upsertMonthlySettlements(details, match.date);
    if (!monthlyResult.success) {
      return monthlyResult;
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `persistPoolSettlement error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Re-aggregate monthly totals from match_settlements for each affected member.
 * Sums ALL match_settlements rows for the member in that year/month — not incremental.
 */
async function upsertMonthlySettlements(
  details: MemberMatchDetail[],
  settlementDate: string,
): Promise<SettlementResult> {
  const [yearStr, monthStr] = settlementDate.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const memberIds = [...new Set(details.map((d) => d.memberId))];

  // Fetch all match_settlements for these members in this year/month
  const startDate = `${yearStr}-${monthStr}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { data: allRows, error: fetchError } = await supabase
    .from("match_settlements")
    .select("member_id, gross_liang, rake_liang, provider_fee_liang, net_liang")
    .in("member_id", memberIds)
    .gte("settlement_date", startDate)
    .lt("settlement_date", endDate);

  if (fetchError) {
    return { success: false, error: `Monthly fetch failed: ${fetchError.message}` };
  }

  // Aggregate per member
  const totals = new Map<string, { gross: number; rake: number; fee: number; net: number }>();
  for (const row of allRows || []) {
    const existing = totals.get(row.member_id) || { gross: 0, rake: 0, fee: 0, net: 0 };
    existing.gross += row.gross_liang;
    existing.rake += row.rake_liang;
    existing.fee += row.provider_fee_liang;
    existing.net += row.net_liang;
    totals.set(row.member_id, existing);
  }

  // Upsert into settlements
  const settlementRows = Array.from(totals.entries()).map(([memberId, t]) => ({
    member_id: memberId,
    year,
    month,
    gross_liang: t.gross,
    rake_liang: t.rake,
    provider_fee_liang: t.fee,
    net_liang: t.net,
  }));

  if (settlementRows.length === 0) return { success: true };

  const { error: upsertError } = await supabase
    .from("settlements")
    .upsert(settlementRows, { onConflict: "member_id,year,month", ignoreDuplicates: false });

  if (upsertError) {
    return { success: false, error: `settlements upsert failed: ${upsertError.message}` };
  }

  return { success: true };
}
