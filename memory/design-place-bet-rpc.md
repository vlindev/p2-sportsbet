# place_bet RPC — Design Decisions (Session 77)

Architecture discussion for Priority 3 (Gap 3: Bet Pipeline Connection). All decisions confirmed. No code written yet.

## Core Problem

All 4 active bet write paths bypass `bet-pipeline.ts` and write directly to Supabase via sequential HTTP calls. Violates R15.3 (no capacity enforcement) and R27.1 (non-atomic dual writes). Orphaned `bet_request` records possible on partial failure.

## Confirmed Decisions

### Transaction model: server-side `place_bet` RPC
- One RPC handles entire bet write atomically: validate → route → capacity-check → write both tables
- Consistent with all 7 existing RPCs (submit_match_result, cancel_match, etc.)
- Application-layer option rejected — two HTTP calls can never be atomic

### One unified RPC (not two)
- Branches on `p_sporadic_pool_id IS NULL` for base vs pool
- Five differences (capacity source, R5.4 team restriction, duplicate shape, amount validation, bet_type) are IF/ELSE branches, not separate operations
- Qualification: holds if branching stays shallow. If pool rules diverge significantly, splitting may be warranted.

### Scope: paths 1-2 only
- Path 1 (base match new bet) + Path 2 (pool new bet): `place_bet` RPC, this session
- Path 3 (auto-placement): deferred — loop place_bet N times or dedicated batch RPC, assessed after place_bet works
- Path 4 (adjustAmount + swapTeam): reclassified to Priority 3b (`edit_bet` RPC, own design session)

### bet_config column: add now
- `ALTER TABLE matches ADD COLUMN bet_config TEXT NOT NULL DEFAULT 'standard' CHECK (bet_config IN ('standard', 'small'))`
- RPC reads from locked match row — no hidden assumption
- 小盤 activation checklist: self-bet creation must also read bet_config when checkbox is surfaced

### bet-pipeline.ts = client-side pre-validation
- `validateBetAmount()`, `canCancelBet()` provide fast UI feedback before RPC call
- RPC is the authority; client is advisory
- Drift risk acknowledged — client being stale produces worse UX, not incorrect data

### Bookkeeper auto-accept override (Phase 1)
- When `p_created_by_role = 'bookkeeper'`, skip capacity check and auto-accept
- No pending bet UI exists yet (Step 3b). Without override, over-capacity bets become invisible.
- Removal is part of Step 3b scope (not standalone)
- Capacity logic is fully built and testable via `p_created_by_role = 'member'`

### Error model
- `RAISE EXCEPTION` for truly invalid states (match not found, invalid enum, corrupted state)
- JSONB return with `success: false` for business rejections (duplicate, team restriction, capacity)
- Matches existing RPC pattern

### mandatory_self excluded
- Self-bets created at match creation and player replacement — both already atomic
- Routing through place_bet doesn't fix a real problem
- Revisit only if concrete use case emerges

### Audit logging: parameter yes, INSERT no
- `p_performed_by` in signature for forward compatibility
- No `audit_log` INSERT — bet creation has no "before" state, tables are their own creation trail
- Add audit when member self-service ships

### R5.4 team restriction is universal
- **No player exception.** Canonical text says "External bettors" but confirmed intent is: no one bets on opening team
- Opening team players are the house — they absorb risk
- Current `PoolBetSection.tsx` (lines 49-51, 67-69) is a bug — allows players to bet on opening team
- RPC enforces `p_team_bet_on != pool.opened_by_team` unconditionally
- Whether to update frozen canonical rule text or note correction elsewhere: NOT YET DECIDED

### Duplicate check: both tables
- Reject if active bet exists in `bets` OR non-terminal `bet_request` exists (`status IN ('pending', 'partially_accepted')`)
- Closes double-submission loophole before it occurs

## RPC Input Signature (confirmed)

```
p_match_id        UUID
p_member_id       UUID
p_team_bet_on     TEXT        -- 'A' or 'B'
p_amount_liang    INTEGER
p_bet_type        TEXT        -- 'mandatory_monday' | 'voluntary' (not mandatory_self)
p_sporadic_pool_id UUID       -- NULL for base match
p_created_by_role TEXT        -- 'bookkeeper' | 'member' | 'system'
p_created_via     TEXT        -- 'manual' | 'rule_engine' | 'api' etc
p_performed_by    TEXT        -- audit trail (forward compat)
```

## RPC Transaction Sequence (confirmed)

```
1. Lock match row (FOR UPDATE) + pool row if p_sporadic_pool_id IS NOT NULL
2. Validate match status
   - scheduled → allow all
   - betting_closed + bookkeeper → allow
   - betting_closed + non-bookkeeper → reject
   - active/completed/cancelled → reject
3. Validate inputs
   - p_team_bet_on: 'A' or 'B'
   - p_bet_type: valid enum (not mandatory_self)
   - p_amount_liang: > 0
   - If pool: R5.4 team restriction (unconditional — no player exception)
   - If pool: R11.2 amount (multiple of 3, range 3-150)
   - If base: R8.5/R11.1 amount against bet_config
4. Check duplicate
   - Active bet in bets OR non-terminal bet_request (pending/partially_accepted)
   - Scoped: base = member+match+bet_type WHERE pool IS NULL; pool = member+pool_id
5. Capacity check
   - Bookkeeper override: skip (Phase 1), auto-accept
   - No capacity (capacity_zhi IS NULL): auto-accept
   - Within capacity: auto-accept
   - Over capacity: route to pending
   - Scope query correctly: base = WHERE sporadic_pool_id IS NULL; pool = WHERE sporadic_pool_id = X
6. Write bet_request (always fresh, no "skip if exists" pattern)
7. Write bet (ONLY if accepted — not if pending)
8. Return JSONB result
```

## RPC Return Shape (confirmed)

```json
{
  "success": true/false,
  "destination": "bets" | "bet_requests",
  "status": "accepted" | "pending" | "rejected",
  "bet_id": "uuid | null",
  "request_id": "uuid | null",
  "reject_reason": "text | null"
}
```

## Priority 3b — edit_bet (discovered during discussion)

Path 4 (adjustAmount + swapTeam) was initially classified as "safe to leave" — proved wrong by code+rules check. Three violations:
1. `adjustAmount` can push capacity over limit (no check)
2. `adjustAmount` violates R13.3 (`accepted_amount > requested_amount` after 1→2 toggle)
3. `swapTeam` doesn't update `bet_requests.team_bet_on` — corrupts capacity tracking

Requires own `edit_bet` RPC: atomically update both tables, re-validate capacity, enforce R13.3, handle team swap capacity shift. Comparable complexity to `place_bet`. Own design session after `place_bet` ships.

## Capacity Overflow Approval (Step 3b spec)

Defined during this session — specification for pending bet approval UI:
- FIFO enforcement: oldest pending bet approved first
- Chronological constraint: cannot approve newer bet without approving all earlier ones
- Selective approval: bookkeeper may approve first N, leave rest pending/rejected
- Display: timestamp, member name, team side, amount, bet type — oldest to newest

## Sequencing

`place_bet` (paths 1-2) → `edit_bet` (path 4, Priority 3b) → auto-placement (path 3)
