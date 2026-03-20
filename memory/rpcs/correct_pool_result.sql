

DECLARE
 v_pool sporadic_pools%ROWTYPE;
 v_updated_count INTEGER;
BEGIN
 SELECT * INTO v_pool FROM sporadic_pools WHERE id = p_pool_id FOR UPDATE;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('success', false, 'error', 'pool_not_found');
 END IF;

 IF v_pool.result NOT IN ('team_a', 'team_b') THEN
   RETURN jsonb_build_object('success', false, 'error', 'pool_not_completed',
     'current_result', v_pool.result);
 END IF;

 IF v_pool.result = p_new_winner THEN
   RETURN jsonb_build_object('success', false, 'error', 'same_result');
 END IF;

 IF p_new_winner NOT IN ('team_a', 'team_b') THEN
   RETURN jsonb_build_object('success', false, 'error', 'invalid_winner');
 END IF;

 -- Audit: pool result correction
 INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
 VALUES (gen_random_uuid(), 'sporadic_pool', p_pool_id, 'pool_result_corrected',
   jsonb_build_object('result', v_pool.result),
   jsonb_build_object('result', p_new_winner),
   p_performed_by, now());

 UPDATE sporadic_pools SET result = p_new_winner WHERE id = p_pool_id;

 -- Audit: per-bet corrections (capture old values before flipping)
 INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
 SELECT
   gen_random_uuid(), 'bet', b.id, 'pool_bet_result_corrected',
   jsonb_build_object('result', b.result),
   jsonb_build_object('result', CASE WHEN b.result = 'win' THEN 'loss' ELSE 'win' END),
   p_performed_by, now()
 FROM bets b
 WHERE b.sporadic_pool_id = p_pool_id AND b.status = 'active' AND b.result IN ('win', 'loss');

 -- Flip all pool bet results
 UPDATE bets SET result = CASE WHEN result = 'win' THEN 'loss' ELSE 'win' END
 WHERE sporadic_pool_id = p_pool_id AND status = 'active' AND result IN ('win', 'loss');
 GET DIAGNOSTICS v_updated_count = ROW_COUNT;

 RETURN jsonb_build_object('success', true, 'bets_flipped', v_updated_count);
END;
