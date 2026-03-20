# Last Wrap — Session 75 (2026-03-20)

## Duration: 8h 28m (includes significant idle time — actual work shorter)

## What Was Done

### Full Read-Only System Audit
Entire codebase mapped before any further implementation. User directive: "map the full application code layer before doing any further work. Do not fix anything."

**Phase 1 — File inventory:** Read `memory/inventory-list-of-files.md`. Listed all 38 `src/` files by folder.

**Phase 2 — src/lib/ layer (9 files):** settlement.ts, bet-pipeline.ts, betting-actions.ts, auto-placement.ts, share-validation.ts, types.ts, settlement-helpers.ts, Bets/types.ts, BetsLanding/types.ts. Produced: file responsibilities, settlement trace, capacity trace, RPC sites, 7 gaps.

**Phase 3 — Component layer (10 files):** matches/page.tsx (1795 lines), bets/page.tsx, MatchBetEntry, PoolBetSection, MatchSettlementReport, SettlementSection, settlement-helpers, MatchListActions, PoolCreationModal, CloseBettingModal. Produced: 6 RPC call sites (all in matches/page.tsx), settlement invocation trace, pipeline usage (unused), pool filter trace (12 locations), match/pool result independence, 4 gaps.

**Phase 4 — Remaining 19 files:** All pages, components, contexts, nav. Produced: BetsLandingPage data flow, members/page settlement reads, OverdueCountContext logic, display-only confirmations, additional gaps.

**Phase 5 — Canonical rules (8 files):** All R1–R29 cluster files loaded.

**Phase 6 — 12-Gap rules compliance check:** Each gap assessed against canonical rules with verdicts.

**Phase 7 — Deep write-path traces:** BetEntryView.tsx, MemberMatchRow.tsx, MemberQuickActions.tsx.

**Phase 8 — Cross-reference against rules:** bet_type compliant, auto-accept partial violation, non-atomic writes violation, BetEntryView dead code.

### Priority Fix List Received
13 items produced with partner. 4 need design decisions (Priorities 3, 6, 7, 12).

### Priority 1 Completed
Duplicate RPCs cleaned in Supabase.

### Local Supabase Assets
- `memory/rpcs/` — 7 RPC SQL files (all business RPCs + rls trigger)
- `memory/schema/` — 3 CSV exports (columns, constraints, foreign keys)

### Priority 2 Verified
Gap 1 confirmed. Local copies updated with sporadic_pool_id IS NULL fix.

## Next Session
1. User applies Priority 2 fix in Supabase (submit_match_result + correct_match_result)
2. Run audit query to check for dirty pool bet results
3. Priority 4 (pool result error UI) and Priority 5 (SplitBar units) — quick fixes
4. Design decisions needed for Priorities 3, 6, 7, 12 before implementation
