# Code Audit — Batch 1: Settlement Write Path

Cross-section review for silent errors and high-risk write paths. Risk-first batch order: **Settlement → Betting → Lifecycle**. Three-batch plan; this file covers Batch 1.

## Target classes (anchor for findings across all batches)
1. fire-and-forget Supabase calls
2. split non-atomic writes
3. calculation paths bypassing canonical helpers
4. status transitions that skip or contradict rules
5. cleanup/rollback gaps
6. direct table writes that bypass RPCs
7. read surfaces that disagree on source of truth
8. missing tests for money-state or status-state behavior

## Batch 1 scope
Files reviewed: `src/lib/settlement.ts`, `src/lib/settlement-helpers.ts`, `src/lib/settlement-actions.ts`, `src/app/matches/page.tsx`, `src/components/Bets/MatchSettlementReport.tsx`, plus `memory/rpcs/{submit,correct}_{match,pool}_result.sql`. Rules loaded: `R16-R22-settlement.md` + `canonical-rules-index.md`.

## Findings (6 total — 5 critical, 1 medium)

**1. Split non-atomic writes — RPC vs settlement persistence (critical)**
`src/app/matches/page.tsx:571/587/589`. `submit_match_result` commits, then settlement persistence runs from client. If persistence fails, match result remains; UI warns but DB is inconsistent. SQL: `memory/rpcs/submit_match_result.sql:29` (matches), `:39` (bets).
Fix path: atomic RPC OR durable repair state (`settlement_status` enum on matches). **Decision pending** — assistant recommended Option B (durable repair state); user has not ruled.

**2. Read surfaces disagree on source of truth (critical)**
`src/lib/settlement-actions.ts:46/54`, `src/components/Bets/MatchSettlementReport.tsx:86/140`. `match_settlements` can upsert while monthly `settlements` upsert fails. Report reads only `match_settlements` → match looks normal, monthly balance stale. Same root as Finding 1; same fix path.

**3. R21.5 double-calculation requirement not implemented (critical, verification pending)**
`src/lib/settlement-actions.ts:23/108`. Reviewer claims R21.5 requires calculation to run twice independently before confirmation. Memory ref: `memory/rules/R16-R22-settlement.md:169`. **Verify R21.5 verbatim before scoping** — phrase may mean (a) two isolated engines, (b) determinism check, or (c) primary + audit calc. Each implies different fix shape.

**4. Settled-as-terminal not enforced (critical)**
`src/lib/settlement-actions.ts:192/205`. R22.3 (`memory/rules/R16-R22-settlement.md:179`): settled is terminal. Monthly aggregation upserts by `(member_id, year, month)` without status check → result correction in March can overwrite settled February row.
Fix path: `WHERE status != 'settled'` guard at upsert OR explicit correction RPC. **Standalone, tractable; not started.**

**5. R21.6 inactive→referrer debt transfer not implemented (medium, deferral pending)**
`src/lib/settlement-actions.ts:170/193`. R21.6 (`memory/rules/R16-R22-settlement.md:170`): inactive member negative balance transfers to `referrer_id`. Monthly aggregation only sums by original `member_id`, no referrer lookup.
**Verify Phase 1 vs Phase 2 deferral status** in `memory/plan-defer-phase2.md` before treating as a finding vs a known TODO.

**6. correct_pool_result preserves stale bet state (critical) — IN PROGRESS**
`memory/rpcs/correct_pool_result.sql:35/45` (pre-fix). Pool correction flipped existing win/loss values; base correction (`correct_match_result.sql:41`) recomputes from `team_bet_on + p_new_winner`. Stale/pending rows preserved bad state through correction.
**Status:** SQL fix and test #17b in working tree (modified, uncommitted, NOT yet deployed to Supabase). Decisions during fix:
- Pool RPC kept `IS DISTINCT FROM` idempotency filter — diverges from base which updates/audits unconditionally. Cross-RPC asymmetry tracked, not fixed here.
- Predicate sync via comment, not CTE (base uses CTE).
- `bets_flipped` JSON return key kept (cosmetic mismatch — operation is no longer flip; no caller reads it).
- Test #17b: full-pool recomputation check on M(9) B-side + corrupted A-side bet.

## Cross-cutting tracked items (not Batch 1 findings, surfaced during review)
- Cross-RPC idempotency asymmetry: pool uses `IS DISTINCT FROM`, base does not. Resolve when Findings 1+2 architecture lands — pick one direction and apply both.
- Settlement is a multi-write pipeline (RPC → match_settlements → monthly settlements) with no atomicity boundary by design. Architectural fact, not a bug — but informs Phase 2 design and any new write paths.

## Status
- Finding 6 fix: working tree (commit + Supabase deployment pending)
- Findings 1+2: architecture decision pending (Option A atomic vs Option B durable repair state)
- Finding 3: rule-text verification pending
- Finding 4: standalone fix; not started
- Finding 5: deferral-status verification pending
- Batch 2 (Betting): not started
- Batch 3 (Lifecycle): not started
