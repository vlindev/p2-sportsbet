

DECLARE
 v_match matches%ROWTYPE;
 v_bets_voided INTEGER;
 v_requests_expired INTEGER;
 v_pools_cancelled INTEGER;
BEGIN
 SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('success', false, 'error', 'match_not_found');
 END IF;

 IF v_match.status NOT IN ('scheduled', 'betting_closed', 'active') THEN
   RETURN jsonb_build_object('success', false, 'error', 'invalid_status',
     'current_status', v_match.status);
 END IF;

 UPDATE matches SET status = 'cancelled' WHERE id = p_match_id;

 UPDATE bets SET status = 'voided', void_reason = 'match_cancelled'
 WHERE match_id = p_match_id AND status = 'active';
 GET DIAGNOSTICS v_bets_voided = ROW_COUNT;

 UPDATE bet_requests SET status = 'expired', status_reason = 'match_cancelled'
 WHERE match_id = p_match_id AND status IN ('pending', 'partially_accepted');
 GET DIAGNOSTICS v_requests_expired = ROW_COUNT;

 UPDATE sporadic_pools SET result = 'cancelled'
 WHERE match_id = p_match_id AND result != 'cancelled';
 GET DIAGNOSTICS v_pools_cancelled = ROW_COUNT;

 INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
 VALUES (gen_random_uuid(), 'match', p_match_id, 'match_cancelled',
   jsonb_build_object('status', v_match.status),
   jsonb_build_object('status', 'cancelled',
     'bets_voided', v_bets_voided,
     'requests_expired', v_requests_expired,
     'pools_cancelled', v_pools_cancelled),
   p_performed_by, now());

 RETURN jsonb_build_object('success', true,
   'bets_voided', v_bets_voided,
   'requests_expired', v_requests_expired,
   'pools_cancelled', v_pools_cancelled);
END;
