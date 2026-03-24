# p2.sportsbet — Project Instructions

## Session Start — Auto Load

At the start of every session, silently read:
1. `0-memory.md` — project state, TODO, what's built (changes every wrap)
2. Last-wrap file (path in 0-memory.md Session Config) — previous session summary
3. `memory/architecture-brief.md` — technical backbone: hard problems, risk analysis, replacement cost

---

## File Directory — Load by Topic

All project memory files and when to load them. When a topic comes up mid-session, scan this table and load the matching file BEFORE responding. If unsure whether a file is relevant, load it — the cost of one read is far less than reasoning without context.

**Location key:**
- `project/memory` = `~/Desktop/projects/p2.sportsbet/memory/`
- `auto-memory` = `~/.claude/projects/-Users-veronicalin-Desktop-projects-p2-sportsbet/memory/`

### Canonical Rules (three-tier protocol — see next section)
| File | Location | Purpose |
|------|----------|---------|
| `canonical-rules-index.md` | project/memory | Flat rule lookup — read first to find rule numbers |
| `rules/*.md` (7 files) | project/memory | Topic clusters — load by topic |
| `canonical-rules.md` | project/memory | Frozen master (667 lines) — grep only, never read in full |

### Load When Topic Matches
| Topic triggers | File | Location |
|----------------|------|----------|
| System overview for organizer/bookkeeper (bilingual) | `1-system-brief.md` | project root |
| **Page responsibilities, information architecture, navigation flows — reference for ALL page design** | `design-page-responsibilities.md` | project/memory |
| Bets page report UX issues, badge/color/readability decisions | `design-bets-report-issues.md` | project/memory |
| **Bets entry/report redesign — all decisions, alternatives, mockup status** | `design-bets-entry-report-redesign.md` | project/memory |
| Member-facing interface, dual-channel architecture, auth options, adoption strategy | `design-member-interface.md` | project/memory |
| Phase 3 scaling, multi-club onboarding, pricing | `phase3-club-onboarding.md` | project/memory |
| Presentation framing, rhetoric, deliverable planning | `presentation-strategy.md` | project/memory |
| Technical case study (full 5W1H, 8 sections) | `architecture-brief-full.md` | project/memory |
| D1 member dinner presentation | `presentation-d1-member-dinner.md` | project/memory |
| D2 investor pitch | `presentation-d2-investor-pitch.md` | project/memory |
| D3 club sales pitch | `presentation-d3-club-sales-pitch.md` | project/memory |
| place_bet RPC design (all S77 decisions, inputs, sequence, return shape) | `design-place-bet-rpc.md` | project/memory |
| **Priority 3 implementation plan v3 — self-contained execution doc for fresh session** | `plan-priority3-place-bet.md` | project/memory |
| Items tracked for Step 3b (concurrency) | `plan-track-for-3b.md` | project/memory |
| Items deferred to Phase 2+ | `plan-defer-phase2.md` | project/memory |
| Items deferred from execution plan (Step 7 guard, R24.4) | `plan-deferred.md` | project/memory |

### Memory File Naming Convention

Prefix signals when to load. Only applies to files Claude must
discover on its own — not files loaded explicitly by session start,
protocol, or cross-reference.

Active prefixes: design- | plan- | presentation- | phase3- | Mockup- | wrap-

Rules:
- 1 file on a topic = no prefix, just a descriptive name
- 2+ files sharing the same loading trigger = create a prefix
- Only create a new prefix when no existing prefix fits
- When reference files reach ~15+, notify user — the routing table may need restructuring in favor of prefix-based discovery

### Mockup HTML Files — `3-mockup-HTML/`

All UI mockups live in `3-mockup-HTML/`. Prefix: `Mockup-`. New mockups go here with the same prefix.

| # | File | What it shows |
|---|------|--------------|
| 1 | `Mockup-Dual-Betting-Flow.html` | Dual-channel info flow (member + bookkeeper interfaces) |
| 2 | `Mockup-Member-Interface.html` | Member UI prototype in mobile phone frame |
| 3 | `Mockup-Execution-Roadmap.html` | MVP execution roadmap (timeline, phases, dependencies) |
| 4 | `Mockup-Matchcard-Layout-Compare.html` | Match card layout comparison (A vs B — B chosen) |
| 5 | `Mockup-Matches-Bets-Page-Flow.html` | Full matches→bets page flow v5 (locked structural reference) |
| 6 | `Mockup-Sporadic-Pool.html` | Sporadic pool creation + pool bet entry |
| 7 | `Mockup-Betting-In-Action.html` | Multi-match tab bar + 封盤 on bets page |
| 8 | `Mockup-Betting-Completed.html` | Per-match settlement report v2 (3 examples) |
| 9 | `Mockup-Betting-Multi-Scenario.html` | Share editing + sporadic pools + report rewrite (finalized) |
| 10 | `Mockup-Bets-Landing.html` | Bets landing page v7 — match list tab + member lookup tab |
| 11 | `Mockup-Bets-Entry-Report-Redesign.html` | Bets entry/report page redesign v5 |
| 12 | `Mockup-Bets-Entry-UIEval-Fixes.html` | UIEval fixes v3 — modal headers, toast, typoaudit (S72 working) |
| 13 | `Mockup-ShareRatio-Merge-Options.html` | 5 display + 3 edit options for 選手佔成 merge (S72 exploration) |
| 14 | `Mockup-ShareRatio-Edit-Inline.html` | Inline input edit for 選手佔成 — Approach 1 approved (S72) |
| 15 | `Mockup-MatchHeader-Layout-Options.html` | 4 MatchHeader layout options A/B/C/D (S72 exploration) |
| 16 | `Mockup-MatchHeader-OptionC-Refined.html` | Option C refined — Position A vs B comparison (S72) |
| 17 | `Mockup-MatchHeader-Final.html` | **Final approved** — hero layout + inline share edit + all states (S72) |
| 18 | `Mockup-ShareRatio-InlineRow.html` | Share % as row under teams — explored, rejected (S72) |

### Archive (`archive/` in project root)
Historical files — executed plans, completed audits, resolved items. No active purpose. 14 files archived Session 56.

---

## Canonical Rules — Load Policy

`memory/canonical-rules.md` is the sole authoritative source for all system rules (29 sections, R1–R29). It supersedes all prior documentation on conflict. It is NOT loaded at every session start — it is loaded on demand when triggered.

### Rule File Structure
- `memory/canonical-rules.md` — frozen master file (667 lines). Do not edit.
- `memory/canonical-rules-index.md` — flat lookup table, one line per sub-rule with Chinese description. Read this first to identify relevant rules.
- `memory/rules/` — 7 topic cluster files (verbatim extracts from canonical, each fits one read):
  - `R01-R04-foundations.md` — definitions, match types, scoring, handicap (74 lines)
  - `R05-sporadic-pools.md` — sporadic pool rules (17 lines)
  - `R06-R11-betting-rules.md` — monetary units, bet types, mandatory betting, auto-placement, validity (85 lines)
  - `R12-R15-bet-pipeline.md` — routing, requests, lifecycle, capacity (107 lines)
  - `R16-R22-settlement.md` — payout, shares, arithmetic, rake, provider fee, settlement (181 lines)
  - `R23-R25-match-lifecycle.md` — match lifecycle, cancellation, player changes (86 lines)
  - `R26-R29-system.md` — attribution, concurrency, OQs, maintainer override (91 lines)

### Three-Tier Loading Protocol

**Tier 1 — Quick lookup** (need 1–3 specific rules):
1. Read `memory/canonical-rules-index.md` — identify relevant rule numbers
2. Grep `memory/canonical-rules.md` for `^R7.1` (or similar) — get line number
3. Read canonical from that line, 10–20 lines

**Tier 2 — Topic-level work** (need a full area):
Read the relevant cluster file(s) from `memory/rules/`. Announce: "Loading [cluster file] before proceeding."

**Tier 3 — Full dump** (need everything, or `rules` codeword):
Read all 7 cluster files (parallel reads OK).

### When to Load Rules

Load the relevant cluster file(s) BEFORE proceeding whenever ANY of the following apply. No exceptions.

**A — Coding or Implementation**
- Writing or modifying any code file (.ts, .tsx, .js, .sql)
- Schema changes, migrations, or database structure changes
- Editing types (src/types.ts or any types file)
- Designing APIs or writing validation logic

**B — Topics Involving**
- bets · bet_requests · settlement · payout · rake
- provider fee · share ratios · capacity
- match lifecycle · match cancellation · status transitions
- billing · rounding · concurrency · invariants

**C — Questions That Could Affect**
- Arithmetic or money calculation
- State transitions
- DB constraints, locking, or transactions
- Enums

**Rule:** If in doubt, load more. The cost of one read is far less than the cost of building against stale rules.

---

## ⚠️ Next Session — Discuss Before Building

### S73 Revert: Sporadic Pool Fixes Need Holistic Redesign

S73 ran blastcheck on sporadic pool drift, found 8 issues, attempted fixes, and reverted all code. The critical problem: the matches page grouping logic (overdue/today/thisWeek/etc.) uses separate source arrays per section. Adding new match categories (e.g., completed-with-pending-pools) creates invisible matches because they don't fit any existing group.

**Before writing any sporadic pool code, design the grouping logic first:**
- Single source (`currentMatches`) for all groups — every match appears in exactly one group
- Overdue = all past-date matches needing action (not just active)
- Today = `date === today` (strict)
- Future = by week range
- Status determines card appearance, date determines card placement

**Then reapply the verified fixes (1–6) as a unit.** Full details + reference code at `archive/s73-reverted/README-s73-revert.md`.

### Previous Items (S67–72)

1. ~~**Edit mode UX redesign**~~ ✓ (S69)
2. ~~**uieval on bets entry page**~~ ✓ (S72)
3. **Post-自動派注 workflow** — Partially resolved by removing delete (bet count stays stable). May still need a verification/count mechanism — discuss.
4. **Sporadic pool edit mode** — Pool bets have no edit capability (delete + re-create only). Deferred — discuss when ready.
5. ~~**PoolBetSection + ShareRatioEditor visual check**~~ — S73 blastcheck assessed. User said it looks fine. Other pool issues supersede.

---

## Data Migration Rule

When adding code that auto-populates companion data at creation time (e.g., share rows at match creation, self-bets at match creation), check whether existing records lack that data. If they do:
1. Write a backfill SQL and open it immediately
2. Update test-data.sql to include the new rows

Existing records created before the code was added won't fix themselves.

---

## Standard Implementation Procedure (Mandatory)

Every implementation task follows this sequence. No exceptions. Skipping steps causes rework.

### Sequence

1. **Discussion** — understand the problem, define requirements, make design decisions
2. **Execution plan** — structured plan with dependencies and sequencing. If any plan file exceeds 190 lines, split by topic. Follow naming conventions in File Directory section.
3. **Reference files** — create/update memory files so all decisions are findable in future sessions
4. **Mockup** — if UI is involved, create and approve mockup before any code is written
5. **Context loading** — in a new session, load all relevant context before writing code. Prefer comprehensiveness over efficiency — read too much rather than too little
6. **Implementation** — pure code-writing. Follow the plan, do not redesign mid-implementation
6b. **Blast radius check** — Claude automatically runs `blastcheck` at Step 6 completion. Detects cross-context drift: other locations sharing the same assumptions as the change that may now be inconsistent. Runs to completion, produces report. Findings become additional scope before proceeding. Read `~/.claude/codewords/blastcheck.md` for the full procedure.
7. **Visual sanity check** — user sends screenshots of rendered page + approved mockup. Compare and fix obvious visual differences (layout, missing elements, wrong colors, broken spacing) until ~90% matching. Not final polish — just visually tolerable for functional testing
8. **Functional testing** — verify all logic: click handlers, data loading, state transitions, error handling. Run through a complete real-world bookkeeper workflow end to end. Batch all issues into a numbered list. Do not fix until user reviews.
9. **Fix pass (functional)** — fix all approved functional issues. Re-test until clean.
9b. **Blast radius check (conditional)** — if any file was touched in Step 9 that was NOT touched in Step 6, run `blastcheck` again. If the fix pass only touched files already covered by the Step 6 check, skip. Mechanical trigger — no judgment call.
10. **UI polish** — detailed comparison of rendered page against mockup. List every remaining visual difference. Check all interactive states: loading, empty, error, single item, many items, overflow. Check mobile viewport. Present as a numbered list. Do not fix until user reviews.
11. **Fix pass (UI)** — fix all approved UI issues in one batch. Re-screenshot for verification.
12. **Complete** — page/phase/task is done.

### Post-Implementation UI Review (Steps 7–10 Detail)

When the user provides screenshots of the rendered page and the approved mockup:

1. Compare and list every visual difference before fixing anything
2. Verify all interactive states: loading, empty, error, single item, many items, overflow
3. Check mobile viewport — flag anything that breaks or overflows
4. Run `tsc --noEmit`
5. Present findings in two clearly separated sections: **Functional Issues** and **UI Issues**. Never mix them in the same list.
6. Wait for user review before fixing anything.

### Rules

- Always consider the bookkeeper's workflow and the architectural purpose of each page when making implementation decisions
- Functional testing and UI polish are always separate phases — never combine them in discussion, feedback, or fix lists
- If an approved mockup exists, the rendered page must match it. Differences are bugs, not style preferences.
- Run `tsc --noEmit` after every fix pass

### Enforcement

- **Session start:** At the start of any implementation session, state which step of this procedure we are on. Do not begin work until the current step is confirmed.
- **If user skips a step or jumps ahead:** Do not comply silently. Stop and say: *"We're currently in [phase]. You're asking me to do [thing], which belongs in [later phase]. Should we finish [current phase] first, or are you intentionally reordering?"* Then wait for explicit answer.
- **If user asks for implementation code without an approved plan or mockup:** Do not write code. Say: *"Steps 1–5 are not complete — [missing step] hasn't been done yet. Should we do that first?"* Then wait.
- **This is not optional.** Letting the user drift without flagging it is a failure to follow instructions. Push back when deviations occur — a 10-second reminder saves hours of rework.

---

## `SIP` Codeword

Only trigger if `SIP` is the entire message — nothing before or after it.

Display the Standard Implementation Procedure with integrated codewords and current position. Do all automatically:

1. Print the following sequence:

```
 #  Step                        Codewords
─── ─────────────────────────── ──────────────────────────
 1  Discussion                  —
 2  Execution plan              —
 3  Reference files             —
 4  Mockup                      mgp → uieval → typoaudit
 5  Context loading             —
 6  Implementation              —
6b  Blast radius check          blastcheck (auto)
 7  Visual + code check         implaudit (full: Steps 0+1+2)
 8  Functional testing          testplan
 9  Fix pass (functional)       —
9b  Blast radius check          blastcheck (conditional)
10  UI polish                   implaudit + screenshots, typoaudit
11  Fix pass (UI)               —
12  Complete                    audit → deepcheck
```

2. Read `0-memory.md` TODO section to determine the current task
3. Assess which step of the procedure that task is on
4. Print: "**Current task:** [task name]" and "**Current step:** [step number + name]"
5. If the current step has codewords, remind which ones are available
6. If the current step is unclear, ask the user to confirm before proceeding

---

## `rules` Codeword

Only trigger if `rules` is the entire message — nothing before or after it.

Force-load all canonical rules immediately (Tier 3):
1. Read all 7 cluster files in `memory/rules/` (parallel reads)
2. Confirm: "Canonical rules loaded (R1–R29). Ready to proceed."

---

## `implaudit` — Project-Specific Step 2

When running `implaudit` in this project, replace the generic Step 2 entirely with this checklist:

### STEP 2 — Backend Logic Integrity (vs Canonical Rules)

Review all functions touched in this session against canonical rules (R1–R29).
Flag any contradiction, shortcut, or missing guard.

- [ ] Bet writes: bet_requests and bets are separate INSERTs, never combined
- [ ] Status transitions: follow the canonical state machine (no skipped states)
- [ ] 封盤: sets matches.status = betting_closed and triggers share adjustment
- [ ] Auto-placement: balances by count first, amount as tiebreaker (R10.4)
- [ ] Settlement: rake applies to positive netGain only, rounded to nearest 100
- [ ] Result fan-out: base bets and pool bets handled separately
- [ ] RPCs use FOR UPDATE locks where concurrent writes are possible
- [ ] No client-side logic that belongs in an RPC or DB function

---

## Canonical Source Protocol (Mandatory)

When any rule-governed value is needed, you MUST read the canonical source and quote the exact text before using it.

Rule-governed values include:
- numeric constants
- enums, statuses, or types
- field names or schema structure
- units or conversion factors
- default values or limits
- algorithm or branching behavior

Canonical source hierarchy:
1. `desktop/projects/p2.sportsbet/memory/canonical-rules-index.md` = lookup/index layer
2. `desktop/projects/p2.sportsbet/memory/rules/` = topic-split canonical rule files for normal retrieval
3. `desktop/projects/p2.sportsbet/memory/canonical-rules.md` = full untouched canonical rule, final source of truth

Additional canonical sources:
- `desktop/projects/p2.sportsbet/memory/schema/`
- `desktop/projects/p2.sportsbet/memory/rpcs/`

Lookup protocol:
- First use the canonical index to identify the relevant rule/topic
- Then read the relevant topic file in `memory/rules/`
- Use the full `canonical-rules.md` only when the topic file is insufficient, ambiguous, or needs verification against the master source

Never infer rule-governed values from context, memory, prior responses, or general knowledge.
When unsure whether a value is rule-governed, treat it as rule-governed.

If the value is not found in the canonical sources:
- state "Not found in canonical sources"
- do not assume a value
- stop and wait for clarification

---

## Project file discovery rule

When a task requires identifying what files exist before deciding what to read, first load:
`desktop/projects/p2.sportsbet/memory/inventory-list-of-files.md`

This file is a flat list of every file in the repository (one path per line). It provides the project topology and defines the search space.

Load the inventory before:
- blast radius or cross-file assumption checks
- starting a new feature (to find reusable components or existing patterns)
- cold session orientation (to re-map the project structure)
- checking whether a file exists, was renamed, or duplicated
- creating a new file (to avoid parallel or conflicting implementations)
- debugging where a function, type, or feature might live

Purpose:
Use the inventory to identify candidate files and narrow the search space before choosing files to read.

Constraints:
- Treat this as a discovery step only
- Do not summarize or analyze the inventory
- Do not load all listed files
- Use it only to decide which files are relevant to the task
- The inventory reflects the project state at last update — verify existence of critical files before acting on them


