# Last Wrap — Session 79 (2026-03-30)

## Duration: 1h 49m

## What Was Done

**Session theme: Bet write path hardening — all creation and edit paths now route through atomic RPCs.**

### 1. Reboot + Cleanup
- Full reboot after 5-day gap: `tsc --noEmit` clean, dev server started, all 3 pages return 200.
- Cleanup: deleted 3 executed SQL files (`add-bet-config-column.sql`, `deploy-place-bet-rpc.sql`, `test-place-bet-rpc.sql`), archived completed plan (`plan-priority3-place-bet.md` → `archive/`), updated inventory (date: 2026-03-30).
- Audit on cleanup: build pass, 0 issues.

### 2. Discovered 2 missed bet write paths
- Checked all 4 active bet write paths. Paths 1+2 (MatchBetEntry, PoolBetSection) already used `placeBet()` RPC (S78). Paths 3+4 (MemberMatchRow → quickPick, MemberQuickActions → bulkBuy) still did direct dual `.insert()` calls.
- Root cause: S77 design session enumerated "4 paths" but numbered them differently (1=base bet, 2=pool bet, 3=auto-placement, 4=edit). The landing page's quickPick and bulkBuy were not in the enumeration — missed, not deferred.

### 3. Rewired quickPick + bulkBuy + 3 data consistency fixes
- `MemberMatchRow.tsx → quickPick()`: rewired to `placeBet()` with duplicate/pending handling.
- `MemberQuickActions.tsx → bulkBuy()`: rewired to per-match `placeBet()` loop, skips duplicates gracefully.
- `MatchListActions.tsx → handleAutoPlace()`: added fresh bet fetch before auto-placement (matching MatchBetEntry pattern — stale prop could cause wrong balancing).
- `MatchBetEntry.tsx → swapTeam()`: added `bet_requests.team_bet_on` sync (matching adjustAmount pattern).
- Blastcheck: 10 consistent, 0 needs update, 1 known deferred (auto-placement direct inserts, S77).

### 4. Research for prioritization
- Loaded and reported on 3 candidate next items with exact sources and line numbers: Priority 3b (`edit_bet` RPC), S73 sporadic pool grouping redesign, Step 3b-lite (capacity UI).
- Answered 2 canonical rule questions: Q1 (amount adjust on capacity-constrained match = design decision, rules don't prescribe for edits), Q2 (team swap = rare/exceptional, R23.9 "error correction only").

### 5. Priority 3b implemented — `edit_bet` RPC
- Created `memory/rpcs/edit_bet.sql` (140 lines): atomic RPC for adjustAmount + swapTeam. Validates bet state, row locks bet + match, syncs both `bets` and `bet_requests`, preserves R13.3 invariant by updating both `requested_amount` and `accepted_amount`.
- Created `editBet()` client wrapper in `src/lib/betting-actions.ts`.
- Rewired `adjustAmount()` and `swapTeam()` in `MatchBetEntry.tsx` — no direct Supabase updates remain.
- Three deviations from user's plan (all bug fixes): `IS DISTINCT FROM` → `IS NOT DISTINCT FROM` (logic error), added `bet_type = 'voluntary'` (S69 decision), wrapper returns error result instead of throwing (component expects `result.success`).
- Fixed R13.3 drift in `BettingActions.tsx → runBulkReduce()`: added `requested_amount: 1` alongside existing `accepted_amount: 1`.
- RPC deployed to Supabase, tested live: adjust_amount (1→2) and swap_team (B→A) both return `success: true` with correct old/new values, both tables verified in sync, test data reverted.
- Blastcheck: 8 consistent, 0 needs update, 1 resolved (bulkReduce R13.3 fixed).
- Final audit: `tsc --noEmit` pass, `next build` pass, all 6 source files + SQL file read in full, 0 issues.

### 6. Final verification: 9/9 checks pass
All bet write and edit paths confirmed routed through RPCs. No direct inserts or updates to bets/bet_requests remain in components (except auto-placement in betting-actions.ts — known deferred Path 3).

## Decisions Made

1. **quickPick/bulkBuy were missed, not deferred** — S77's "4 paths" enumeration didn't include landing page paths. Corrected this session.
2. **`IS DISTINCT FROM` → `IS NOT DISTINCT FROM`** — User's plan had a logic error in the bet_request lookup. `IS DISTINCT FROM` means "not equal"; we need null-safe equality (`IS NOT DISTINCT FROM`). Corrected.
3. **`bet_type = 'voluntary'` in edit_bet RPC** — Plan omitted it but existing code sets it on every edit (S69 resolved decision). Included to preserve behavior.
4. **editBet wrapper returns structured error, not throw** — Plan said `throw error` but component checks `result.success`. Throwing would create uncaught exception. Changed to match `placeBet` pattern.
5. **bulkReduce R13.3 fix** — Adding `requested_amount: 1` alongside `accepted_amount: 1` prevents `edit_bet` from hard-failing on subsequently edited bets (the RPC guards `requested_amount != accepted_amount`).

## Files Changed

### Source code
- `src/components/BetsLanding/MemberMatchRow.tsx` — rewired quickPick to placeBet
- `src/components/BetsLanding/MemberQuickActions.tsx` — rewired bulkBuy to placeBet
- `src/components/BetsLanding/MatchListActions.tsx` — added fresh fetch in handleAutoPlace
- `src/components/Bets/MatchBetEntry.tsx` — rewired adjustAmount/swapTeam to editBet
- `src/components/Bets/BettingActions.tsx` — added requested_amount to bulkReduce
- `src/lib/betting-actions.ts` — added editBet() wrapper + EditBetResult type

### New files
- `memory/rpcs/edit_bet.sql` — canonical RPC reference (140 lines)

### Deleted
- `add-bet-config-column.sql`, `deploy-place-bet-rpc.sql`, `test-place-bet-rpc.sql`

### Moved
- `memory/plan-priority3-place-bet.md` → `archive/`

### Updated
- `memory/inventory-list-of-files.md` — refreshed, date 2026-03-30

### Supabase changes
- `edit_bet` function deployed (CREATE OR REPLACE)

## Next Session

1. **S73 sporadic pool grouping redesign** — still pending (CLAUDE.md directive active). Holistic redesign of matches page grouping logic, then reapply 6 verified fixes as unit.
2. **Step 3b-lite** — capacity check + pending bet UI. Correctness issue, not just scaling.
3. **Step 6** — weekly report (`/reports` page)
4. **Steps 7, 9** — monthly settlement, auth
5. **Auto-placement (Path 3)** — last remaining direct-insert path in betting-actions.ts. Needs batch RPC or looped placeBet.
6. **9 days to blackout** (Apr 8). Steps 6, 7, 9 estimated 5–7 sessions total.
