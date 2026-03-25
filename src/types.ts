// Single source of truth for shared types and constants — do not redefine elsewhere

export type Match = {
  id: string;
  name: string | null;
  date: string;
  start_time: string | null;
  match_type: "monday" | "optional";
  team_a_player1_id: string;
  team_a_player2_id: string;
  team_b_player1_id: string;
  team_b_player2_id: string;
  handicap_type: "讓點" | "讓洞" | "不讓分";
  handicap_value: number;
  handicap_team: "A" | "B";
  capacity_zhi: number | null;
  bet_config: "standard" | "small";
  result: "team_a" | "team_b" | "pending";
  status: "scheduled" | "betting_closed" | "active" | "completed" | "cancelled";
};

export type CreatedByRole = "member" | "bookkeeper" | "system";
export type CreatedVia = "manual" | "rule_engine" | "scheduled_job" | "import" | "api";

export type Bet = {
  id: string;
  member_id: string;
  match_id: string;
  sporadic_pool_id: string | null;
  team_bet_on: "A" | "B";
  amount_liang: number;
  bet_type: "mandatory_self" | "mandatory_monday" | "voluntary";
  result: "win" | "loss" | "pending";
  status: "active" | "voided";
  void_reason: string | null;
  created_at: string;
  created_by_role: CreatedByRole;
  created_via: CreatedVia;
  created_by_user_id: string | null;
  created_by_service: string | null;
};

export type BetRequest = {
  id: string;
  match_id: string;
  member_id: string;
  sporadic_pool_id: string | null;
  team_bet_on: "A" | "B";
  bet_type: "mandatory_self" | "mandatory_monday" | "voluntary";
  requested_amount: number;
  accepted_amount: number;
  status: "pending" | "partially_accepted" | "accepted" | "rejected" | "expired";
  status_reason: "capacity_overflow_lifo" | "manual_reject" | "deadline_passed" | "match_cancelled" | null;
  created_at: string;
  created_by_role: CreatedByRole;
  created_via: CreatedVia;
  created_by_user_id: string | null;
  created_by_service: string | null;
};

export type SporadicPool = {
  id: string;
  match_id: string;
  opened_by_team: "A" | "B";
  handicap_type: "讓點" | "讓洞" | "不讓分";
  handicap_value: number;
  handicap_team: "A" | "B";
  capacity_zhi: number;
  result: "team_a" | "team_b" | "pending" | "cancelled" | "voided";
  created_at: string;
};

export type MatchTeamPlayerShare = {
  id: string;
  match_id: string;
  match_side: "A" | "B";
  player_id: string;
  share_bps: number;
  context: "base" | "sporadic_pool";
  sporadic_pool_id: string | null;
  pre_adjustment_bps: number | null;
};

export const MATCH_TYPE_LABEL: Record<Match["match_type"], string> = {
  monday: "週一例行賽",
  optional: "熱身賽",
};

export const MATCH_TYPE_STYLE: Record<Match["match_type"], string> = {
  monday: "bg-blue-100 text-blue-700",
  optional: "bg-lime-100 text-lime-700",
};
