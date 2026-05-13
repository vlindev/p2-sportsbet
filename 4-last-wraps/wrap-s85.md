# Session 85 — Settlement audit Batch 1 + Finding 6 fix + tooling hygiene

**Date:** 2026-05-13
**Duration:** n/a (timer not running)
**Commits:** 3af4d4a · 7b8095d · 2024815

---

## What happened

### 1. P7 hardening review (commit 3af4d4a)
User had hardened the settlement persistence + test harness; I reviewed and found two issues. User fixed both, then I verified.

- `matches/page.tsx`: `persistSettlementForMatch` / `persistSettlementForPool` now return `{success, error}`. Submit + correct paths for both base match and pool surface settlement-persist failures in the UI instead of console-only logging.
- `test-p7-settlement.mjs`: removed hardcoded URL/anon key, gated behind `P2_TEST_SUPABASE_URL` + `P2_TEST_SUPABASE_ANON_KEY` + `P2_TEST_PROJECT_REF` + `P2_ALLOW_DB_MUTATION="I_UNDERSTAND_THIS_MUTATES_TEST_DB"`. Imports real `calculateMatchPayout` / `ntdToLiang` from `src/lib/settlement.ts`. `restoreTestState()` + `withBillingConfigTemporarilyDeleted()` ensure shared config/test data restored via `finally`.
- `tests/match-domain.test.mjs`: 8 cases for `canEnterPoolResult`.

**Issues caught and fixed:**
- *Critical:* `data` reference at `test-p7-settlement.mjs:270` after destructure cleanup. Test #1 would always fail at runtime.
- *Minor:* `withBillingConfigTemporarilyDeleted` swallowed callback errors when restore also threw. Tightened.

### 2. AGENTS.md decision (commit 7b8095d)
Replaced auto-generated full Codex-substituted duplicate of CLAUDE.md (with broken `~/.Codex/...` path) with 5-line agent-agnostic pointer naming CLAUDE.md as single source of truth and instructing runtime tool-name translation.

### 3. Code audit — Batch 1: Settlement Write Path

**Plan:** 3 batches (Settlement → Betting → Lifecycle), risk-first, 8 target classes, per-finding format `file:line | target class | severity | evidence | recommendation`, per-batch memory file, soft-cap 8–10 findings, loop-back discipline.

**6 findings (5 critical, 1 medium) — `memory/audit-batch1-settlement.md`:**

1. **Split non-atomic writes (critical)** — RPC commits then settlement persistence runs from client. Same root as Finding 2.
2. **Read surfaces disagree (critical)** — `match_settlements` upsert can succeed while monthly `settlements` upsert fails; report only checks `match_settlements`.
3. **R21.5 double-calculation (critical, verification pending)** — re-read rule verbatim before scoping.
4. **R22.3 settled-as-terminal not enforced (critical)** — monthly upsert overwrites settled rows.
5. **R21.6 inactive→referrer debt transfer not implemented (medium, deferral pending)**.
6. **`correct_pool_result` preserves stale bet results (critical)** — fixed this session.

**Architecture recommendation for Findings 1+2:** Option B (durable repair state via `settlement_status` enum on matches) over Option A (atomic RPC — high cost, requires porting pure-TS engine to PL/pgSQL). Decision pending.

### 4. Finding 6 fix (commit 2024815)
Recompute from `team_bet_on + p_new_winner` instead of flipping prior result. Mirrors `correct_match_result`.

- `memory/rpcs/correct_pool_result.sql`: kept `IS DISTINCT FROM` idempotency filter (diverges from base — cross-RPC asymmetry tracked, not fixed). Sync comment between audit + UPDATE predicates.
- Test #17b: corrupts active pool bets, asserts all rows recomputed (not flipped). `allRecomputed` check across full pool.
- `bets_flipped` JSON return key kept (cosmetic; verified no caller reads it).
- `supabase/`: CLI scaffolded; migration `20260506161005_correct_pool_result_recompute.sql` is deployable wrapper.

**Deployment status: unverified.** Anon key can't introspect `pg_proc`. Verify via `supabase migration list --linked` (Path B) or test #17b end-to-end (Path A, recommended).

### 5. Bets landing page UX surfaced
User: "the landing page that I had for bets page is gone."
- Code intact (8 files). Filter is `scheduled OR betting_closed` only by S55 design.
- 0 matches in those statuses → empty state.
- Surfaces parked S83 discussion concretely.
- Option A (keep present-focused, add affordance to matches page) recommended over Option B (expand scope). Decision pending.

### 6. Live DB state
- 41 matches: 31 completed, 4 active, 6 cancelled, **0 scheduled/betting_closed**
- 447 base bets + 10 pool bets across completed matches
- 11 pools, 7 resolved
- Manual Finding 6 test candidate: `b15ff75e` "PD22 New" — only match with both pool bets and resolved pools (`91fb2e88` → team_b, `520717f6` → team_a).

---

## Open / unfinished

- Finding 6 deployment: unverified
- Bets landing page A vs B: undecided
- Findings 1+2 architecture: undecided (recommends B)
- Finding 3 (R21.5 verbatim): verification pending
- Finding 5 (R21.6 deferral): status pending
- Finding 4 standalone fix: not started
- Cross-RPC idempotency asymmetry: tracked
- Audit Batch 2 (Betting) + Batch 3 (Lifecycle): not started
