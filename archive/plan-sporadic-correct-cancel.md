### 5.4 RPC: correct_pool_result

Same pattern as `correct_match_result` but for pools:

```sql
CREATE OR REPLACE FUNCTION correct_pool_result(
  p_pool_id UUID,
  p_new_winner TEXT  -- 'team_a' or 'team_b'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_pool sporadic_pools%ROWTYPE;
  v_new_winning_side TEXT;
  v_new_losing_side TEXT;
  v_updated_count INTEGER;
BEGIN
  -- Lock pool row
  SELECT * INTO v_pool FROM sporadic_pools WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'pool_not_found');
  END IF;

  -- Must have an existing result to correct
  IF v_pool.result NOT IN ('team_a', 'team_b') THEN
    RETURN jsonb_build_object('success', false, 'error', 'pool_not_completed',
      'current_result', v_pool.result);
  END IF;

  -- Must be different
  IF v_pool.result = p_new_winner THEN
    RETURN jsonb_build_object('success', false, 'error', 'same_result');
  END IF;

  -- Validate
  IF p_new_winner NOT IN ('team_a', 'team_b') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_winner');
  END IF;

  v_new_winning_side := CASE WHEN p_new_winner = 'team_a' THEN 'A' ELSE 'B' END;
  v_new_losing_side := CASE WHEN p_new_winner = 'team_a' THEN 'B' ELSE 'A' END;

  -- Audit: pool result correction
  INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
  VALUES (gen_random_uuid(), 'sporadic_pool', p_pool_id, 'pool_result_corrected',
    jsonb_build_object('result', v_pool.result),
    jsonb_build_object('result', p_new_winner),
    'bookkeeper', now());

  -- Flip pool result
  UPDATE sporadic_pools SET result = p_new_winner WHERE id = p_pool_id;

  -- Audit: per-bet corrections (before flipping, capture old values)
  INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
  SELECT
    gen_random_uuid(),
    'bet',
    b.id,
    'pool_bet_result_corrected',
    jsonb_build_object('result', b.result),
    jsonb_build_object('result', CASE WHEN b.result = 'win' THEN 'loss' ELSE 'win' END),
    'bookkeeper',
    now()
  FROM bets b
  WHERE b.sporadic_pool_id = p_pool_id AND b.status = 'active' AND b.result IN ('win', 'loss');

  -- Flip all pool bet results
  UPDATE bets SET result = CASE WHEN result = 'win' THEN 'loss' ELSE 'win' END
  WHERE sporadic_pool_id = p_pool_id AND status = 'active' AND result IN ('win', 'loss');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'bets_flipped', v_updated_count);
END;
$$;
```

### 5.5 RPC: cancel_match

Replaces the non-atomic two-write pattern in `matches/page.tsx:616-618`.

```sql
CREATE OR REPLACE FUNCTION cancel_match(
  p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_bets_voided INTEGER;
  v_requests_expired INTEGER;
  v_pools_cancelled INTEGER;
BEGIN
  -- Lock match row
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'match_not_found');
  END IF;

  -- Guard: only scheduled, betting_closed, or active can be cancelled (R23.7)
  IF v_match.status NOT IN ('scheduled', 'betting_closed', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status',
      'current_status', v_match.status);
  END IF;

  -- R24.1a: Set match status to cancelled
  UPDATE matches SET status = 'cancelled' WHERE id = p_match_id;

  -- R24.1b: Void ALL active bets on this match (base + pool)
  UPDATE bets SET status = 'voided', void_reason = 'match_cancelled'
  WHERE match_id = p_match_id AND status = 'active';
  GET DIAGNOSTICS v_bets_voided = ROW_COUNT;

  -- R24.1c: Expire all pending/partially_accepted bet_requests (base + pool)
  UPDATE bet_requests SET status = 'expired', status_reason = 'match_cancelled'
  WHERE match_id = p_match_id AND status IN ('pending', 'partially_accepted');
  GET DIAGNOSTICS v_requests_expired = ROW_COUNT;

  -- Cancel ALL sporadic pools on this match, regardless of current result.
  -- Pools with team_a/team_b results are also cancelled — their bets are voided above,
  -- so any previous result is moot. Setting to 'cancelled' makes the state explicit.
  UPDATE sporadic_pools SET result = 'cancelled'
  WHERE match_id = p_match_id AND result != 'cancelled';
  GET DIAGNOSTICS v_pools_cancelled = ROW_COUNT;

  -- Audit log
  INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
  VALUES (gen_random_uuid(), 'match', p_match_id, 'match_cancelled',
    jsonb_build_object('status', v_match.status),
    jsonb_build_object('status', 'cancelled',
      'bets_voided', v_bets_voided,
      'requests_expired', v_requests_expired,
      'pools_cancelled', v_pools_cancelled),
    'bookkeeper', now());

  RETURN jsonb_build_object('success', true,
    'bets_voided', v_bets_voided,
    'requests_expired', v_requests_expired,
    'pools_cancelled', v_pools_cancelled);
END;
$$;
```

### 5.6 Update Client Cancellation Code

In `src/app/matches/page.tsx`, find the non-atomic cancellation code — two separate Supabase writes: `.from("matches").update({ status: "cancelled" })` followed by `.from("bets").update({ status: "voided", void_reason: "match_cancelled" })`. Replace both writes with:

```typescript
const { data, error } = await supabase.rpc("cancel_match", { p_match_id: matchId });
```

Remove the old two-write pattern entirely.

