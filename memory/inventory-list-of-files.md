# Project File Inventory — Reference/Context Files

> Generated Session 74 (2026-03-19). One-sentence descriptions based on first 20 lines of each file.

## Source Code Files

```
./eslint.config.mjs
./seed-stress-test.mjs
./next.config.ts
./next-env.d.ts
./tsconfig.json
./postcss.config.mjs
./src/app/bets/page.tsx
./src/app/globals.css
./src/app/layout.tsx
./src/app/matches/page.tsx
./src/app/members/page.tsx
./src/app/page.tsx
./src/components/Bets/BetEntryView.tsx
./src/components/Bets/BettingActions.tsx
./src/components/Bets/MatchBetEntry.tsx
./src/components/Bets/MatchBetRow.tsx
./src/components/Bets/MatchHeader.tsx
./src/components/Bets/MatchSettlementReport.tsx
./src/components/Bets/MatchTabBar.tsx
./src/components/Bets/PoolBetSection.tsx
./src/components/Bets/PoolReportHeader.tsx
./src/components/Bets/ReportBetColumn.tsx
./src/components/Bets/SettlementRow.tsx
./src/components/Bets/SettlementSection.tsx
./src/components/Bets/SettlementSummary.tsx
./src/components/Bets/ShareRatioEditor.tsx
./src/components/Bets/settlement-helpers.ts
./src/components/Bets/types.ts
./src/components/BetsLanding/BetsLandingPage.tsx
./src/components/BetsLanding/MatchListActions.tsx
./src/components/BetsLanding/MatchListRow.tsx
./src/components/BetsLanding/MatchListTab.tsx
./src/components/BetsLanding/MemberLookupTab.tsx
./src/components/BetsLanding/MemberMatchRow.tsx
./src/components/BetsLanding/MemberQuickActions.tsx
./src/components/BetsLanding/SplitBar.tsx
./src/components/BetsLanding/types.ts
./src/components/CloseBettingModal.tsx
./src/components/Matches/PoolCreationModal.tsx
./src/components/MemberSelect.tsx
./src/components/MobileNav.tsx
./src/components/Sidebar.tsx
./src/contexts/OverdueCountContext.tsx
./src/lib/auto-placement.ts
./src/lib/bet-pipeline.ts
./src/lib/betting-actions.ts
./src/lib/settlement.ts
./src/lib/share-validation.ts
./src/lib/supabase.ts
./src/types.ts
./stress-test-bets.sql
./test-data.sql
./tests/auto-placement.test.ts
./tests/bet-pipeline.test.ts
./tests/settlement.test.ts
```

## Reference/Context Files — Annotated

| # | File | Description |
|---|------|-------------|
| 1 | `.claude/settings.json` | Project-level Claude Code plugin config enabling `frontend-design`. |
| 2 | `.claude/settings.local.json` | Local Claude Code permissions: allowed bash commands (open, npm, tsc, git, etc.). |
| 3 | `.env.local` | Environment variables (Supabase keys — not read for security). |
| 4 | `.gitignore` | Standard Next.js gitignore covering node_modules, .next, .env*, build artifacts. |
| 5 | `0-memory.md` | Project state file: what's built, stack, phases, TODO, session config — changes every wrap. |
| 6 | `1-system-brief.md` | Bilingual (繁體中文 + English) system overview explaining what the betting management tool does, who it's for, and the problems it solves. |
| 7 | `2-session-log.md` | Chronological session log (Sessions 1–73) with date, duration, and one-paragraph summary per session. |
| 8 | `CLAUDE.md` | Project-level instructions: file directory, canonical rules load policy, SIP procedure, codewords (SIP/rules/implaudit), data migration rule, next-session directives. |
| 9 | `README.md` | Default Next.js create-next-app README with dev server instructions. |
| 10 | `package.json` | Next.js 16 project with Supabase, Lucide React, and Tailwind dependencies. |
| 11 | `package-lock.json` | NPM lockfile (auto-generated). |
| 12 | `tsconfig.json` | TypeScript config (standard Next.js). |
| 13 | `tsconfig.tsbuildinfo` | TypeScript incremental build cache (auto-generated). |
| 14 | `3-mockup-HTML/Mockup-Bets-Entry-Report-Redesign.html` | Bets entry/report page redesign mockup v5 (S63–65). |
| 15 | `3-mockup-HTML/Mockup-Bets-Entry-UIEval-Fixes.html` | UIEval fixes v3 — modal headers, toast, typoaudit (S72). |
| 16 | `3-mockup-HTML/Mockup-Bets-Landing.html` | Bets landing page v7 — match list tab + member lookup tab (S59, approved). |
| 17 | `3-mockup-HTML/Mockup-Betting-Completed.html` | Per-match settlement report v2 with 3 examples (S43). |
| 18 | `3-mockup-HTML/Mockup-Betting-In-Action.html` | Multi-match tab bar + 封盤 on bets page mockup (S36). |
| 19 | `3-mockup-HTML/Mockup-Betting-Multi-Scenario.html` | Share editing + sporadic pools + report rewrite finalized mockup (S46). |
| 20 | `3-mockup-HTML/Mockup-Dual-Betting-Flow.html` | Dual-channel info flow showing member + bookkeeper interfaces. |
| 21 | `3-mockup-HTML/Mockup-Execution-Roadmap.html` | MVP execution roadmap timeline with phases and dependencies. |
| 22 | `3-mockup-HTML/Mockup-MatchHeader-Final.html` | Final approved hero layout + inline share edit + all states (S72). |
| 23 | `3-mockup-HTML/Mockup-MatchHeader-Layout-Options.html` | 4 MatchHeader layout options A/B/C/D explored (S72). |
| 24 | `3-mockup-HTML/Mockup-MatchHeader-OptionC-Refined.html` | Option C refined — Position A vs B comparison (S72). |
| 25 | `3-mockup-HTML/Mockup-Matchcard-Layout-Compare.html` | Match card layout comparison A vs B (B chosen, S36–37). |
| 26 | `3-mockup-HTML/Mockup-Matches-Bets-Page-Flow.html` | Full matches→bets page flow v5 — locked structural reference (S37). |
| 27 | `3-mockup-HTML/Mockup-Member-Interface.html` | Member UI prototype in mobile phone frame. |
| 28 | `3-mockup-HTML/Mockup-ShareRatio-Edit-Inline.html` | Inline input edit for 選手佔成 — Approach 1 approved (S72). |
| 29 | `3-mockup-HTML/Mockup-ShareRatio-InlineRow.html` | Share % as row under teams — explored and rejected (S72). |
| 30 | `3-mockup-HTML/Mockup-ShareRatio-Merge-Options.html` | 5 display + 3 edit options for 選手佔成 merge exploration (S72). |
| 31 | `3-mockup-HTML/Mockup-Sporadic-Pool.html` | Sporadic pool creation + pool bet entry mockup (S37). |
| 32 | `4-last-wraps/wrap-s69.md` | Session 69 wrap: bonsai trim + edit mode UX redesign (Option A inline controls). |
| 33 | `4-last-wraps/wrap-s70.md` | Session 70 wrap: MacBook Pro dual-device setup (Phases 1–2 + AirDrop). |
| 34 | `4-last-wraps/wrap-s71.md` | Session 71 wrap: MacBook Pro setup completed (Phases 3–11) + dual-device sync. |
| 35 | `4-last-wraps/wrap-s72.md` | Session 72 wrap: UIEval on 5 screenshots → MatchHeader hero rewrite + modal fixes + typoaudit. |
| 36 | `4-last-wraps/wrap-s73.md` | Session 73 wrap: blastcheck protocol designed, first run (8 findings), 8 fixes attempted then fully reverted. |
| 37 | `archive/audit-backend-report-s52.md` | S52 backend audit: full data path from write→processing→display, 17 findings against R1–R29. |
| 38 | `archive/audit-ui-report-s51.md` | S51 UI discrepancy report: per-match report page vs mockup, 6 gaps identified with fix plan. |
| 39 | `archive/plan-context-share-editing.md` | S48 implementation plan for share ratio editing (#4), sporadic pools (#5), and report rewrite (#6). |
| 40 | `archive/plan-fix-now-part1.md` | Unified fix plan Part 1 (Groups 1–4) from S51+S52 audits, ordered by dependency. |
| 41 | `archive/plan-fix-now-part2.md` | Unified fix plan Part 2 (Groups 5–7): MatchSettlementReport error handling + settlement-helpers date fix. |
| 42 | `archive/plan-report-rewrite.md` | Per-match report rewrite plan (#6): MatchBetReport → multi-component settlement report system. |
| 43 | `archive/plan-resolved.md` | Non-issues confirmed during S52 audit: partial RPC fan-out (atomic), pool settlement date (match date correct). |
| 44 | `archive/plan-sporadic-correct-cancel.md` | Plan for `correct_pool_result` and `cancel_match` RPCs for sporadic pools. |
| 45 | `archive/plan-sporadic-schema-submit.md` | Plan for sporadic pool schema migration + `submit_pool_result` RPC. |
| 46 | `archive/plan-sporadic-ui.md` | Plan for sporadic pool UI: auto-share creation at pool creation + pool bet entry section. |
| 47 | `archive/s73-reverted/README-s73-revert.md` | Full documentation of S73 revert: 8 fixes applied, why each was reverted, design problems, and all open findings. |
| 48 | `archive/s73-reverted/PoolCreationModal-s73.txt` | S73 reference code: PoolCreationModal with edit mode added (reverted). |
| 49 | `archive/s73-reverted/matches-page-s73.txt` | S73 reference code: matches/page.tsx with all 8 fixes applied (reverted). |
| 50 | `archive/session20-direction-pivot.md` | S20 direction pivot: payout model correction, member-facing interface as Phase 1, organizer rule clarifications. |
| 51 | `archive/step4-conflict-report.md` | S24 conflict report: code vs canonical rules R1–R29 (e.g., `sporadic` in match_type union). |
| 52 | `archive/step5-migration-plan.md` | S24 schema + code normalization plan: 33 conflicts fixed across 3 phases (5a/5b/5c). |
| 53 | `archive/test-checklist-s53.md` | S53 functional test checklist for all 17 fix-now items with test data references. |
| 54 | `memory/0-memory-backup-2026-03.md` | Frozen backup of 0-memory.md from S69 bonsai trim. |
| 55 | `memory/architecture-brief.md` | Trimmed technical backbone: hard problems, risk analysis, replacement cost framework (loaded every session). |
| 56 | `memory/architecture-brief-full.md` | Full 8-section 5W1H architecture case study for deep presentation context. |
| 57 | `memory/canonical-rules-index.md` | Flat lookup table: one line per sub-rule (R1–R29) with Chinese descriptions for quick rule discovery. |
| 58 | `memory/canonical-rules.md` | Frozen master file (667 lines): all 29 canonical system rules (R1–R29) — sole authoritative source. |
| 59 | `memory/design-bets-entry-report-redesign.md` | All decisions for bets entry/report page redesign: page order, MatchHeader hero, 選手佔成 merge, modal fixes (S63–72). |
| 60 | `memory/design-bets-report-issues.md` | Resolved UX issues for bets page: badge rules, competing colors, row readability, member-first entry. |
| 61 | `memory/design-member-interface.md` | S20 direction pivot record: member-facing interface as Phase 1, dual-channel architecture. |
| 62 | `memory/design-page-responsibilities.md` | Page responsibilities & information architecture: three-role bookkeeper, page duties, navigation map, 7 design constraints (S55). |
| 63 | `memory/phase3-club-onboarding.md` | Phase 3 scaling framework: questionnaire for onboarding new golf clubs. |
| 64 | `memory/plan-defer-phase2.md` | Items deferred to Phase 2+: export emojis, error state, from S51/S52 audits. |
| 65 | `memory/plan-deferred.md` | Step 7 guard: SQL to block settlement when completed matches have pools with pending results. |
| 66 | `memory/plan-track-for-3b.md` | Items blocked on Step 3b concurrency: dual-write non-atomic bet entry, needs serialized transactions + row locks. |
| 67 | `memory/presentation-d1-member-dinner.md` | Deliverable 1 brief: 7–10 min member dinner presentation. |
| 68 | `memory/presentation-d2-investor-pitch.md` | Deliverable 2 brief: 15-min investor presentation + 5-min live demo. |
| 69 | `memory/presentation-d3-club-sales-pitch.md` | Deliverable 3 brief: 7–10 min club sales pitch. |
| 70 | `memory/presentation-strategy.md` | Presentation strategic framework: three deliverables, rhetorical contract, architecture as invisible complexity. |
| 71 | `memory/rules/R01-R04-foundations.md` | Canonical rules cluster: definitions, match types, scoring, handicap (R1–R4, 74 lines). |
| 72 | `memory/rules/R05-sporadic-pools.md` | Canonical rules cluster: sporadic pool rules (R5, 17 lines). |
| 73 | `memory/rules/R06-R11-betting-rules.md` | Canonical rules cluster: monetary units, bet types, mandatory betting, auto-placement, validity (R6–R11, 85 lines). |
| 74 | `memory/rules/R12-R15-bet-pipeline.md` | Canonical rules cluster: routing, requests, lifecycle, capacity (R12–R15, 107 lines). |
| 75 | `memory/rules/R16-R22-settlement.md` | Canonical rules cluster: payout, shares, arithmetic, rake, provider fee, settlement (R16–R22, 181 lines). |
| 76 | `memory/rules/R23-R25-match-lifecycle.md` | Canonical rules cluster: match lifecycle, cancellation, player changes (R23–R25, 86 lines). |
| 77 | `memory/rules/R26-R29-system.md` | Canonical rules cluster: attribution, concurrency, OQs, maintainer override (R26–R29, 91 lines). |
| 78 | `public/file.svg` | Default Next.js public asset (SVG icon). |
| 79 | `public/globe.svg` | Default Next.js public asset (SVG icon). |
| 80 | `public/next.svg` | Default Next.js public asset (SVG icon). |
| 81 | `public/vercel.svg` | Default Next.js public asset (SVG icon). |
| 82 | `public/window.svg` | Default Next.js public asset (SVG icon). |
| 83 | `.DS_Store` | macOS Finder metadata (auto-generated). |
| 84 | `memory/.DS_Store` | macOS Finder metadata (auto-generated). |
| 85 | `src/.DS_Store` | macOS Finder metadata (auto-generated). |
| 86 | `src/app/.DS_Store` | macOS Finder metadata (auto-generated). |
| 87 | `src/app/favicon.ico` | Browser tab icon (default Next.js). |

## Schema & RPC Status

**Schema files:** None exist as standalone schema-definition files. Table definitions (CREATE TABLE, ALTER TABLE, CHECK constraints) were executed directly in Supabase SQL Editor. No local source-of-truth file for the database schema. `src/types.ts` mirrors the DB schema in TypeScript but does not define it.

**RPC files:** None exist as standalone SQL files. RPCs (`submit_match_result`, `correct_match_result`, `submit_pool_result`, `correct_pool_result`, `replace_match_player`, `cancel_match`) live in Supabase only. Reference SQL exists as code blocks inside archived plan `.md` files (e.g., `archive/plan-sporadic-correct-cancel.md`, `archive/plan-sporadic-schema-submit.md`).

**Data files (not schema):**
- `test-data.sql` — INSERT statements for 10 test members, 4 matches, 30 bets, 10 settlements.
- `stress-test-bets.sql` — INSERT statements for 85-bet stress test.
