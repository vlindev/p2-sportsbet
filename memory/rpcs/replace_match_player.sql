
DECLARE
 v_match RECORD;
 v_conflict_bet RECORD;
 v_old_bet_id UUID;
 v_old_share_bps INT;
 v_player_col TEXT;
BEGIN
 SELECT * INTO v_match
 FROM matches
 WHERE id = p_match_id
 FOR UPDATE;

 IF NOT FOUND THEN
   RAISE EXCEPTION 'Match not found: %', p_match_id;
 END IF;

 -- R25.1 relaxed: allow scheduled + betting_closed (R23.3: bookkeeper retains full modification power)
 IF v_match.status NOT IN ('scheduled', 'betting_closed') THEN
   RAISE EXCEPTION 'Player changes only allowed before match starts (current: %)', v_match.status;
 END IF;

 IF p_team_side NOT IN ('A', 'B') THEN
   RAISE EXCEPTION 'Invalid team_side: %', p_team_side;
 END IF;
 IF p_player_slot NOT IN ('player1', 'player2') THEN
   RAISE EXCEPTION 'Invalid player_slot: %', p_player_slot;
 END IF;

 v_player_col := 'team_' || LOWER(p_team_side) || '_' || p_player_slot || '_id';

 IF (p_team_side = 'A' AND p_player_slot = 'player1' AND v_match.team_a_player1_id != p_old_player_id)
   OR (p_team_side = 'A' AND p_player_slot = 'player2' AND v_match.team_a_player2_id != p_old_player_id)
   OR (p_team_side = 'B' AND p_player_slot = 'player1' AND v_match.team_b_player1_id != p_old_player_id)
   OR (p_team_side = 'B' AND p_player_slot = 'player2' AND v_match.team_b_player2_id != p_old_player_id)
 THEN
   RAISE EXCEPTION 'Old player % is not in slot % on team %', p_old_player_id, p_player_slot, p_team_side;
 END IF;

 SELECT id INTO v_conflict_bet
 FROM bets
 WHERE match_id = p_match_id
   AND member_id = p_new_player_id
   AND status = 'active'
   AND bet_type = 'voluntary'
   AND sporadic_pool_id IS NULL
 LIMIT 1;

 IF FOUND THEN
   RAISE EXCEPTION 'CONFLICT:Incoming player has active voluntary bet (bet_id: %)', v_conflict_bet.id;
 END IF;

 UPDATE bets
 SET status = 'voided', void_reason = 'player_changed'
 WHERE match_id = p_match_id
   AND member_id = p_old_player_id
   AND bet_type = 'mandatory_self'
   AND status = 'active'
   AND sporadic_pool_id IS NULL
 RETURNING id INTO v_old_bet_id;

 INSERT INTO bets (
   member_id, match_id, team_bet_on, amount_liang, bet_type,
   result, status, created_by_role, created_via
 ) VALUES (
   p_new_player_id, p_match_id, p_team_side, 5, 'mandatory_self',
   'pending', 'active', 'system', 'rule_engine'
 );

 IF p_team_side = 'A' AND p_player_slot = 'player1' THEN
   UPDATE matches SET team_a_player1_id = p_new_player_id WHERE id = p_match_id;
 ELSIF p_team_side = 'A' AND p_player_slot = 'player2' THEN
   UPDATE matches SET team_a_player2_id = p_new_player_id WHERE id = p_match_id;
 ELSIF p_team_side = 'B' AND p_player_slot = 'player1' THEN
   UPDATE matches SET team_b_player1_id = p_new_player_id WHERE id = p_match_id;
 ELSIF p_team_side = 'B' AND p_player_slot = 'player2' THEN
   UPDATE matches SET team_b_player2_id = p_new_player_id WHERE id = p_match_id;
 END IF;

 SELECT share_bps INTO v_old_share_bps
 FROM match_team_player_shares
 WHERE match_id = p_match_id
   AND match_side = p_team_side
   AND player_id = p_old_player_id
   AND context = 'base'
   AND sporadic_pool_id IS NULL;

 IF v_old_share_bps IS NOT NULL THEN
   DELETE FROM match_team_player_shares
   WHERE match_id = p_match_id
     AND match_side = p_team_side
     AND player_id = p_old_player_id
     AND context = 'base'
     AND sporadic_pool_id IS NULL;

   INSERT INTO match_team_player_shares (match_id, match_side, player_id, share_bps, context)
   VALUES (p_match_id, p_team_side, p_new_player_id, v_old_share_bps, 'base');
 END IF;

 INSERT INTO audit_log (entity_type, entity_id, action_type, old_value, new_value, performed_by)
 VALUES (
   'match',
   p_match_id,
   'player_replaced',
   jsonb_build_object(
     'player_id', p_old_player_id,
     'team_side', p_team_side,
     'player_slot', p_player_slot,
     'voided_bet_id', v_old_bet_id
   ),
   jsonb_build_object(
     'player_id', p_new_player_id,
     'team_side', p_team_side,
     'player_slot', p_player_slot,
     'share_bps', COALESCE(v_old_share_bps, 5000)
   ),
   p_performed_by
 );

 RETURN jsonb_build_object(
   'match_id', p_match_id,
   'old_player_id', p_old_player_id,
   'new_player_id', p_new_player_id,
   'team_side', p_team_side,
   'voided_bet_id', v_old_bet_id,
   'share_bps_transferred', COALESCE(v_old_share_bps, 5000)
 );
END;
