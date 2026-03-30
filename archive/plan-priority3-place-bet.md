# Priority 3 Implementation Plan (v3)

> **Execution document for a fresh session.** This file contains everything needed to implement Priority 3 without prior conversation context. Read fully before writing any code.

---

## Context for Implementer

### What this project is
A golf club betting management tool (`p2.sportsbet`). Bookkeeper enters match data, bets, and results for 85 members. Financial system — real money, zero tolerance for calculation or data integrity errors. Built with Next.js + Tailwind + Supabase (PostgreSQL).

### What Priority 3 is
The system has a bet routing and capacity enforcement engine (`src/lib/bet-pipeline.ts`) that defines how bets should be validated, routed, and capacity-checked. **None of the active bet write paths call it.** All four paths write directly to Supabase via two sequential HTTP calls (`INSERT bet_requests`, then `INSERT bets`). This violates:

- **R15.3** — Over-capacity bets should route to `bet_requests` with `status = pending`. Currently all bets auto-accept regardless of capacity.
- **R27.1** — Bet acceptance must execute within a single serialized database transaction. Two sequential HTTP calls can fail between calls, leaving orphaned `bet_request` records with no corresponding `bet` — corrupting settlement.

### What this plan does
Build a `place_bet` Supabase RPC that handles bet creation atomically server-side. Rewire the two new-bet creation paths to call it. Leave edit paths and auto-placement for later phases.

---

## Files to Load Before Starting

Load these files before writing any code. They contain the rules, schema, and patterns needed for implementation.

### Required context
| File | Why |
|------|-----|
| `memory/design-place-bet-rpc.md` | All confirmed decisions, RPC spec, return shape |
| `memory/rules/R12-R15-bet-pipeline.md` | Pipeline routing (R12), bet lifecycle (R14), capacity rules (R15) |
| `memory/rules/R26-R29-system.md` | Attribution fields (R26), concurrency/locking (R27) |
| `memory/rules/R06-R11-betting-rules.md` | Amount validation (R8/R11), bet types |
| `memory/rules/R05-sporadic-pools.md` | Pool rules including R5.4 team restriction |
| `memory/rules/R23-R25-match-lifecycle.md` | Match status gating (R23.2/R23.3) |
| `memory/schema/schema-check-constraints.csv` | All DB CHECK constraints |

### Code to read
| File | Why |
|------|-----|
| `src/components/Bets/MatchBetEntry.tsx` | Path 1: base bet creation (lines 134–161), edit functions to NOT touch (lines 165–200) |
| `src/components/Bets/PoolBetSection.tsx` | Path 2: pool bet creation (lines 64–105), R5.4 bug (lines 49–51, 67–69) |
| `src/lib/betting-actions.ts` | Path 3 auto-placement (lines 87–134) — DO NOT MODIFY |
| `src/lib/bet-pipeline.ts` | Routing logic — becomes advisory, not authority |
| `src/types.ts` | All shared types (`Match`, `Bet`, `BetRequest`, `SporadicPool`) |
| `memory/rpcs/submit_match_result.sql` | **Style reference** — existing RPC pattern: FOR UPDATE lock, validation, multi-table write, JSONB return |
| `memory/rpcs/replace_match_player.sql` | **Style reference** — status validation, exception pattern |

---

## Current Code Behavior (what you are replacing)

### Path 1: Base match bet creation (`MatchBetEntry.tsx` lines 134–161)
```
1. Client-side duplicate check: query bets table
2. Check if accepted bet_request already exists — skip insert if so
3. INSERT into bet_requests (status='accepted', accepted_amount=entryAmount)
4. INSERT into bets (status='active', result='pending')
5. Clear form, refresh bets list
```
**Problems:** No capacity check. Two separate HTTP calls (non-atomic). Skips bet_request if one already exists (stale data pattern). No status validation. Hardcoded `bet_type='voluntary'`, `created_by_role='bookkeeper'`.

### Path 2: Pool bet creation (`PoolBetSection.tsx` lines 64–105)
```
1. Client-side R5.4 check — BUT allows player exception (bug)
2. Client-side amount validation (R11.2)
3. Client-side duplicate check: query bets table
4. Check if accepted bet_request already exists — skip insert if so
5. INSERT into bet_requests (status='accepted')
6. INSERT into bets (status='active', result='pending')
7. Clear form, refresh bets
```
**Problems:** Same as Path 1 plus: R5.4 player exception is a bug (players CAN bet on opening team, they should NOT be able to). No capacity check despite pools always having `capacity_zhi`.

### What changes after implementation
Both paths become: client-side advisory validation → single `supabase.rpc('place_bet', {...})` call → handle response (accepted/pending/rejected).

---

## Confirmed Decisions (all locked — do not reopen)

These were debated and decided in Session 77. Each includes the reasoning so you understand the intent, not just the rule.

### D1: Server-side `place_bet` RPC
Two HTTP calls can never be atomic. R27.1 requires a single serialized transaction. All 7 existing RPCs in this project handle critical multi-table writes server-side. Bet placement is the same category.

### D2: One unified RPC (not two separate for base/pool)
The core transaction is identical: lock → validate → capacity-check → write. The five differences between base and pool (capacity source, R5.4 restriction, duplicate shape, amount validation, bet_type) are IF/ELSE branches inside the same function. Two RPCs would duplicate all the shared logic.

### D3: Add `bet_config` column to `matches` now
The RPC needs to know standard vs small configuration to validate amounts (R8.5). Hardcoding `'standard'` in the RPC would create a hidden assumption in financial code. The column makes the RPC read from schema — no assumption. Migration: `ALTER TABLE matches ADD COLUMN bet_config TEXT NOT NULL DEFAULT 'standard' CHECK (bet_config IN ('standard', 'small'))`.

### D6: `bet-pipeline.ts` stays as client-side pre-validation
`validateBetAmount()` provides instant UI feedback before the network call. The RPC is the authority. If the client is stale, the user gets a slightly worse UX (rejection after network call instead of before), but never incorrect data.

### D7: Bookkeeper auto-accept override (Phase 1)
When `p_created_by_role = 'bookkeeper'`, skip capacity check and auto-accept. **Why:** No pending-bet approval UI exists yet. Without this override, an over-capacity bet creates a `bet_request` with `status='pending'` and no UI to see or act on it — an invisible bet. The override is removed when Step 3b (pending bet UI) ships.

### D8: Error model — exceptions vs JSONB
`RAISE EXCEPTION` for truly invalid states (match not found, bad enum, `mandatory_self` passed). JSONB return with `success: false` for business outcomes (duplicate, wrong team, capacity). Business rejections are valid results, not errors.

### D9: `mandatory_self` excluded
Self-bets are created at match creation (`matches/page.tsx` line 456) and player replacement (`replace_match_player` RPC). Both already work atomically. If `p_bet_type = 'mandatory_self'` is passed to `place_bet`, raise an exception.

### D10: `p_performed_by` parameter included, `audit_log` INSERT skipped
Every existing RPC takes `p_performed_by`. Include it for consistency and forward compatibility. But don't write to `audit_log` — bet creation has no "before" state. The `bets` and `bet_requests` tables with `created_at`/`created_by_role`/`created_via` are their own creation trail.

### D11: R5.4 team restriction is universal — no player exception
The canonical rule text says "External bettors MUST NOT bet on the team that opened the pool." The confirmed intent is: **NO ONE** can bet on the opening team. The opening team's players are the house — they absorb risk, they don't place bets against themselves. The current code in `PoolBetSection.tsx` (lines 49–51, 67–69) has a player exception. This is a bug. The RPC enforces `p_team_bet_on != pool.opened_by_team` unconditionally. The client-side validation must also be fixed to remove the player exception.

### D12: Duplicate check covers both `bets` and `bet_requests`
Reject if an active bet exists in `bets` OR a non-terminal `bet_request` exists (`status IN ('pending', 'partially_accepted')`). This prevents double-submission even when pending bets exist (post-Step 3b).

---

## RPC Specification

### Input signature
```sql
CREATE OR REPLACE FUNCTION place_bet(
  p_match_id         UUID,
  p_member_id        UUID,
  p_team_bet_on      TEXT,           -- 'A' or 'B'
  p_amount_liang     INTEGER,
  p_bet_type         TEXT,           -- 'mandatory_monday' | 'voluntary' (NOT mandatory_self)
  p_sporadic_pool_id UUID DEFAULT NULL, -- NULL = base match bet
  p_created_by_role  TEXT,           -- 'bookkeeper' | 'member' | 'system'
  p_created_via      TEXT,           -- 'manual' | 'rule_engine' | 'scheduled_job' | 'import' | 'api'
  p_performed_by     TEXT            -- audit trail (not written to audit_log in Phase 1)
) RETURNS JSONB
```

### Transaction sequence
```
1. Resolve operation type
   - base bet if p_sporadic_pool_id IS NULL
   - pool bet otherwise

2. Lock relevant records (FOR UPDATE)
   - Always lock match row
   - If pool bet: also lock pool row

3. Validate existence and match status
   - Match must exist
   - Pool must exist (if pool bet)
   - scheduled → allow all callers
   - betting_closed + bookkeeper → allow (R23.3)
   - betting_closed + non-bookkeeper → JSONB reject
   - active/completed/cancelled → JSONB reject

4. Validate inputs and business rules
   - p_team_bet_on must be 'A' or 'B'
   - p_bet_type must be valid enum — if 'mandatory_self', RAISE EXCEPTION
   - p_amount_liang must be > 0
   - If pool: team restriction R5.4 — p_team_bet_on != pool.opened_by_team (unconditional)
   - If pool: amount validation R11.2 — multiple of 3, range 3–150
   - If base: amount validation R8.5/R11.1 — read bet_config from locked match row
     - standard: 1 or 2 liang
     - small: 1 liang only

5. Duplicate check
   - Base: active bet in bets WHERE member_id + match_id + bet_type AND sporadic_pool_id IS NULL AND status='active'
   - Base: non-terminal bet_request WHERE member_id + match_id + bet_type AND sporadic_pool_id IS NULL AND status IN ('pending','partially_accepted')
   - Pool: active bet in bets WHERE member_id + sporadic_pool_id AND status='active'
   - Pool: non-terminal bet_request WHERE member_id + sporadic_pool_id AND status IN ('pending','partially_accepted')
   - If duplicate found → JSONB reject with reason

6. Capacity check
   - If p_created_by_role = 'bookkeeper' → SKIP capacity, auto-accept (Phase 1 override)
   - Determine effective capacity: pool = sporadic_pools.capacity_zhi; base = matches.capacity_zhi
   - If capacity IS NULL → auto-accept (R12.3)
   - Sum current exposure on p_team_bet_on side:
     ⚠️ CRITICAL SCOPING (Priority 2 bug pattern):
     - Base: SUM(accepted_amount) FROM bet_requests
       WHERE match_id = X AND sporadic_pool_id IS NULL
       AND team_bet_on = [side] AND status IN ('partially_accepted','accepted')
       AND bet_type != 'mandatory_self'
     - Pool: SUM(accepted_amount) FROM bet_requests
       WHERE sporadic_pool_id = X
       AND team_bet_on = [side] AND status IN ('partially_accepted','accepted')
     Without sporadic_pool_id IS NULL on base queries, pool bet_requests contaminate base capacity.
   - If p_amount_liang <= available → accept
   - If p_amount_liang > available → pending (R15.3: soft ceiling, do NOT reject)

7. Write bet_request
   - Always create a FRESH row (do NOT replicate the client-side "skip if accepted exists" pattern)
   - If accepted: status='accepted', accepted_amount=p_amount_liang, requested_amount=p_amount_liang
   - If pending: status='pending', accepted_amount=0, requested_amount=p_amount_liang

8. Write bet (ONLY if accepted — NOT if pending)
   - status='active', result='pending'
   - Copy all fields from input parameters

9. Return JSONB
```

### Return shape
Three distinct outcome types with different database effects:

| Outcome | bet_request written? | bet written? | Return |
|---------|---------------------|-------------|--------|
| **Accepted** | Yes (`status='accepted'`) | Yes | JSONB `success=true, status='accepted', bet_id=X, request_id=X` |
| **Pending** | Yes (`status='pending'`, `accepted_amount=0`) | No | JSONB `success=true, status='pending', request_id=X, bet_id=null` |
| **Rejected** | No | No | JSONB `success=false, status='rejected', reject_reason=X` |
| **Invalid** | No (rolled back) | No | `RAISE EXCEPTION` |

```sql
RETURN jsonb_build_object(
  'success',       boolean,
  'destination',   'bets' | 'bet_requests',
  'status',        'accepted' | 'pending' | 'rejected',
  'bet_id',        uuid or null,
  'request_id',    uuid or null,
  'reject_reason', text or null
);
```

---

## Objective

Implement `place_bet` RPC and rewire paths 1–2 to call it.

### This phase covers
- Schema migration (`bet_config` column)
- Type updates
- `place_bet` RPC authoring and deployment
- Shared client wrapper
- Rewiring `MatchBetEntry.tsx` creation path (path 1)
- Rewiring `PoolBetSection.tsx` creation path (path 2)
- Client-side R5.4 fix (remove player exception)
- Regression verification

### This phase does NOT include
- **Priority 3b / `edit_bet` RPC** — `adjustAmount` and `swapTeam` have known rule violations but require their own design session. Do not touch these functions.
- **Path 3 auto-placement redesign** — `runAutoPlacementAction()` in `betting-actions.ts` stays as-is. Decision pending on whether to loop `place_bet` or build a batch RPC.
- **Pending approval UI / Step 3b** — The bookkeeper auto-accept override exists specifically so this plan ships without pending UI.
- **小盤 activation** — Adding the column is in scope. Changing self-bet amounts or adding a UI toggle is not.
- **Canonical rule text rewrite for R5.4** — The correction is implemented in code. Whether to update the frozen canonical-rules.md file is undecided.
- **Audit log INSERT for creation events** — `p_performed_by` parameter is included. The INSERT is deferred to member self-service (Step 11).

---

## Success Criteria

Implementation is complete only when all of the following are true:

1. `matches.bet_config` exists: `TEXT NOT NULL DEFAULT 'standard' CHECK (IN ('standard', 'small'))`.
2. `place_bet` RPC exists and is deployed to Supabase.
3. `place_bet` performs the full creation flow atomically in one transaction.
4. Only paths 1 (base bet creation) and 2 (pool bet creation) are rewired.
5. `mandatory_self` creation remains untouched in existing paths.
6. Pool opening-team restriction (R5.4) is enforced universally — both server RPC and client-side.
7. Client-side validation is advisory only; server is authoritative.
8. Three outcome categories (accepted/pending/rejected) are correctly distinguished at every layer.
9. Regression verification confirms no orphaned records, no remaining dual-writes for paths 1–2, correct duplicate/capacity/status behavior.

---

## Implementation Sequence

### Phase 0 — Pre-implementation grounding

**Goal:** Lock scope before code changes.

**Tasks:**
1. Load all files listed in "Files to Load Before Starting."
2. Read the two creation paths being migrated (`MatchBetEntry.tsx` lines 134–161, `PoolBetSection.tsx` lines 64–105).
3. Read at least one existing RPC for style reference (`memory/rpcs/submit_match_result.sql`).
4. Confirm the four write paths and mark each:
   - Path 1 (base bet creation in `MatchBetEntry.tsx`): **migrated now**
   - Path 2 (pool bet creation in `PoolBetSection.tsx`): **migrated now**
   - Path 3 (auto-placement in `betting-actions.ts`): **deferred**
   - Path 4 (adjustAmount/swapTeam in `MatchBetEntry.tsx`): **deferred — Priority 3b**

**Guardrail:** Do not begin implementation until scope is explicitly restated.

---

### Phase 1 — Schema change

**Goal:** Add `bet_config` column.

**Tasks:**
1. Write migration SQL:
   ```sql
   ALTER TABLE matches
   ADD COLUMN bet_config TEXT NOT NULL DEFAULT 'standard'
   CHECK (bet_config IN ('standard', 'small'));
   ```
2. Write to a `.sql` file in project root. Open in VS Code (not TextEdit — TextEdit strips `$$` delimiters).
3. Run in Supabase SQL Editor.
4. Verify: column exists, default applied, existing rows valid, CHECK constraint active.
5. Update `memory/schema/schema-columns.csv`.

**Guardrails:**
- Additive only. No other schema changes.
- Do not change self-bet creation logic (line 455 of `matches/page.tsx` still hardcodes 5兩).

---

### Phase 2 — Type update

**Goal:** Align TypeScript types with new schema.

**Tasks:**
1. Add `bet_config: "standard" | "small"` to `Match` type in `src/types.ts`.
2. Run `npx tsc --noEmit` to confirm no type errors.

**Guardrails:**
- No speculative types.
- No unrelated type changes.

---

### Phase 3 — Confirm RPC contract

**Goal:** Verify the RPC spec matches the confirmed decisions before writing SQL.

**Tasks:**
1. Re-read the RPC specification section of this document.
2. Confirm the input signature, transaction sequence, and return shape are understood.
3. Confirm the three outcome categories (accepted/pending/rejected) and their different database effects.

**Output:** Explicit confirmation that the contract is understood. No code yet.

**Guardrails:**
- Do not start SQL until the contract is confirmed.
- One RPC, not two.

---

### Phase 4 — Author `place_bet` SQL

**Goal:** Implement the authoritative transactional creation flow.

**Tasks:** Write the RPC following the transaction sequence in the spec above. Key implementation notes:

**On status validation (step 3):**
- `scheduled` → allow all callers
- `betting_closed` + `p_created_by_role = 'bookkeeper'` → allow (R23.3: bookkeeper retains full power)
- `betting_closed` + non-bookkeeper → JSONB reject (not exception — this is a valid business outcome)
- `active` / `completed` / `cancelled` → JSONB reject

**On R5.4 (step 4, pool bets):**
- Check `p_team_bet_on != v_pool.opened_by_team` unconditionally.
- No player exception. No check against match player IDs.
- If violated → JSONB reject with reason.

**On amount validation (step 4):**
- Base bets: read `v_match.bet_config` from the locked match row.
  - `'standard'`: `p_amount_liang IN (1, 2)`
  - `'small'`: `p_amount_liang = 1`
  - Do NOT hardcode `'standard'`.
- Pool bets: `p_amount_liang % 3 = 0 AND p_amount_liang >= 3 AND p_amount_liang <= 150` (R11.2)

**On duplicate check (step 5):**
- Check BOTH `bets` table (active status) AND `bet_requests` table (non-terminal status).
- Scoped correctly:
  - Base: `WHERE member_id = X AND match_id = X AND bet_type = X AND sporadic_pool_id IS NULL`
  - Pool: `WHERE member_id = X AND sporadic_pool_id = X`

**On capacity (step 6):**
- If `p_created_by_role = 'bookkeeper'` → skip capacity entirely, go to accept path.
- Effective capacity: pool bets use `sporadic_pools.capacity_zhi`; base bets use `matches.capacity_zhi`.
- If capacity IS NULL → auto-accept (R12.3).
- **Critical scoping** — exposure queries must filter by context:
  - Base: `WHERE match_id = X AND sporadic_pool_id IS NULL AND team_bet_on = [side] AND status IN ('partially_accepted', 'accepted') AND bet_type != 'mandatory_self'`
  - Pool: `WHERE sporadic_pool_id = X AND team_bet_on = [side] AND status IN ('partially_accepted', 'accepted')`
  - **The `sporadic_pool_id IS NULL` filter on base queries is non-negotiable.** Omitting it was the exact bug that caused Priority 2 — pool bets contaminated base match result fan-out in `submit_match_result` and `correct_match_result`.
- If within capacity → accept. If over → pending (R15.3: soft ceiling, route to pending, do NOT reject).

**On writing bet_request (step 7):**
- Always create a fresh row. The current client code checks for existing accepted `bet_request` and skips if found — do NOT replicate this. Each placement = one new `bet_request`.
- Accepted: `status='accepted'`, `accepted_amount=p_amount_liang`, `requested_amount=p_amount_liang`
- Pending: `status='pending'`, `accepted_amount=0`, `requested_amount=p_amount_liang`

**On writing bet (step 8):**
- ONLY if the outcome is accepted. Pending bets have no `bets` row.
- `status='active'`, `result='pending'`

**On mandatory_self:**
- If `p_bet_type = 'mandatory_self'` → `RAISE EXCEPTION 'mandatory_self not supported via place_bet'`.

**Output:** Save to `memory/rpcs/place_bet.sql`.

**Guardrails:**
- No hidden hardcodes that schema should own.
- No client-trust assumptions.
- No partial write path — both tables in one transaction.
- No separate base/pool RPCs.

---

### Phase 5 — Deploy and verify RPC in isolation

**Goal:** Prove the RPC works before touching UI code.

**Tasks:**
1. Deploy `place_bet` to Supabase SQL Editor.
2. Confirm function exists with expected signature.
3. Run manual test calls for all outcome categories.

**Required test cases:**

**Accepted cases** (both `bet_request` and `bet` created):
- Valid base bet on standard match
- Valid pool bet on opposing team
- Bookkeeper over-capacity bet → auto-accepted (Phase 1 override)
- `betting_closed` + bookkeeper → accepted (R23.3)

**Pending cases** (`bet_request` created with `status='pending'`, NO `bet` row):
- Non-bookkeeper bet exceeding capacity
- Verify: `bet_request` exists with `status='pending'` and `accepted_amount=0`, `bet` row does NOT exist

**Business rejection cases** (nothing written to either table):
- Duplicate base bet (active bet exists in `bets`)
- Duplicate pool bet
- Duplicate pending request (non-terminal `bet_request` exists)
- Invalid amount (e.g., 2兩 on a `'small'` config match — temporarily update a test match)
- Invalid pool team (betting on opening team)

**Status rejection cases** (nothing written to either table):
- `betting_closed` + non-bookkeeper → rejected
- `active` match → rejected
- `completed` match → rejected
- `cancelled` match → rejected

**Invalid-state cases** (exception raised, transaction rolled back):
- Nonexistent match ID
- Nonexistent pool ID
- `p_bet_type = 'mandatory_self'`

**Verify for each category:**
- **Accepted:** both rows exist, values correct, response matches contract
- **Pending:** `bet_request` exists with `status='pending'`, no `bet` row, `bet_id` is null in response
- **Rejected:** no rows in either table, `reject_reason` in response
- **Invalid:** no rows, exception returned

**Guardrail:** Do not wire UI before isolated RPC verification passes.

---

### Phase 6 — Shared client wrapper

**Goal:** One call surface for bet creation.

**Tasks:**
1. Add `placeBet()` function to `src/lib/betting-actions.ts`.
2. Wrapper calls `supabase.rpc('place_bet', {...})`.
3. Handles:
   - Supabase-level errors (network, RPC exception) → error message
   - JSONB business responses → return structured result to caller
4. Distinguishes accepted / pending / rejected for the caller.
5. Returns typed result the UI components can act on.

**Guardrails:**
- No direct RPC calls from components — both paths use this wrapper.
- No legacy dual-write fallback.
- No silent swallowing of rejection reasons.

---

### Phase 7 — Rewire path 1: base match bet

**Goal:** Replace dual-write in `MatchBetEntry.tsx` with RPC call.

**Tasks:**
1. Locate `addBet()` function (lines 134–161).
2. Remove:
   - Client-side duplicate check against `bets` table (lines 137–141)
   - "Skip if accepted bet_request exists" check (lines 142–153)
   - Direct `bet_requests` INSERT (lines 147–152)
   - Direct `bets` INSERT (lines 154–158)
3. Replace with `placeBet()` call from the shared wrapper.
4. Keep `validateBetAmount()` from `bet-pipeline.ts` as pre-call advisory check (fast UI feedback).
5. Handle response:
   - Accepted → clear form, refresh bets (existing behavior)
   - Rejected → show error message (map `reject_reason` to Chinese)
   - Pending → should not occur in Phase 1 (bookkeeper override), but handle gracefully
6. Preserve existing form state management, refresh, and UX.

**Do NOT touch:**
- `adjustAmount()` (lines 165–183)
- `swapTeam()` (lines 185–200)
- `toggleEditSide()` and edit mode logic
- Auto-placement logic (`runAutoPlacement` function)

**Verify:**
- No direct INSERT to `bets` or `bet_requests` remains in the creation path.
- Amount validation still instant in UI (advisory).
- Form clears on success.
- Rejection displays clearly.

---

### Phase 8 — Rewire path 2: pool bet

**Goal:** Replace dual-write in `PoolBetSection.tsx` with RPC call AND fix R5.4 bug.

**Tasks:**
1. Locate `addBet()` function (lines 64–105).
2. Remove:
   - "Skip if accepted bet_request exists" check (lines 82–94)
   - Direct `bet_requests` INSERT (lines 87–93)
   - Direct `bets` INSERT (lines 95–100)
3. Replace with `placeBet()` call.
4. **Fix client-side R5.4 validation:**
   - Current code (lines 49–51): `const entryMemberIsPlayer = entryMemberId ? playerIds.has(entryMemberId) : true;`
   - Current code (lines 67–69): allows players to bet on opening team
   - **Remove the player exception entirely.** The check should be: if `entryTeam === openingSide` → block, regardless of whether the member is a player.
   - Update error message accordingly.
5. Keep client-side amount validation (R11.2) as advisory.
6. Handle response same as Phase 7.

**Verify:**
- Pool creation uses RPC only.
- Opening-team restriction holds for ALL members (players and non-players).
- Duplicate and amount handling surfaces correctly.

**Guardrails:**
- Do not invent new pool UX.
- Do not start pending-flow UI.

---

### Phase 9 — Regression verification

**Goal:** Prove correctness and no regressions.

**Run:**
- `npx tsc --noEmit`
- Existing test suites if relevant (`tests/bet-pipeline.test.ts`)
- Manual end-to-end tests

**Regression checklist:**

**Atomicity:**
- Accepted: both `bet_request` (accepted) and `bet` (active) exist with consistent values
- Pending: `bet_request` exists with `status='pending'`, NO `bet` row
- Rejected: nothing written to either table
- No case leaves orphaned accepted `bet_request` without a `bet`

**Duplicate logic:**
- Second base bet submission blocked
- Second pool bet submission blocked
- Duplicate pending `bet_request` blocked

**Capacity:**
- Non-bookkeeper over-capacity → pending (bet_request written, no bet)
- Bookkeeper over-capacity → accepted (Phase 1 override)
- No capacity (`capacity_zhi IS NULL`) → accepted

**Status gating:**
- `scheduled` → accepted for all roles
- `betting_closed` + bookkeeper → accepted
- `betting_closed` + non-bookkeeper → rejected
- `active` / `completed` / `cancelled` → rejected for all roles

**Pool rules:**
- Opening-team bet rejected universally (no player exception)

**Validation:**
- Invalid amount rejected server-side even if client validation bypassed
- `bet_config = 'small'` rejects 2兩 (temporarily update test match)

**UI continuity:**
- Success clears form
- Success refreshes bets list
- Rejections are visible with understandable messages

**Scope protection:**
- `mandatory_self` still works via existing creation paths
- Path 4 (`adjustAmount` / `swapTeam`) still unchanged
- Path 3 (auto-placement in `betting-actions.ts`) still unchanged

**Output:** Regression summary (passed / failed / deferred / follow-up).

---

### Phase 10 — Save artifacts

**Goal:** Preserve implementation outputs.

**Save/update:**
- `memory/rpcs/place_bet.sql` — the deployed RPC
- `memory/schema/schema-columns.csv` — regenerate with new column
- `memory/inventory-list-of-files.md` — update if new files created

**Record explicitly:**
- Paths 1–2: migrated to `place_bet` RPC
- Path 3: deferred, auto-placement unchanged
- Path 4: deferred, Priority 3b (`edit_bet`)
- Phase 1 bookkeeper override: exists and must be removed ONLY with Step 3b UI work
- R5.4 client-side fix: player exception removed from `PoolBetSection.tsx`

---

## Non-Negotiable Rules During Execution

1. Do not expand scope into `edit_bet` or touch `adjustAmount`/`swapTeam`.
2. Do not touch auto-placement architecture.
3. Do not leave any migrated creation path on sequential dual writes.
4. Do not hardcode business assumptions that schema should represent.
5. Do not trust client validation for correctness.
6. Do not treat business rejections as exceptions.
7. Do not add `audit_log` writes for creation in this phase.
8. Do not centralize `mandatory_self` into `place_bet`.
9. Do not split into two RPCs unless a concrete blocker proves unified branching is no longer shallow.
10. If implementation reveals a conflict with confirmed decisions, **stop and surface it** rather than quietly deviating.

---

## Deliverable Format

For each phase, report:

```
Phase X — [name]
Files changed:
What was implemented:
What was verified:
Open issues:
Scope changes: none / explicit
Decision conflicts found: none / explicit
```

---

## Appendix A — Deferred Items

Items that were decided or noted during the Session 77 architecture discussion. None of these are in scope for this plan. They are recorded here for completeness and to prevent scope drift.

### Priority 3b: `edit_bet` RPC (DECIDED — design session needed)

**Status:** Problem identified, architectural shape confirmed, RPC design NOT done.

**What:** `adjustAmount()` and `swapTeam()` in `MatchBetEntry.tsx` (lines 165–200) have three rule violations:
1. `adjustAmount` can push a capacity-constrained match over its limit (no check)
2. `adjustAmount` violates R13.3 — makes `accepted_amount > requested_amount` after 1→2 toggle
3. `swapTeam` updates `bets.team_bet_on` but not `bet_requests.team_bet_on` — corrupts future capacity calculations

**Decided:** Needs its own `edit_bet` RPC. Comparable complexity to `place_bet`. Must atomically update both tables, re-validate capacity, enforce R13.3, handle team swap capacity shift.

**Sequencing:** After `place_bet` ships. `place_bet` establishes the transaction patterns that `edit_bet` follows.

**Not decided:** Input signature, transaction sequence, return shape, whether adjustAmount and swapTeam are one RPC or two, how capacity re-validation works after an edit, whether the bookkeeper override applies to edits, whether pool bet edits are in scope (pools currently have delete-only, no edit).

### Path 3: Auto-placement (DEFERRED — assess after `place_bet`)

**Status:** Not designed. Decision pending.

**What:** `runAutoPlacementAction()` in `src/lib/betting-actions.ts` (lines 87–134) does batch dual-writes for Monday auto-placed bets. Same non-atomic pattern as paths 1–2.

**Options:** (a) Loop `place_bet` N times (20–30 calls, each locking the match row), or (b) dedicated `auto_place_bets` batch RPC. Monday matches have `capacity_zhi = NULL` (R9.5), so routing always auto-accepts.

**When:** After `place_bet` is working and proven.

### Capacity overflow approval workflow (DECIDED — Step 3b specification)

**Status:** Rules defined, UI not designed, not built.

**What:** When the bookkeeper auto-accept override is removed (Step 3b), over-capacity bets will go to pending. The bookkeeper approves them with these rules:
- FIFO enforcement: oldest pending bet approved first
- Chronological constraint: cannot approve a newer bet without first approving all earlier ones
- Selective approval: bookkeeper may approve the first N and leave the rest pending or rejected
- Display: placement timestamp, member name, team side, amount, bet type — oldest to newest

**When:** Step 3b (pending bet UI).

### R5.4 canonical rule text (NOT DECIDED)

**Status:** Question raised, no conclusion.

**What:** The canonical rule text in `memory/canonical-rules.md` says "External bettors MUST NOT bet on the team that opened the pool." The confirmed intent is universal — no one, including players. The code fix is in scope for this plan. Whether to update the frozen canonical text file or note the correction elsewhere was raised but not resolved.

**When:** Discuss next session or when convenient. Does not block implementation.

### 小盤 activation (DECIDED — not now)

**Status:** Schema readiness is in scope (adding `bet_config` column). Activation is not.

**What:** When the 小盤 checkbox is surfaced in the match creation form, self-bet creation must also read `bet_config` (currently hardcodes 5兩 at line 455 of `matches/page.tsx`; small matches should use 3兩 per R8.5).

**When:** When the bookkeeper asks for it. Not Phase 1 priority.

### Audit log for bet creation (DECIDED — not now)

**Status:** Deferred to member self-service.

**What:** `p_performed_by` is in the RPC signature for forward compatibility. The `audit_log` INSERT is skipped because bet creation has no "before" state, and the tables are their own creation trail.

**When:** Step 11 (member bet-placement). When "who placed this" becomes a trust question.

---

## Appendix B — Updated Priority List

| Priority | Description | Status |
|----------|-------------|--------|
| 1 | Duplicate RPCs in Supabase | Done (S75) |
| 2 | submit/correct_match_result pool contamination | Done (S75) |
| **3** | **`place_bet` RPC — paths 1–2** | **This plan** |
| **3b** | **`edit_bet` RPC — path 4 (adjustAmount + swapTeam)** | **Design session needed** |
| 4 | Pool result silent failure | Done (S76) |
| 5 | SplitBar unit mismatch | Done (S76) |
| 6–13 | Remaining gaps | Per original priority list |
