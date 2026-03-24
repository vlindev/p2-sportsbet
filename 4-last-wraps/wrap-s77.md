# Last Wrap — Session 77 (2026-03-24)

## Duration: 6h 15m

## What Was Done

Pure architecture discussion and planning session. No code written, no schema changes, no files modified in `src/`.

### Priority 3 architecture discussion — 12 decisions confirmed

Full design session for Gap 3 (Bet Pipeline Connection). The system's bet routing engine (`bet-pipeline.ts`) is correctly implemented but never called — all four write paths bypass it and make non-atomic dual writes. Violates R15.3 (no capacity enforcement) and R27.1 (non-atomic transactions).

**Decision 1: Server-side `place_bet` RPC** — atomic bet creation in PostgreSQL. Application-layer option (keep two HTTP calls with cleanup) rejected because two HTTP calls can never satisfy R27.1.

**Decision 2: One unified RPC** — branches on `p_sporadic_pool_id IS NULL`. Five differences (capacity source, R5.4, duplicate shape, amount rules, bet_type) are IF/ELSE, not separate operations.

**Decision 3: Add `bet_config` column now** — `TEXT NOT NULL DEFAULT 'standard' CHECK (IN ('standard', 'small'))`. RPC reads from locked match row. Hardcoding 'standard' rejected — hidden assumption in financial code.

**Decision 4: Path 4 reclassified to Priority 3b** — adjustAmount and swapTeam initially classified as "safe to leave." Code+rules check proved wrong:
- adjustAmount can exceed capacity on constrained matches
- adjustAmount violates R13.3 (accepted_amount > requested_amount)
- swapTeam doesn't update bet_requests.team_bet_on (corrupts capacity tracking)
Needs own `edit_bet` RPC. Own design session after place_bet.

**Decision 5: Sequencing** — place_bet (paths 1-2) → edit_bet (path 4) → auto-placement (path 3).

**Decision 6: bet-pipeline.ts = client-side pre-validation** — advisory only, RPC is authority.

**Decision 7: Bookkeeper auto-accept override (Phase 1)** — skip capacity for bookkeeper role. No pending UI exists. Remove when Step 3b ships.

**Decision 8: Error model** — RAISE EXCEPTION for invalid, JSONB for business outcomes.

**Decision 9: mandatory_self excluded** — self-bets stay in existing atomic paths.

**Decision 10: p_performed_by included, audit_log INSERT skipped** — forward compatibility, no creation audit needed yet.

**Decision 11: R5.4 is universal** — no player exception. Opening team players are the house. Current PoolBetSection.tsx player exception is a bug. RPC enforces unconditionally.

**Decision 12: Duplicate check both tables** — bets (active) + bet_requests (pending/partially_accepted).

### Capacity overflow approval spec defined

For Step 3b (future): FIFO enforcement, chronological constraint (can't approve newer without approving all earlier), selective approval (approve first N, leave rest). This is the spec for the pending bet UI, not for this session's work.

### Implementation plan v1 → v2 → v3

User crafted v1. I evaluated and found 3 issues:
1. Pending vs rejected outcomes conflated (different DB effects)
2. Missing status validation test cases (betting_closed + non-bookkeeper, active/completed/cancelled)
3. Capacity query scoping not called out (Priority 2 bug pattern: sporadic_pool_id IS NULL filter)

v2 fixed all three in chat. v3 written to file as self-contained execution document for a fresh session: `memory/plan-priority3-place-bet.md`. Includes project context, files to load, current code behavior, all confirmed decisions with reasoning, full RPC spec, implementation phases, deferred items appendix.

## Decisions Made

1–12 listed above (all confirmed, none open within place_bet scope).

Open items NOT in place_bet scope:
- R5.4 canonical rule text update — raised but not decided (code fix is in scope, text update is not)
- edit_bet RPC design — problem confirmed, shape confirmed, design NOT done
- Auto-placement approach — deferred entirely

## Files Changed

### New files
- `memory/design-place-bet-rpc.md` — all confirmed decisions, RPC spec, return shape, 3b notes
- `memory/plan-priority3-place-bet.md` — v3 implementation plan, self-contained for fresh session

### Updated files
- `0-memory.md` — session header S77, Priority 3 design complete status, Priority 3b added to parked discussions
- `MEMORY.md` (auto-memory) — bet_config in matches data model (noted as not yet migrated), place_bet RPC reference, R5.4 universal correction, capacity overflow approval spec
- `CLAUDE.md` (project) — file directory: added design-place-bet-rpc.md and plan-priority3-place-bet.md

### No source code changes
No files in `src/` were modified. No schema migrations run. No RPCs deployed.

## Next Session

1. **Execute Priority 3** — follow `memory/plan-priority3-place-bet.md` step by step. The plan is self-contained. Phase 0 (grounding) → Phase 1 (schema) → Phase 2 (types) → Phase 3 (confirm contract) → Phase 4 (write SQL) → Phase 5 (deploy + verify) → Phase 6 (client wrapper) → Phase 7 (wire base bet) → Phase 8 (wire pool bet + R5.4 fix) → Phase 9 (regression) → Phase 10 (artifacts).
2. After place_bet ships: Priority 3b design session (edit_bet RPC).
3. S73 sporadic pool grouping redesign still pending (project CLAUDE.md directive active).
