# Last Wrap — Session 65 (2026-03-12)

## Duration: 2h 17m

## What Was Done

### Codeword Infrastructure (major)

**Existing codeword improvements:**
- `cleanup` moved from p2-specific to global (`~/.claude/CLAUDE.md`)
- "When to use" field added to ALL codewords in CODEWORDS.md
- "Split Pattern" subsection added to "Adding New Codewords" — documents the `~/.claude/codewords/{name}.md` approach
- CLAUDE.md codeword creation instruction updated to require "When to use" + reference split pattern

**New codeword: `implaudit`** — Post-implementation integrity check. Three steps:
- Step 0 (Visual Diff): pixel-level screenshot comparison — triggers only when screenshots attached
- Step 1 (Frontend Fidelity): code vs mockup decision log, 10 dimensions
- Step 2 (Backend Logic): code vs documented rules. p2 has project-specific override (canonical rules R1–R29 checklist, self-contained in p2 CLAUDE.md)
- Split pattern: `~/.claude/codewords/implaudit.md`
- Originally proposed as 3 steps — Step 3 (self-detected issues) removed due to overlap with `audit`
- `mockupcheck` concept folded in as Step 0 rather than a separate codeword

**New codeword: `mgp`** (Mockup Generation Protocol) — Structured autonomous mockup generation from existing plan. Four phases: autonomous decisions → render React mockup (HTML fallback for non-React) → in-chat decision summary with assumptions surfaced → await comments. Split pattern: `~/.claude/codewords/mgp.md`.

**New codeword: `testplan`** — Functional test plan generator for SIP Step 8. Generates numbered test scenarios (setup, happy path, input variations, edge cases, error states, end-to-end workflow). User runs tests, Claude compiles failures with: probable root cause, likely file/component, investigation direction. Split pattern: `~/.claude/codewords/testplan.md`. User refined: traceability wording, state transition coverage mandate, feature-specific edge cases, deeper fix list analysis.

**New CLAUDE.md rule: Decision Routing Protocol** — Always-on behavioral guidance:
- UI issues → mockup-first workflow (or MGP if invoked)
- Architectural/meta decisions → explain, options, recommend, stop
- Other issues → flag, state impact, wait

**SIP codeword updated** — 12-step table now shows codewords mapped to each step. Step 7: `implaudit` (full), Step 8: `testplan`, Step 10: `implaudit` + screenshots + `typoaudit`, Step 12: `audit` → `deepcheck`.

**Codeword sequencing established:**
```
mgp → uieval → typoaudit → implement → implaudit → testplan → audit → deepcheck → wrap
```

### Mockup v5 (bets entry/report)

Typography fixes applied (approved S64):
- Category A raised to 14px: player names under hero %, metric sub-text, expanded detail, NTD amounts, 編輯/已鎖定, export buttons
- Category B kept at 12px: 週一, 勝/敗, （選手）, 補 (補 raised from 10px → 12px)
- Category D raised to 16px: A隊/B隊, 1兩/2兩, 新增, 自動派注/全額降注

4 design refinements:
1. "編輯" text removed — pencil icon only (16px, hover bg)
2. "分潤比例" → "選手佔成" (both views)
3. Per-player shares when not 50/50 — each player gets own hero % with name below (`flex justify-center gap-6`)
4. Dropdown: `appearance-none` + custom SVG chevron, `px-5 py-2.5 pr-12`, arrow `right-4`

### Other

- Stitch MCP tool investigated — decided not to codeword-ify. Best as scouting tool for early visual exploration. Memory note saved (`reference_stitch.md`).
- Preference captured: prompt integrity — codeword execution across files must be self-contained per piece (`feedback_prompt_integrity.md`).

## Decisions

| # | Decision | Reasoning |
|---|----------|-----------|
| 1 | `cleanup` → global | File hygiene applies to all projects |
| 2 | Remove `implaudit` Step 3 | Overlaps with `audit` |
| 3 | One `implaudit` + project override (not two codewords) | Maintenance burden; override is self-contained |
| 4 | React mockups default in `mgp` | React-to-React eliminates translation drift |
| 5 | `mockupcheck` → folded into `implaudit` Step 0 | Same goal, different method — one codeword |
| 6 | `testplan` fills SIP Step 8 | `implaudit` is code review, Step 8 needs functional testing |
| 7 | No scenario count limit on `testplan` | Plan-traceability naturally throttles |
| 8 | Decision Routing Protocol = CLAUDE.md rule, not codeword | Always-on behavioral guidance |
| 9 | Stitch = no codeword, use directly | Scouting tool |
| 10 | "分潤比例" → "選手佔成" | User preference |
| 11 | Per-player hero % for non-50/50 shares | Each player gets own column |
| 12 | Dropdown `px-5 pr-12 right-4` | Balanced text-to-arrow spacing |

## Next Session Plan
1. Run `uieval` on mockup v5
2. If confident, move to SIP Step 5 (context loading) and Step 6 (implementation)

## Files Changed
1. `~/.claude/CLAUDE.md` — cleanup global, implaudit/mgp/testplan pointers, Decision Routing Protocol
2. `~/.claude/codewords/implaudit.md` — created
3. `~/.claude/codewords/mgp.md` — created
4. `~/.claude/codewords/testplan.md` — created
5. `p2.sportsbet/CLAUDE.md` — cleanup removed, implaudit p2 Step 2 override, SIP table with codewords
6. `~/Desktop/projects/CODEWORDS.md` — full rewrite (When to use, Split Pattern, 3 new codewords)
7. `3-mockup-HTML/Mockup-Bets-Entry-Report-Redesign.html` — v4→v5
8. `memory/design-bets-entry-report-redesign.md` — v5 decisions
9. `~/.claude/projects/.../memory/feedback_prompt_integrity.md` — created
10. `~/.claude/projects/.../memory/reference_stitch.md` — created
11. `~/.claude/projects/.../memory/MEMORY.md` — index updated

## Session Log Entry
| 65 | 2026-03-12 | 2h 17m | Codeword infrastructure: cleanup→global, "When to use" on all, Split Pattern documented. New codewords: implaudit (post-implementation integrity, 3 steps incl visual diff), mgp (autonomous mockup generation from plan, React default), testplan (functional test plan generator for SIP Step 8). Decision Routing Protocol added to CLAUDE.md. SIP table updated with codeword mapping. Mockup v5: typography applied (14px floor, 16px buttons), 分潤比例→選手佔成, per-player hero % for non-50/50, dropdown custom arrow. |
