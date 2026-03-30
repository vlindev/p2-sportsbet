CREATE OR REPLACE FUNCTION edit_bet(
  p_bet_id            UUID,
  p_operation          TEXT,        -- 'adjust_amount' | 'swap_team'
  p_new_amount_liang   INT  DEFAULT NULL,   -- required for adjust_amount
  p_new_team_bet_on    TEXT DEFAULT NULL,    -- required for swap_team
  p_performed_by       TEXT DEFAULT 'bookkeeper'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bet     RECORD;
  v_request RECORD;
  v_old_value TEXT;
  v_new_value TEXT;
BEGIN
  -- ── Input validation ──────────────────────────────────────────

  IF p_operation NOT IN ('adjust_amount', 'swap_team') THEN
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;

  IF p_operation = 'adjust_amount' AND p_new_amount_liang IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: p_new_amount_liang for adjust_amount';
  END IF;

  IF p_operation = 'swap_team' AND p_new_team_bet_on IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: p_new_team_bet_on for swap_team';
  END IF;

  IF p_operation = 'adjust_amount' AND p_new_team_bet_on IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid parameter combination: p_new_team_bet_on provided for adjust_amount';
  END IF;

  IF p_operation = 'swap_team' AND p_new_amount_liang IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid parameter combination: p_new_amount_liang provided for swap_team';
  END IF;

  IF p_new_team_bet_on IS NOT NULL AND p_new_team_bet_on NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid team value: %', p_new_team_bet_on;
  END IF;

  IF p_new_amount_liang IS NOT NULL AND p_new_amount_liang NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Invalid amount: % — must be 1, 2, or 3', p_new_amount_liang;
  END IF;

  -- ── Load bet + match (row lock on both) ───────────────────────

  SELECT b.*, m.status AS match_status, m.capacity_zhi, m.bet_config
  INTO v_bet
  FROM bets b
  JOIN matches m ON m.id = b.match_id
  WHERE b.id = p_bet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bet not found: %', p_bet_id;
  END IF;

  IF v_bet.status = 'voided' THEN
    RAISE EXCEPTION 'Cannot edit a voided bet';
  END IF;

  IF v_bet.bet_type = 'mandatory_self' THEN
    RAISE EXCEPTION 'Self-bets cannot be manually edited';
  END IF;

  IF v_bet.match_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot edit bets on a completed or cancelled match';
  END IF;

  -- ── Load corresponding bet_request ────────────────────────────
  -- IS NOT DISTINCT FROM handles NULL = NULL correctly
  -- (sporadic_pool_id is nullable; plain = returns NULL for NULL = NULL)

  SELECT * INTO v_request
  FROM bet_requests
  WHERE match_id = v_bet.match_id
    AND member_id = v_bet.member_id
    AND status = 'accepted'
    AND sporadic_pool_id IS NOT DISTINCT FROM v_bet.sporadic_pool_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No accepted bet_request found for this bet — data inconsistency';
  END IF;

  IF v_request.requested_amount != v_request.accepted_amount THEN
    RAISE EXCEPTION 'bet_request has pre-existing inconsistency (requested=%, accepted=%) — manual review required',
      v_request.requested_amount, v_request.accepted_amount;
  END IF;

  -- ── Branch on operation ───────────────────────────────────────

  IF p_operation = 'adjust_amount' THEN
    v_old_value := v_bet.amount_liang::TEXT;
    v_new_value := p_new_amount_liang::TEXT;

    -- No capacity check in Phase 1 (bookkeeper override)
    UPDATE bets SET
      amount_liang = p_new_amount_liang,
      bet_type = 'voluntary',
      created_by_role = 'bookkeeper',
      created_via = 'manual'
    WHERE id = p_bet_id;

    -- Update both fields to preserve R13.3 invariant
    -- (0 <= accepted_amount <= requested_amount)
    UPDATE bet_requests SET
      requested_amount = p_new_amount_liang,
      accepted_amount = p_new_amount_liang
    WHERE id = v_request.id;

  ELSIF p_operation = 'swap_team' THEN
    v_old_value := v_bet.team_bet_on;
    v_new_value := p_new_team_bet_on;

    -- No capacity enforcement in Phase 1 (bookkeeper override)
    UPDATE bets SET
      team_bet_on = p_new_team_bet_on,
      bet_type = 'voluntary',
      created_by_role = 'bookkeeper',
      created_via = 'manual'
    WHERE id = p_bet_id;

    UPDATE bet_requests SET
      team_bet_on = p_new_team_bet_on
    WHERE id = v_request.id;

  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', p_operation,
    'bet_id', p_bet_id,
    'old_value', v_old_value,
    'new_value', v_new_value
  );
END;
$$;
