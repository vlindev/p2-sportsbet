# Last Wrap — Session 76 (2026-03-23)

## Duration: 2h 29m

## What Was Done

### Priority 4 (Gap 8): Pool result RPC silent failure — FIXED
`submitPoolResult()` in `matches/page.tsx` logged errors to console but showed no user-facing message. Fix reuses `resultError`/`setResultError` (base and pool modals are mutually exclusive). Three changes: error setter in handler (line 580), clear on both modal open triggers (lines 949, 966), error display JSX in pool modal (lines 1772-1774).

### Priority 5 (Gap 11): SplitBar liang vs zhi unit mismatch — FIXED
`MatchListRow.tsx` summed `amount_liang` (liang) and passed to `SplitBar.tsx` which displayed against `capacity` (zhi). R6.2: 1 zhi = 3 liang. Fix: `Math.floor((amountA ?? 0) / 3)/{capacity}支` in SplitBar lines 50-51.

**Critical incident:** Claude hallucinated "1 zhi = 10 liang" before being told to read canonical rules. Caught before implementation. Led to Canonical Source Protocol (see below).

### Housekeeping: BetEntryView.tsx deleted
Confirmed no imports anywhere in codebase. 199 lines of dead code removed (old member-first entry view, non-atomic writes, superseded by MatchBetEntry.tsx + landing page). Removed from inventory file.

### Canonical Source Protocol added to project CLAUDE.md
Mandatory: must read and quote canonical source before using any rule-governed value (numeric constants, conversion factors, enums, units, defaults, limits, algorithm behavior). Full hierarchy: index → topic clusters → master file. Never infer. Feedback memory saved: `feedback_canonical_source_mandatory.md`.

### Project file discovery rule added to project CLAUDE.md
Load `memory/inventory-list-of-files.md` before any cross-file task (blast radius checks, new features, cold orientation, file existence checks). Discovery only — don't read all listed files.

### Wrap/bonsai restructuring
- Wrap step 4: removed rolling wraps cleanup (was "delete oldest until 5 remain")
- Wrap step 7: added inventory update (auto-regenerate inventory at session end)
- Bonsai Phase 5: added rolling wraps cleanup (delete 5 oldest when count exceeds 10, sorted by session number)
- Removed misplaced standalone "Inventory maintenance" section from project CLAUDE.md (was floating outside wrap, would never execute)

### P3 Preparation: bet-pipeline analysis
Read `bet-pipeline.ts` and `MatchBetEntry.tsx`. Answered 6 questions mapping `routeBet()` inputs against `addBet()` data:
- All `BetInput` and `MatchContext` fields available EXCEPT `betConfig` (standard/small) — doesn't exist in Match type or DB schema
- `addBet()` bypasses `routeBet()` entirely — writes to both tables unconditionally
- Two separate non-atomic INSERTs (bet_requests conditional, bets always)
- `routeBet()` returns `{ destination, autoAccept, requiresCapacityCheck, rejected, rejectReason }` — addBet ignores all of this

### Deepcheck
Found and fixed 3 minor staleness issues: MEMORY.md BetEntryView reference, 0-memory component count (16→15), session header (S75→S76).

## Decisions Made
1. Reuse `resultError` for pool modal (mutually exclusive modals, no new state variable)
2. Canonical Source Protocol is mandatory (triggered by hallucinated conversion factor)
3. Wrap cleanup → bonsai (lean wrap, cleanup when user chooses to run bonsai)
4. Inventory update inside wrap step 7 (not standalone section)

## Files Changed
- `src/app/matches/page.tsx` — P4: 3 edits (error handling for pool result)
- `src/components/BetsLanding/SplitBar.tsx` — P5: liang→zhi conversion
- `src/components/Bets/BetEntryView.tsx` — deleted
- `CLAUDE.md` (project) — Canonical Source Protocol, file discovery rule
- `~/.claude/CLAUDE.md` — wrap steps 4 (simplified) and 7 (inventory)
- `~/.claude/codewords/bonsai.md` — Phase 5 (rolling wraps cleanup)
- `memory/inventory-list-of-files.md` — header + BetEntryView removed
- `0-memory.md` — P2/P4/P5 status, session number, file count
- `MEMORY.md` — BetEntryView reference, feedback memory index
- `feedback_canonical_source_mandatory.md` — new

## Next Session
1. **Priority 3** — connecting bet-pipeline.ts to active write paths. Major design session. 4 write paths (addBet in MatchBetEntry, addBet in dead BetEntryView [now deleted — only 3 remain], adjustAmount, swapTeam + auto-placement). Dependent gaps: 9, 10, 13, 7. Missing input: `betConfig` needs design decision.
2. Key analysis from S76 ready: routeBet() inputs fully mapped against addBet() available data.
3. S73 sporadic pool grouping redesign still pending (project CLAUDE.md directive active).
