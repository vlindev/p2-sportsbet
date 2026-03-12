/**
 * Shared betting action logic — used by both BettingActions (match-first entry)
 * and BetsLandingPage (match list landing).
 *
 * Pure DB operations. No React state. Callers handle UI feedback.
 */

import { supabase } from "@/lib/supabase";
import { autoPlaceMonday } from "@/lib/auto-placement";
import { checkMinExposure } from "@/lib/share-validation";
import type { MatchTeamPlayerShare } from "@/types";

type BetForClose = { team_bet_on: "A" | "B"; amount_liang: number };
type BetForAutoPlace = { member_id: string; team_bet_on: "A" | "B"; amount_liang: number };
type BasicMember = { id: string; active: boolean };

/**
 * Close betting (封盤) + R17.11 min exposure check.
 * @param matchBets — active base-match bets for THIS match only
 */
export async function closeBetting(
  matchId: string,
  matchBets: BetForClose[]
): Promise<{ success: boolean; adjusted: boolean; error?: string }> {
  const { error } = await supabase
    .from("matches")
    .update({ status: "betting_closed" })
    .eq("id", matchId);
  if (error) return { success: false, adjusted: false, error: "封盤失敗，請重試" };

  // R17.11: check min exposure for base shares
  const { data: shareData, error: shareErr } = await supabase
    .from("match_team_player_shares")
    .select("*")
    .eq("match_id", matchId)
    .eq("context", "base")
    .is("sporadic_pool_id", null);
  if (shareErr) { console.error("R17.11 share fetch:", shareErr); return { success: true, adjusted: false }; }
  if (!shareData) return { success: true, adjusted: false };

  const allShares = shareData as MatchTeamPlayerShare[];
  const teamATotal = matchBets
    .filter((b) => b.team_bet_on === "A")
    .reduce((s, b) => s + b.amount_liang, 0);
  const teamBTotal = matchBets
    .filter((b) => b.team_bet_on === "B")
    .reduce((s, b) => s + b.amount_liang, 0);

  let adjusted = false;
  for (const side of ["A", "B"] as const) {
    const sideShares = allShares
      .filter((s) => s.match_side === side)
      .sort((a, b) => a.player_id.localeCompare(b.player_id));
    const opposingTotal = side === "A" ? teamBTotal : teamATotal;
    const adjustments = checkMinExposure(sideShares, opposingTotal, 20);
    if (adjustments) {
      for (const [id, { originalBps, newBps }] of adjustments) {
        const { error: updateErr } = await supabase
          .from("match_team_player_shares")
          .update({ share_bps: newBps, pre_adjustment_bps: originalBps })
          .eq("id", id);
        if (updateErr) console.error("R17.11 share update:", updateErr);
      }
      adjusted = true;
    }
  }

  return { success: true, adjusted };
}

/** Reopen betting (取消封盤). */
export async function openBetting(
  matchId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("matches")
    .update({ status: "scheduled" })
    .eq("id", matchId);
  if (error) return { success: false, error: "取消封盤失敗，請重試" };
  return { success: true };
}

/**
 * Run auto-placement (派注) for a Monday match.
 * @param matchBets — active base-match bets for THIS match only
 */
export async function runAutoPlacementAction(
  matchId: string,
  members: BasicMember[],
  matchBets: BetForAutoPlace[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const activeMemberIds = members.filter((m) => m.active).map((m) => m.id);
  const bettedIds = new Set(matchBets.map((b) => b.member_id));
  const unplacedIds = activeMemberIds.filter((id) => !bettedIds.has(id));

  if (unplacedIds.length === 0) return { success: true, count: 0 };

  const existing = matchBets.map((b) => ({
    memberId: b.member_id,
    teamBetOn: b.team_bet_on as "A" | "B",
    amountLiang: b.amount_liang,
  }));
  const placements = autoPlaceMonday(existing, unplacedIds);

  const betRequests = placements.map((p) => ({
    match_id: matchId,
    member_id: p.memberId,
    team_bet_on: p.teamBetOn,
    bet_type: "mandatory_monday",
    requested_amount: 1,
    accepted_amount: 1,
    status: "accepted",
    created_by_role: "system",
    created_via: "scheduled_job",
  }));
  const { error: reqErr } = await supabase.from("bet_requests").insert(betRequests);
  if (reqErr) return { success: false, count: 0, error: "派注失敗，請重試" };

  const newBets = placements.map((p) => ({
    match_id: matchId,
    member_id: p.memberId,
    team_bet_on: p.teamBetOn,
    amount_liang: 1,
    bet_type: "mandatory_monday",
    result: "pending",
    status: "active",
    created_by_role: "system",
    created_via: "scheduled_job",
  }));
  const { error: betErr } = await supabase.from("bets").insert(newBets);
  if (betErr) return { success: false, count: 0, error: "派注失敗，請重試" };

  return { success: true, count: placements.length };
}
