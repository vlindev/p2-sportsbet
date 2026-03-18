# Last Wrap — Session 73 (2026-03-18)

## Duration: 2h 38m

## What Was Done

### blastcheck Protocol — Designed, Written, Registered
Deep root cause analysis of why sporadic pool issues persist across sessions. Core finding: the SIP enforces quality on what you're building but has no mechanism to audit what you're NOT building. Sporadic pools share assumptions with base match code, but six sessions of redesign (S62–72) never checked whether changes applied to pool contexts too.

Designed the `blastcheck` protocol through multiple discussion rounds:
- Unit of analysis = assumptions, not files/components
- Scope follows shared assumptions, not technical layers
- Phases: frame the change (extract + type assumptions) → search and assess actual code → surface parity sweep → structured report
- SIP integration: automatic at Step 6b, conditional at Step 9b
- User wrote the final protocol; Claude evaluated and revised with 4 improvements

**Registered in 4 locations:** `~/.claude/codewords/blastcheck.md` (full protocol), `~/.claude/CLAUDE.md` (pointer), `CODEWORDS.md` (entry), project `CLAUDE.md` (SIP table + steps 6b/9b).

### First blastcheck Run — 9 Assumptions, 22 Findings
Ran blastcheck on sporadic pool drift. Found: 10 consistent, 8 needs update, 3 needs discussion, 1 source needs revision. Critical finding: pool result entry gating broken on completed matches.

### Code Fixes — Attempted, Then Fully Reverted
Applied 8 fixes to `matches/page.tsx` and `PoolCreationModal.tsx`. Fixes 1–6 were individually correct but fixes 7–8 (status reset on date edit + grouping logic) became increasingly reactive — each fix exposed a new edge case. After three failed attempts at the grouping logic, all code was reverted to session 72 state.

**Root cause of failure:** the matches page grouping logic uses different source arrays for different sections (`activeMatches` → overdue/today, `scheduledMatches` → weeks). Adding `completedWithPendingPools` to `currentMatches` (fix 2) created matches that didn't fit any existing group. Fix 8 tried to solve this but was patched incrementally instead of designed holistically. Three attempts, three different failures.

**Lesson captured:** `feedback_incremental_code_fixes.md` — when a fix creates a new edge case, stop and redesign. Don't stack reactive patches.

### Memory Cleanup
- Deleted `feedback_dev_server.md` — reasoning ("user likely has it running already") was invalid
- Created `feedback_incremental_code_fixes.md`

## Decisions Made

| # | Decision | Reasoning |
|---|----------|-----------|
| 1 | Don't add dev server to `p2` alias | Friction is one command; automation has downsides |
| 2 | blastcheck protocol approved | Full protocol written with gate-free design (run to completion, audit framing after) |
| 3 | Pool results enterable on completed matches | R5.7: pools settle independently. Fix verified but reverted with bundle. |
| 4 | Completed + pending pools stay in 當前 | Card should remain actionable until fully resolved. Fix correct but coupled with grouping — needs holistic design. |
| 5 | Pools creatable on active non-overdue matches | Sporadic pools are side bets proposed during the round. Overdue excluded. |
| 6 | Pool creation modal: dynamic labels, no (強隊) | Consistency with match creation form |
| 7 | Child entity pencil = child action, not parent | Pool card pencil should edit pool info, not parent match |
| 8 | Bet-exists guard needed for both match + pool edit | Design together — same logic applies to both. Added to parked discussions. |
| 9 | 當前 tab grouping must be exhaustive from single source | Every match in currentMatches must appear in exactly one group. Group by date, not status. |
| 10 | Overdue = all past-date matches in currentMatches | Not just active — any match needing action. Label may need broadening. |
| 11 | Today = date === today (strict) | Not ≤ today. Past matches go to overdue. |

## What's Backed Up
`archive/s73-reverted/` contains:
- `matches-page-s73.txt` — all 8 fixes applied (reference code)
- `PoolCreationModal-s73.txt` — edit mode added (reference code)
- `README-s73-revert.md` — detailed documentation of each fix, why reverted, design problems, and all open blastcheck findings

## Open Items for Next Session

### Must Do First — Sporadic Pool Fixes (design together, implement together)
All 8 blastcheck findings remain unaddressed. The critical coupling is between fix 2 (completedWithPendingPools in 當前) and the grouping logic. These must be designed as a unit:

1. **Grouping redesign** — single source (`currentMatches`), exhaustive groups, date-based (not status-based). Design decisions: overdue scope, today strictness, label changes.
2. **Pool result entry gating** — allow on completed matches (fix 1, verified correct)
3. **Pool creation on active matches** — three-item footer (fix 3, user-refined)
4. **Pool child card pencil** — resolved: one pencil top-right for correction. Unresolved: pool edit modal (fix 5+6)
5. **Pool creation modal labels** — dynamic 讓點數/讓洞數, no (強隊) (fix 4, trivial)
6. **Match status reset on date edit** — active → scheduled when date moves to future (fix 7, untested)
7. **Pool entry form position** — below bet columns, should be above (blastcheck finding #2)
8. **Pool bet column styling parity** — text-sm vs text-base, no hover (blastcheck finding #4)

Reference: `archive/s73-reverted/README-s73-revert.md` for full details + code reference files.

## 0-memory.md Updates
~ Update "Bets entry/report UI optimization" item: add S73 note about blastcheck run, attempted fixes, full revert, and reference to archive
+ Add blastcheck to project CLAUDE.md file directory table (already in SIP, needs load-trigger entry)

## Session Log Entry
| 73 | 2026-03-18 | 2h 38m | Designed blastcheck protocol (cross-context drift detection). First run: 9 assumptions, 22 findings on sporadic pool drift. Applied 8 code fixes — fixes 1–6 individually correct, fixes 7–8 (grouping logic) failed reactively (3 attempts). All code reverted to S72. blastcheck registered (codeword + SIP 6b/9b). Lesson: don't stack reactive fixes. Reference: archive/s73-reverted/. |
