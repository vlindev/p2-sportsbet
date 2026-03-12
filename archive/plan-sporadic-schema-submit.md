---

## #5: Sporadic Pools — Schema + RPCs + UI

### 5.1 Schema Migration

**File:** `step5-sporadic-pools.sql`

```sql
-- 1. Expand sporadic_pools.result CHECK constraint
--    Old: team_a | team_b | pending
--    New: team_a | team_b | pending | cancelled | voided
--
--    cancelled = parent match cancelled (set by cancel_match RPC)
--    voided = pool independently voided by bookkeeper (R24.4 weather ruling)

ALTER TABLE sporadic_pools
DROP CONSTRAINT IF EXISTS sporadic_pools_result_check;

ALTER TABLE sporadic_pools
ADD CONSTRAINT sporadic_pools_result_check
CHECK (result IN ('team_a', 'team_b', 'pending', 'cancelled', 'voided'));

-- 2. Backfill: any existing sporadic_pools on cancelled matches
UPDATE sporadic_pools SET result = 'cancelled'
WHERE match_id IN (SELECT id FROM matches WHERE status = 'cancelled')
  AND result = 'pending';

-- FUTURE: When void_pool mechanism is built (R24.4 weather ruling),
-- run equivalent backfill for any independently voided pools:
-- UPDATE sporadic_pools SET result = 'voided'
-- WHERE [conditions TBD — no void mechanism exists yet];
-- Documenting intent so the gap is visible, not forgotten.
```

### 5.2 Type Update

In `src/types.ts`, update `SporadicPool.result`:

```typescript
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
```

### 5.3 RPC: submit_pool_result

**File:** Add to `step5-sporadic-pools.sql` (or separate `step5-pool-rpcs.sql`)

```sql
CREATE OR REPLACE FUNCTION submit_pool_result(
  p_pool_id UUID,
  p_winner TEXT  -- 'team_a' or 'team_b'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_pool sporadic_pools%ROWTYPE;
  v_match matches%ROWTYPE;
  v_winning_side TEXT;
  v_losing_side TEXT;
  v_updated_count INTEGER;
BEGIN
  -- Lock pool row
  SELECT * INTO v_pool FROM sporadic_pools WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'pool_not_found');
  END IF;

  -- Idempotency: already has result
  IF v_pool.result != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'pool_already_resolved',
      'current_result', v_pool.result);
  END IF;

  -- Validate winner value
  IF p_winner NOT IN ('team_a', 'team_b') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_winner');
  END IF;

  -- Guard: parent match must be active or completed
  SELECT * INTO v_match FROM matches WHERE id = v_pool.match_id;
  IF v_match.status NOT IN ('active', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'match_not_active_or_completed',
      'match_status', v_match.status);
  END IF;

  -- Determine sides
  v_winning_side := CASE WHEN p_winner = 'team_a' THEN 'A' ELSE 'B' END;
  v_losing_side := CASE WHEN p_winner = 'team_a' THEN 'B' ELSE 'A' END;

  -- Set pool result
  UPDATE sporadic_pools SET result = p_winner WHERE id = p_pool_id;

  -- Fan-out: set bet results for pool bets only
  -- Winners
  UPDATE bets SET result = 'win'
  WHERE sporadic_pool_id = p_pool_id AND status = 'active' AND team_bet_on = v_winning_side;

  -- Losers
  UPDATE bets SET result = 'loss'
  WHERE sporadic_pool_id = p_pool_id AND status = 'active' AND team_bet_on = v_losing_side;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Audit log entries (per bet)
  INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
  SELECT
    gen_random_uuid(),
    'sporadic_pool',
    p_pool_id,
    'pool_result_submitted',
    jsonb_build_object('result', 'pending'),
    jsonb_build_object('result', p_winner),
    'bookkeeper',
    now();

  INSERT INTO audit_log (id, entity_type, entity_id, action_type, old_value, new_value, performed_by, performed_at)
  SELECT
    gen_random_uuid(),
    'bet',
    b.id,
    'pool_bet_result_set',
    jsonb_build_object('result', 'pending'),
    jsonb_build_object('result', b.result),
    'bookkeeper',
    now()
  FROM bets b
  WHERE b.sporadic_pool_id = p_pool_id AND b.status = 'active' AND b.result != 'pending';

  -- Pool settlement is independent per R5.7. This RPC sets pool bet results only.
  -- Monthly settlement calculation reads these results on demand — no base match
  -- recalculation triggered.

  RETURN jsonb_build_object('success', true, 'bets_updated', v_updated_count);
END;
$$;
```

