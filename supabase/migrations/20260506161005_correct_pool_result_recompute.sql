CREATE OR REPLACE FUNCTION public.correct_pool_result(
  p_pool_id uuid,
  p_new_winner text,
  p_performed_by text DEFAULT 'bookkeeper'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
 v_pool sporadic_pools%ROWTYPE;
 v_updated_count INTEGER;
 v_winning_side TEXT;
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

 v_winning_side := CASE WHEN p_new_winner = 'team_a' THEN 'A' ELSE 'B' END;

 -- Audit: pool result correction
 INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
 VALUES (gen_random_uuid(), 'sporadic_pool', p_pool_id, 'pool_result_corrected',
   jsonb_build_object('result', v_pool.result),
   jsonb_build_object('result', p_new_winner),
   p_performed_by, now());

 UPDATE sporadic_pools SET result = p_new_winner WHERE id = p_pool_id;

 -- Audit: per-bet corrections (capture old values before recomputing)
 -- Keep this predicate in sync with the UPDATE predicate below.
 INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
 SELECT
   gen_random_uuid(), 'bet', b.id, 'pool_bet_result_corrected',
   jsonb_build_object('result', b.result),
   jsonb_build_object('result', CASE WHEN b.team_bet_on = v_winning_side THEN 'win' ELSE 'loss' END),
   p_performed_by, now()
 FROM bets b
 WHERE b.sporadic_pool_id = p_pool_id
   AND b.status = 'active'
   AND b.result IS DISTINCT FROM CASE WHEN b.team_bet_on = v_winning_side THEN 'win' ELSE 'loss' END;

 -- Recompute changed active pool bet results from team_bet_on + corrected winner
 UPDATE bets
 SET result = CASE WHEN team_bet_on = v_winning_side THEN 'win' ELSE 'loss' END
 WHERE sporadic_pool_id = p_pool_id
   AND status = 'active'
   AND result IS DISTINCT FROM CASE WHEN team_bet_on = v_winning_side THEN 'win' ELSE 'loss' END;
 GET DIAGNOSTICS v_updated_count = ROW_COUNT;

 RETURN jsonb_build_object('success', true, 'bets_flipped', v_updated_count);
END;
$$;
