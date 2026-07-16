# Wrap — Session 88 (2026-07-16, 0h 21m)

## Type
Short no-code session. Canonical rules navigation + index integrity check.

## What happened
1. **Opened `memory/canonical-rules.md`** — first via OS `open` (default app), then TextEdit, finally VS Code (`code`) per user request. File is 50KB / 667 lines, frozen master, R1–R29.
2. **Generated canonical rules table of contents** — 29 top-level sections (R1 DEFINITIONS … R29 SYSTEM MAINTAINER OVERRIDE) with line numbers.
3. **Cross-checked `canonical-rules-index.md` against the master** — full integrity audit:
   - **Numeric sub-rules (R1–R27, R29):** exact match, section by section. No missing or orphaned entries.
   - **Named procedure blocks:** master writes these as prose, index assigns convenience codes — all correctly mapped: `R15.CP` = CAPACITY CHECK PROCEDURE; `R21.P1/P2/RK/PF` = PASS 1 / PASS 2 / RAKE APPLICATION / PROVIDER FEE APPLICATION.
   - **R28 open questions:** all 15 present (OQ-1,2,3,4,5,5a,5b,5c,5d,6,7,8,9,10,11); statuses match (all RESOLVED except OQ-9 = "not a club rule / parked").
   - **Verdict: index is fully in sync with the master. Nothing to fix.**

## Finding (durable) — master file self-contradiction, NOT an index bug
The frozen master contradicts itself in two glossary definitions. The index faithfully mirrors the master, so the staleness lives in the master, not the index:
- **R1.3 (line 16)** defines the SPORADIC MODIFIER as "Stored as `is_sporadic` BOOLEAN" — but **R2.2 (line 46)** and **R5.12 (line 94)** mark `is_sporadic` DEPRECATED, replaced by counting rows in the `sporadic_pools` table.
- **R1.25 (line 38)** defines UNIT STEP as "Set per match via `bet_increment_liang`" — but **R2.6 (line 50)** and **R11.3 (line 183)** mark `bet_increment_liang` DEPRECATED (base-match amounts fixed at 1 or 2兩).

Cause: the R1 definitions section was written early and never revised when later rules deprecated those fields. Master is frozen → not edited. Flagged so a future coder who greps R1.3/R1.25 doesn't treat those dead fields as live. Clean fix if ever unfrozen: add "(deprecated — see R2.2 / R2.6)" pointers on R1.3 and R1.25.

## No source code changes. No git changes beyond memory/session-log.

## ⚠️ Housekeeping
- **0-memory.md now ~224 lines** — over the 200 limit. `bonsai` needed (flagged S87, still outstanding).

## Proposed 0-memory.md updates
- ~ Added one gotcha line (master R1.3/R1.25 stale field definitions).
- (No "What's Built" or TODO changes — no code touched.)

## Session-log one-liner
| 88 | 2026-07-16 | 0h 21m | No code. Opened canonical-rules.md (→VS Code) + built R1–R29 table of contents. Full integrity cross-check of `canonical-rules-index.md` vs frozen master: index is 100% in sync (all numeric sub-rules, the R15/R21 named procedure blocks, and all 15 R28 OQ items match). Surfaced a master-internal self-contradiction (not an index bug): R1.3 still defines `is_sporadic` and R1.25 still defines `bet_increment_liang`, both deprecated by later rules (R2.2/R5.12, R2.6/R11.3) — R1 glossary never revised. Master frozen, left as-is; noted as gotcha. ⚠️ 0-memory ~224 lines, bonsai outstanding. |
