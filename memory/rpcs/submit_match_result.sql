DECLARE
  v_match RECORD;
  v_winner_side TEXT;
  v_affected_bets INT;
BEGIN
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  IF v_match.status = 'completed' THEN
    RAISE EXCEPTION 'Match already completed';
  END IF;

  IF v_match.status != 'active' THEN
    RAISE EXCEPTION 'Match is not active (status: %)', v_match.status;
  END IF;

  IF p_winner NOT IN ('team_a', 'team_b') THEN
    RAISE EXCEPTION 'Invalid winner: %', p_winner;
  END IF;

  v_winner_side := CASE WHEN p_winner = 'team_a' THEN 'A' ELSE 'B' END;

  UPDATE matches
  SET result = p_winner, status = 'completed'
  WHERE id = p_match_id;

  WITH old_bets AS (
    SELECT id, result AS old_result, team_bet_on
    FROM bets
    WHERE match_id = p_match_id AND status = 'active' AND sporadic_pool_id IS NULL
  ),
  updated_bets AS (
    UPDATE bets
    SET result = CASE WHEN team_bet_on = v_winner_side THEN 'win' ELSE 'loss' END
    WHERE match_id = p_match_id AND status = 'active' AND sporadic_pool_id IS NULL
    RETURNING id, team_bet_on, result AS new_result
  ),
  bet_audit AS (
    INSERT INTO audit_log (entity_type, entity_id, action_type, old_value, new_value, performed_by)
    SELECT
      'bet', u.id, 'bet_result_set',
      jsonb_build_object('result', o.old_result),
      jsonb_build_object('result', u.new_result),
      p_performed_by
    FROM updated_bets u
    JOIN old_bets o ON u.id = o.id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_affected_bets FROM bet_audit;

  INSERT INTO audit_log (entity_type, entity_id, action_type, old_value, new_value, performed_by)
  VALUES (
    'match', p_match_id, 'match_result_submitted',
    jsonb_build_object('result', v_match.result, 'status', v_match.status),
    jsonb_build_object('result', p_winner, 'status', 'completed', 'affected_bets', v_affected_bets),
    p_performed_by
  );

  RETURN jsonb_build_object(
    'match_id', p_match_id,
    'previous_result', v_match.result,
    'new_result', p_winner,
    'affected_bets', v_affected_bets,
    'timestamp', now()
  );
END;