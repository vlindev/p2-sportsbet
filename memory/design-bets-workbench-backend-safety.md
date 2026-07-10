# Bets Workbench + Backend Safety Notes

Created: 2026-05-22

## Decisions Implemented

- `/bets` remains the betting operations page, but the landing workbench now has three tabs: `賽事總覽`, `會員批次登錄`, `會員查詢`.
- `會員批次登錄` restores the old member-first LINE-entry workflow, but only the workflow shape was reused. The old direct `bet_requests` + `bets` batch insert was rejected because it bypasses the authoritative `place_bet` RPC.
- Batch entry submits one selected match at a time via `placeBet()`. This preserves DB/RPC validation and returns per-match results: accepted, pending, duplicate/skipped, error.
- Auto-placement now routes each generated mandatory Monday bet through `placeBet()` instead of direct dual inserts.
- 全額降注 now routes each affected bet through `editBet()` instead of direct `bets` + `bet_requests` updates.
- Blast-radius finding: pool bet deletion in `PoolBetSection.tsx` still directly deletes from `bets` and `bet_requests`. This needs a follow-up delete/void RPC decision; do not treat pool deletion as hardened.

## Safety Floor

- Added migration `supabase/migrations/202605220001_bets_workbench_safety_floor.sql`.
- Safe now: partial unique indexes for active base/pool bets, monthly settlement uniqueness, common query indexes, conditional NOT NULL tightening for nullable high-risk columns.
- Deferred until auth: RLS policy lockdown. Current app still uses anon client access; replacing allow-all policies with `auth.role() = 'authenticated'` would break the app before auth is built.
- Deferred backend write RPC: pool bet deletion/voiding. A UI-only confirmation modal is not enough because the underlying operation is still a two-table client write.

## Live Audit Limitation

- Attempted read-only live Supabase verification from this environment, but DNS failed for the project host (`getaddrinfo ENOTFOUND`). Migration is therefore based on checked-in schema exports and existing memory, not live introspection.
