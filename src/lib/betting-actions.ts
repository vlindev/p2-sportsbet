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

// -- place_bet RPC wrapper ------------------------------------------------

export type PlaceBetResult =
  | { success: true; status: "accepted"; betId: string; requestId: string }
  | { success: true; status: "pending"; betId: null; requestId: string }
  | { success: false; status: "rejected"; rejectReason: string }
  | { success: false; status: "error"; rejectReason: string };

const REJECT_MESSAGES: Record<string, string> = {
  duplicate_bet: "此會員已有此場投注",
  duplicate_pending_request: "此會員已有待處理的投注請求",
  bet_on_opening_team: "不可投注開盤方",
  invalid_base_amount: "投注金額不符（標準盤：1或2兩）",
  invalid_small_amount: "投注金額不符（小盤：僅限1兩）",
  invalid_pool_amount: "投注金額：1–50 支（3–150兩）",
  betting_closed: "已封盤，會員無法下注",
  match_status_active: "比賽進行中，無法下注",
  match_status_completed: "比賽已結束",
  match_status_cancelled: "比賽已取消",
};

/**
 * Place a bet via the server-side `place_bet` RPC.
 * Single atomic transaction — no dual writes.
 */
export async function placeBet(params: {
  matchId: string;
  memberId: string;
  teamBetOn: "A" | "B";
  amountLiang: number;
  betType: "mandatory_monday" | "voluntary";
  sporadicPoolId?: string | null;
  createdByRole?: "member" | "bookkeeper" | "system";
  createdVia?: "manual" | "rule_engine" | "scheduled_job" | "import" | "api";
  performedBy?: string;
}): Promise<PlaceBetResult> {
  const { data, error } = await supabase.rpc("place_bet", {
    p_match_id: params.matchId,
    p_member_id: params.memberId,
    p_team_bet_on: params.teamBetOn,
    p_amount_liang: params.amountLiang,
    p_bet_type: params.betType,
    p_sporadic_pool_id: params.sporadicPoolId ?? null,
    p_created_by_role: params.createdByRole ?? "bookkeeper",
    p_created_via: params.createdVia ?? "manual",
    p_performed_by: params.performedBy ?? "bookkeeper",
  });

  // Supabase-level error (network, RPC exception)
  if (error) {
    console.error("place_bet RPC error:", error);
    return { success: false, status: "error", rejectReason: "系統錯誤，請重試" };
  }

  const result = data as {
    success: boolean;
    destination: string | null;
    status: string;
    bet_id: string | null;
    request_id: string | null;
    reject_reason: string | null;
  };

  if (result.success && result.status === "accepted") {
    return {
      success: true,
      status: "accepted",
      betId: result.bet_id!,
      requestId: result.request_id!,
    };
  }

  if (result.success && result.status === "pending") {
    return {
      success: true,
      status: "pending",
      betId: null,
      requestId: result.request_id!,
    };
  }

  // Business rejection
  const reason = result.reject_reason ?? "unknown";
  return {
    success: false,
    status: "rejected",
    rejectReason: REJECT_MESSAGES[reason] ?? `投注失敗：${reason}`,
  };
}

// -- edit_bet RPC wrapper -------------------------------------------------

export type EditBetResult = {
  success: boolean;
  operation?: string;
  betId?: string;
  oldValue?: number | string;
  newValue?: number | string;
  reasonCode?: string;
  message?: string;
};

/**
 * Edit an existing bet via the server-side `edit_bet` RPC.
 * Single atomic transaction — updates both bets + bet_requests.
 */
export async function editBet(params: {
  betId: string;
  operation: "adjust_amount" | "swap_team";
  newAmountLiang?: number;
  newTeamBetOn?: "A" | "B";
  performedBy?: string;
}): Promise<EditBetResult> {
  const { data, error } = await supabase.rpc("edit_bet", {
    p_bet_id: params.betId,
    p_operation: params.operation,
    p_new_amount_liang: params.newAmountLiang ?? null,
    p_new_team_bet_on: params.newTeamBetOn ?? null,
    p_performed_by: params.performedBy ?? "bookkeeper",
  });

  if (error) {
    console.error("edit_bet RPC error:", error);
    return { success: false, reasonCode: "RPC_ERROR", message: error.message };
  }

  return data as EditBetResult;
}

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

  let accepted = 0;
  for (const p of placements) {
    const result = await placeBet({
      matchId,
      memberId: p.memberId,
      teamBetOn: p.teamBetOn,
      amountLiang: 1,
      betType: "mandatory_monday",
      createdByRole: "system",
      createdVia: "scheduled_job",
      performedBy: "system:auto-placement",
    });
    if (result.success && result.status === "accepted") {
      accepted++;
      continue;
    }
    if (!result.success && result.rejectReason === "此會員已有此場投注") {
      continue;
    }
    return { success: false, count: accepted, error: result.success ? "派注進入待審核，請檢查容量設定" : result.rejectReason };
  }

  return { success: true, count: accepted };
}
