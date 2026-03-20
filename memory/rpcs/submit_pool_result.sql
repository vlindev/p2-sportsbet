

DECLARE
 v_pool sporadic_pools%ROWTYPE;
 v_match matches%ROWTYPE;
 v_winning_side TEXT;
 v_losing_side TEXT;
 v_winners_updated INTEGER;
 v_losers_updated INTEGER;
BEGIN
 SELECT * INTO v_pool FROM sporadic_pools WHERE id = p_pool_id FOR UPDATE;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('success', false, 'error', 'pool_not_found');
 END IF;

 IF v_pool.result != 'pending' THEN
   RETURN jsonb_build_object('success', false, 'error', 'pool_already_resolved',
     'current_result', v_pool.result);
 END IF;

 IF p_winner NOT IN ('team_a', 'team_b') THEN
   RETURN jsonb_build_object('success', false, 'error', 'invalid_winner');
 END IF;

 SELECT * INTO v_match FROM matches WHERE id = v_pool.match_id;
 IF v_match.status NOT IN ('active', 'completed') THEN
   RETURN jsonb_build_object('success', false, 'error', 'match_not_active_or_completed',
     'match_status', v_match.status);
 END IF;

 v_winning_side := CASE WHEN p_winner = 'team_a' THEN 'A' ELSE 'B' END;
 v_losing_side := CASE WHEN p_winner = 'team_a' THEN 'B' ELSE 'A' END;

 UPDATE sporadic_pools SET result = p_winner WHERE id = p_pool_id;

 UPDATE bets SET result = 'win'
 WHERE sporadic_pool_id = p_pool_id AND status = 'active' AND team_bet_on = v_winning_side;
 GET DIAGNOSTICS v_winners_updated = ROW_COUNT;

 UPDATE bets SET result = 'loss'
 WHERE sporadic_pool_id = p_pool_id AND status = 'active' AND team_bet_on = v_losing_side;
 GET DIAGNOSTICS v_losers_updated = ROW_COUNT;

 -- Audit: pool-level entry
 INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
 VALUES (gen_random_uuid(), 'sporadic_pool', p_pool_id, 'pool_result_submitted',
   jsonb_build_object('result', 'pending'),
   jsonb_build_object('result', p_winner),
   p_performed_by, now());

 -- Audit: per-bet entries
 INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
 SELECT
   gen_random_uuid(), 'bet', b.id, 'pool_bet_result_set',
   jsonb_build_object('result', 'pending'),
   jsonb_build_object('result', b.result),
   p_performed_by, now()
 FROM bets b
 WHERE b.sporadic_pool_id = p_pool_id AND b.status = 'active' AND b.result != 'pending';

 RETURN jsonb_build_object('success', true, 'bets_updated', v_winners_updated + v_losers_updated);
END;
