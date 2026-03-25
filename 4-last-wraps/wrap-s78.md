# Last Wrap — Session 78 (2026-03-25)

## Duration: 14h 29m

## What Was Done

**Priority 3 (`place_bet` RPC) — fully implemented and functionally tested.** Executed the S77 implementation plan (10 phases). No new architectural decisions — pure execution.

### Phase 1: Schema change
- Added `matches.bet_config TEXT NOT NULL DEFAULT 'standard' CHECK (IN ('standard','small'))` via SQL migration in Supabase.

### Phase 2: Type update
- Added `bet_config: "standard" | "small"` to `Match` type in `src/types.ts`.

### Phases 3–5: RPC authored, deployed, bug-fixed, verified
- `place_bet` RPC: atomic bet creation in PostgreSQL. 9 input params, JSONB return, 3 outcome categories (accepted/pending/rejected).
- **Bug found:** PL/pgSQL does NOT short-circuit `AND` for unassigned record fields. `IF v_is_pool AND v_pool.opened_by_team = X` crashes when `v_pool` was never assigned (base bet path). Fix: nested IF.
- **Test data issue:** Match 003 was in `completed` status from a previous session — reset to `scheduled`.
- **Supabase SQL Editor limitation:** Only shows last query result in a batch. Learned to use UNION ALL for combined verification.
- 14 isolated RPC test cases: 4 accepted, 1 pending, 6 rejected, 3 invalid — all pass.

### Phase 6: Client wrapper
- `placeBet()` added to `src/lib/betting-actions.ts` — typed discriminated union return (`PlaceBetResult`), Chinese error messages mapped from reject_reason codes.

### Phase 7: Rewire path 1 (base bet)
- `MatchBetEntry.tsx` `addBet()`: 28 lines dual-write → 11 lines single `placeBet()` call.

### Phase 8: Rewire path 2 (pool bet) + R5.4 fix
- `PoolBetSection.tsx` `addBet()` rewired to `placeBet()`.
- R5.4 client fix: player exception removed. Opening team button disabled for ALL members. Label: "開盤方 · 不可投注".

### Phase 9: Regression verification
- `tsc --noEmit` clean. Zero direct INSERTs in migrated paths. Deferred paths (3, 4) untouched.

### Functional testing (testplan)
- 18 browser test scenarios — all pass (happy path, input variations, edge cases, error states, scope protection, E2E workflow).

### Phase 10: Artifacts saved
- `memory/rpcs/place_bet.sql`, schema CSV updated, inventory updated, 0-memory.md status updated.

## Decisions Made

None new — all 12 decisions from S77 were executed as-is. No scope changes, no conflicts discovered.

## Bug Found

**PL/pgSQL AND short-circuit:** `IF v_is_pool AND v_pool.opened_by_team = X` crashes when v_pool is unassigned. Fix: nested IF. Written to Lessons Learned in MEMORY.md.

## Items Noted for Future Discussion

1. **Pool title UX** — show player names + full handicap info in pool section header
2. **Pool bet delete confirmation** — add modal to prevent accidental X-button deletes
3. Both added to 0-memory.md Parked Discussions under "Pool section UX improvements (S78)"

## Files Changed

### Source code
- `src/types.ts` — bet_config added to Match
- `src/lib/betting-actions.ts` — placeBet(), PlaceBetResult, REJECT_MESSAGES added
- `src/components/Bets/MatchBetEntry.tsx` — addBet() rewired, placeBet import
- `src/components/Bets/PoolBetSection.tsx` — addBet() rewired, R5.4 fix, playerIds/entryMemberIsPlayer removed

### New files
- `memory/rpcs/place_bet.sql` — canonical RPC reference
- `add-bet-config-column.sql` — executed migration (can clean up)
- `deploy-place-bet-rpc.sql` — deployed RPC (can clean up)
- `test-place-bet-rpc.sql` — test suite (can clean up)

### Memory/config updated
- `memory/schema/schema-columns.csv` — bet_config row
- `memory/inventory-list-of-files.md` — 4 new files, date updated, S77 files added
- `0-memory.md` — Priority 3 marked complete, pool UX items parked
- `MEMORY.md` (auto-memory) — bet_config migrated, place_bet implemented, R5.4 fixed, PL/pgSQL lesson

### Supabase changes
- `matches.bet_config` column added
- `place_bet` function deployed (CREATE OR REPLACE)

## Next Session

1. **Priority 3b design session** (`edit_bet` RPC) — adjustAmount/swapTeam have known rule violations. Comparable complexity to place_bet.
2. **S73 sporadic pool grouping redesign** — still pending (project CLAUDE.md directive active).
3. **Cleanup:** `add-bet-config-column.sql`, `deploy-place-bet-rpc.sql`, `test-place-bet-rpc.sql` can be archived or deleted.
4. **Pool UX improvements** — discuss player info in title + delete confirmation when appropriate.
5. **Remaining execution plan:** Step 3b-lite (capacity UI), Step 6 (weekly report), Step 7 (monthly settlement), Step 9 (auth).
