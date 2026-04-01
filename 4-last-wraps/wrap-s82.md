# Last Wrap — Session 82 (2026-04-01)

## Duration: 5h 16m

## What Was Done

**Session theme: P7 bug fix planning — no code written. Critical review, plan rewrite, housekeeping.**

### 1. Code Audit (read-only) — 5 targeted investigations

Read and reported exact findings across `matches/page.tsx`, `submit_pool_result.sql`, `correct_pool_result.sql`, `MatchSettlementReport.tsx`, `CorrectionPreviewModal.tsx`, `SettlementSection.tsx`, `SettlementSummary.tsx`, `PoolReportHeader.tsx`, `ReportBetColumn.tsx`, and others per user request:

- `justCompleted`: mapped all 11 read/write/clear sites. Confirmed never cleared after `executeMatchCorrection`.
- `executeMatchCorrection` vs `executePoolCorrection`: confirmed asymmetry — pool calls `fetchAll()`, match does not.
- `submit_pool_result.sql` line 26: allows `'active'` and `'completed'`. `correct_pool_result.sql`: no match status check at all.
- `teamLabel`: defined once (line 723), 6 call sites, all in `matches/page.tsx`. Sort is status-based (not time-based).
- Report page: all A/B labels hardcoded. 13+ locations across 10 files inventoried.

### 2. Critical Review of User's P7 Bug Fix Plan

User presented a 5-fix plan. Issues found:

- **Fix 1:** Missing check of `correct_pool_result.sql` (no match status gate — different from submit). Function name/scope needs documentation.
- **Fix 2:** Proposed shared `handleCorrectionSuccess` not implementable — base and pool corrections use different state variables (`setSubmittingResult` vs `setSubmittingPoolResult`, `closeResultModal()` vs pool cleanup). Also: `openCorrectionModal` line 505 must keep `justCompleted` fallback for Inbox Zero edge case.
- **Fix 3:** Premise factually wrong — "preview"/"預覽" never appears in `CorrectionPreviewModal.tsx`. Actual problem: unlabeled `net_liang` values.
- **Fix 4:** Proposed sort rule matches neither existing consumer (matches page: status priority, report page: start_time). Blast radius: 13+ locations across 10 files. Partial application worse than current state.
- **Fix 5:** No issues.

### 3. Plan Rewrite

Rewrote full plan incorporating all feedback. Created `memory/plan-P7-bug-fixes.md` with context section for cold-start session alignment.

### 4. Key Decisions

1. **Fix 3 deferred** — User wants projected post-correction values, not labels on old numbers. Labeling = throwaway code. Option A (client-side `calculateMatchPayout` with before/after/delta) is the only path. ~1 session. Scoping question logged: modal currently has no access to bets/shares/billing config.
2. **Fix 4 deferred** — 13+ locations, 10 files, design decision (canonical sort order) not made. Own session with blastcheck. ~1–2 sessions.
3. **Plan execution scope: Fixes 1, 2, 5 only.** Fix 3 and 4 deferred with scope estimates.
4. **No shared correction handler** — base and pool corrections have incompatible state signatures.
5. **No new testplan for 1+2+5** — existing 19-scenario testplan covers these paths.
6. **Test after each fix individually** (3 then 4, not batched).

### 5. User's 3 Review Comments on Plan (incorporated)

- `completedId` removal: "search for all uses before removing" instead of assuming
- Fix 3 deferred note: added scoping question (modal has no bets/shares/billing config access)
- Validation #9: explicitly includes test #19 (end-to-end correction path)

### 6. Deepcheck — 5 items found, all resolved

- RPC count: "8 RPCs" → updated to acknowledge 9 files (rls_auto_enable utility)
- Bets component count: 15 → 13
- Plan file added to CLAUDE.md File Directory
- S73 warning moved from CLAUDE.md top-level to 0-memory.md Parked Discussions
- "What's Built (as of S81)" still accurate — no code written

### 7. Cleanup

- 4 executed migration SQLs → `archive/migrations/`
- `0-memory-backup-2026-03.md` (bonsai backup) → `archive/`
- Inventory file refreshed and verified (0 diff between disk and inventory)

### 8. Roadmap Written to TODO

13-step priority sequence written to 0-memory.md. Steps 1–2 are a prerequisite gate. Labels: P12 (overdue count), Step 3b-lite (capacity), P3c (auto-placement rewire).

## Files Created

- `memory/plan-P7-bug-fixes.md` — P7 bug fix implementation plan (self-contained for fresh sessions)

## Files Modified

- `0-memory.md` — RPC count, Bets component count, Parked Discussions (Fix 3+4 scope, S73 grouping, post-自動派注, sporadic pool edit mode), TODO roadmap rewritten
- `CLAUDE.md` — plan file added to File Directory, S73 warning section removed
- `memory/inventory-list-of-files.md` — refreshed from disk (verified 0 diff)

## Files Moved to Archive

- `memory/migrations/006_match_settlements.sql`
- `memory/migrations/007_settlement_detail.sql`
- `memory/migrations/007b_match_settlements_upsert_key.sql`
- `memory/migrations/007c_liang_columns_numeric.sql`
- `memory/0-memory-backup-2026-03.md`

## No Source Code Changed

Session 82 was entirely planning, review, and housekeeping. No `.ts`/`.tsx` files touched.

## Next Session

Start at roadmap step 1: execute `memory/plan-P7-bug-fixes.md` (Fixes 1, 2, 5). Then step 2: re-run testplan #1–19. Gate: if #16–18 fail or correction tests regress, do not proceed to Fix 3.
