CREATE OR REPLACE FUNCTION place_bet(
  p_match_id         UUID,
  p_member_id        UUID,
  p_team_bet_on      TEXT,
  p_amount_liang     INTEGER,
  p_bet_type         TEXT,
  p_sporadic_pool_id UUID DEFAULT NULL,
  p_created_by_role  TEXT DEFAULT 'bookkeeper',
  p_created_via      TEXT DEFAULT 'manual',
  p_performed_by     TEXT DEFAULT 'bookkeeper'
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_match    RECORD;
  v_pool     RECORD;
  v_is_pool  BOOLEAN;
  v_capacity_zhi     INTEGER;
  v_capacity_liang   INTEGER;
  v_exposure_liang   INTEGER;
  v_available_liang  INTEGER;
  v_outcome          TEXT;  -- 'accepted' or 'pending'
  v_request_id       UUID;
  v_bet_id           UUID;
BEGIN
  -- ──────────────────────────────────────────────────────────
  -- 1. Resolve operation type
  -- ──────────────────────────────────────────────────────────
  v_is_pool := (p_sporadic_pool_id IS NOT NULL);

  -- ──────────────────────────────────────────────────────────
  -- 2. Lock relevant records (FOR UPDATE)
  -- ──────────────────────────────────────────────────────────
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  IF v_is_pool THEN
    SELECT * INTO v_pool
    FROM sporadic_pools
    WHERE id = p_sporadic_pool_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sporadic pool not found: %', p_sporadic_pool_id;
    END IF;

    -- Verify pool belongs to this match
    IF v_pool.match_id != p_match_id THEN
      RAISE EXCEPTION 'Pool % does not belong to match %', p_sporadic_pool_id, p_match_id;
    END IF;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 3. Validate match status
  -- ──────────────────────────────────────────────────────────
  IF v_match.status IN ('active', 'completed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'destination', NULL,
      'status', 'rejected',
      'bet_id', NULL,
      'request_id', NULL,
      'reject_reason', 'match_status_' || v_match.status
    );
  END IF;

  IF v_match.status = 'betting_closed' AND p_created_by_role != 'bookkeeper' THEN
    RETURN jsonb_build_object(
      'success', false,
      'destination', NULL,
      'status', 'rejected',
      'bet_id', NULL,
      'request_id', NULL,
      'reject_reason', 'betting_closed'
    );
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 4. Validate inputs and business rules
  -- ──────────────────────────────────────────────────────────

  -- D9: mandatory_self excluded
  IF p_bet_type = 'mandatory_self' THEN
    RAISE EXCEPTION 'mandatory_self not supported via place_bet';
  END IF;

  -- Validate enums
  IF p_team_bet_on NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid team_bet_on: %', p_team_bet_on;
  END IF;

  IF p_bet_type NOT IN ('mandatory_monday', 'voluntary') THEN
    RAISE EXCEPTION 'Invalid bet_type: %', p_bet_type;
  END IF;

  IF p_amount_liang <= 0 THEN
    RAISE EXCEPTION 'Invalid amount_liang: % (must be > 0)', p_amount_liang;
  END IF;

  -- R5.4: pool team restriction — unconditional, no player exception (D11)
  -- Nested IF required: PL/pgSQL does not short-circuit AND for unassigned record fields
  IF v_is_pool THEN
    IF p_team_bet_on = v_pool.opened_by_team THEN
      RETURN jsonb_build_object(
        'success', false,
        'destination', NULL,
        'status', 'rejected',
        'bet_id', NULL,
        'request_id', NULL,
        'reject_reason', 'bet_on_opening_team'
      );
    END IF;
  END IF;

  -- Amount validation
  IF v_is_pool THEN
    -- R11.2: pool bets must be multiples of 3兩, range 3–150
    IF p_amount_liang % 3 != 0 OR p_amount_liang < 3 OR p_amount_liang > 150 THEN
      RETURN jsonb_build_object(
        'success', false,
        'destination', NULL,
        'status', 'rejected',
        'bet_id', NULL,
        'request_id', NULL,
        'reject_reason', 'invalid_pool_amount'
      );
    END IF;
  ELSE
    -- R8.5/R11.1: base match amount against bet_config
    IF v_match.bet_config = 'standard' THEN
      IF p_amount_liang NOT IN (1, 2) THEN
        RETURN jsonb_build_object(
          'success', false,
          'destination', NULL,
          'status', 'rejected',
          'bet_id', NULL,
          'request_id', NULL,
          'reject_reason', 'invalid_base_amount'
        );
      END IF;
    ELSIF v_match.bet_config = 'small' THEN
      IF p_amount_liang != 1 THEN
        RETURN jsonb_build_object(
          'success', false,
          'destination', NULL,
          'status', 'rejected',
          'bet_id', NULL,
          'request_id', NULL,
          'reject_reason', 'invalid_small_amount'
        );
      END IF;
    ELSE
      RAISE EXCEPTION 'Unknown bet_config: %', v_match.bet_config;
    END IF;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 5. Duplicate check (both bets and bet_requests)
  -- ──────────────────────────────────────────────────────────
  IF v_is_pool THEN
    -- Pool: unique by (member_id, sporadic_pool_id)
    IF EXISTS (
      SELECT 1 FROM bets
      WHERE member_id = p_member_id
        AND sporadic_pool_id = p_sporadic_pool_id
        AND status = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'destination', NULL,
        'status', 'rejected',
        'bet_id', NULL,
        'request_id', NULL,
        'reject_reason', 'duplicate_bet'
      );
    END IF;

    IF EXISTS (
      SELECT 1 FROM bet_requests
      WHERE member_id = p_member_id
        AND sporadic_pool_id = p_sporadic_pool_id
        AND status IN ('pending', 'partially_accepted')
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'destination', NULL,
        'status', 'rejected',
        'bet_id', NULL,
        'request_id', NULL,
        'reject_reason', 'duplicate_pending_request'
      );
    END IF;
  ELSE
    -- Base: unique by (member_id, match_id, bet_type) WHERE sporadic_pool_id IS NULL
    IF EXISTS (
      SELECT 1 FROM bets
      WHERE member_id = p_member_id
        AND match_id = p_match_id
        AND bet_type = p_bet_type
        AND sporadic_pool_id IS NULL
        AND status = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'destination', NULL,
        'status', 'rejected',
        'bet_id', NULL,
        'request_id', NULL,
        'reject_reason', 'duplicate_bet'
      );
    END IF;

    IF EXISTS (
      SELECT 1 FROM bet_requests
      WHERE member_id = p_member_id
        AND match_id = p_match_id
        AND bet_type = p_bet_type
        AND sporadic_pool_id IS NULL
        AND status IN ('pending', 'partially_accepted')
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'destination', NULL,
        'status', 'rejected',
        'bet_id', NULL,
        'request_id', NULL,
        'reject_reason', 'duplicate_pending_request'
      );
    END IF;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 6. Capacity check
  -- ──────────────────────────────────────────────────────────

  -- D7: Bookkeeper auto-accept override (Phase 1)
  IF p_created_by_role = 'bookkeeper' THEN
    v_outcome := 'accepted';
  ELSE
    -- Determine effective capacity
    IF v_is_pool THEN
      v_capacity_zhi := v_pool.capacity_zhi;
    ELSE
      v_capacity_zhi := v_match.capacity_zhi;
    END IF;

    -- R12.3: no capacity → auto-accept
    IF v_capacity_zhi IS NULL THEN
      v_outcome := 'accepted';
    ELSE
      -- Calculate current exposure on the requested side
      v_capacity_liang := v_capacity_zhi * 3;

      IF v_is_pool THEN
        SELECT COALESCE(SUM(accepted_amount), 0) INTO v_exposure_liang
        FROM bet_requests
        WHERE sporadic_pool_id = p_sporadic_pool_id
          AND team_bet_on = p_team_bet_on
          AND status IN ('partially_accepted', 'accepted');
      ELSE
        -- ⚠️ CRITICAL: sporadic_pool_id IS NULL filter (Priority 2 bug pattern)
        SELECT COALESCE(SUM(accepted_amount), 0) INTO v_exposure_liang
        FROM bet_requests
        WHERE match_id = p_match_id
          AND sporadic_pool_id IS NULL
          AND team_bet_on = p_team_bet_on
          AND status IN ('partially_accepted', 'accepted')
          AND bet_type != 'mandatory_self';
      END IF;

      v_available_liang := v_capacity_liang - v_exposure_liang;

      IF p_amount_liang <= v_available_liang THEN
        v_outcome := 'accepted';
      ELSE
        -- R15.3: soft ceiling — route to pending, do NOT reject
        v_outcome := 'pending';
      END IF;
    END IF;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 7. Write bet_request (always fresh — no "skip if exists" pattern)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO bet_requests (
    match_id, member_id, sporadic_pool_id, team_bet_on, bet_type,
    requested_amount, accepted_amount, status,
    created_by_role, created_via
  ) VALUES (
    p_match_id, p_member_id, p_sporadic_pool_id, p_team_bet_on, p_bet_type,
    p_amount_liang,
    CASE WHEN v_outcome = 'accepted' THEN p_amount_liang ELSE 0 END,
    v_outcome,
    p_created_by_role, p_created_via
  )
  RETURNING id INTO v_request_id;

  -- ──────────────────────────────────────────────────────────
  -- 8. Write bet (ONLY if accepted)
  -- ──────────────────────────────────────────────────────────
  IF v_outcome = 'accepted' THEN
    INSERT INTO bets (
      match_id, member_id, sporadic_pool_id, team_bet_on, amount_liang, bet_type,
      result, status,
      created_by_role, created_via
    ) VALUES (
      p_match_id, p_member_id, p_sporadic_pool_id, p_team_bet_on, p_amount_liang, p_bet_type,
      'pending', 'active',
      p_created_by_role, p_created_via
    )
    RETURNING id INTO v_bet_id;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 9. Return JSONB
  -- ──────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success', true,
    'destination', CASE WHEN v_outcome = 'accepted' THEN 'bets' ELSE 'bet_requests' END,
    'status', v_outcome,
    'bet_id', v_bet_id,
    'request_id', v_request_id,
    'reject_reason', NULL
  );
END;
$$;
