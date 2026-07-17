# Project Memory — p2.sportsbet

> **Project state** — what exists NOW. Changes every wrap. For accumulated knowledge (decisions, patterns, lessons), see `MEMORY.md`. For the full file directory and load triggers, see project `CLAUDE.md`.

## What This Is
A private golf club betting management tool. Replaces a chaotic group-chat + Excel workflow with a clean, structured web app. Built first for one golf group, then scaled as a product to other golf clubs (Phase 3). The owner has direct relationships with leaders of other golf societies — this group is the MVP (first real deployment).

## Who Uses the Website
- **Primary user:** 1 bookkeeper (enters all data, manages records via backstage tools)
- **Admins:** 2-3 max (owner/manager access to fix things)
- **The 85 members:** access their own data (matches, bets, balances) + place/edit bets before match close. No access to bookkeeper/admin tools. Full scope TBD — bet-placing confirmed, other actions under discussion.
- Two interfaces, one backend: bookkeeper backstage + member-facing frontend. Same database, same source of truth. See `3-mockup-HTML/Mockup-Dual-Betting-Flow.html` for initial dual-channel sketch.

## Golf Format
2v2 best ball, 18 holes, Team A vs Team B. Full scoring rules in `memory/canonical-rules.md`.

## Betting & Settlement Rules
⚠️ **Canonical source: `memory/canonical-rules.md`** — sole authoritative source for ALL system rules (29 sections, R1–R29, updated Session 22). Frozen — do not edit. Access via three-tier protocol: quick lookup (`memory/canonical-rules-index.md` → grep canonical), topic-level (`memory/rules/*.md` cluster files), or full dump (`rules` codeword → all 7 clusters). See project `CLAUDE.md` for full protocol.

## Stack
- Next.js 16 + Tailwind + Supabase (PostgreSQL, free tier, auth)
- No Stripe — tracks payments, doesn't process them
- Full Traditional Chinese UI (繁體中文), Noto Sans TC font
- Git + GitHub (private repo: `vlindev/p2-sportsbet`). `wrap` auto-pushes, `commit` for mid-session saves. SSH auth.

## Auth & Security
- Login required (2-3 accounts max)
- Auto-logout on idle (duration TBD at build time)
- No hardcoded passwords — all credentials via Supabase auth + environment variables

## Data Model
See `MEMORY.md` for full schema (members, matches, bets, settlements).

## Project Memory Files
- `CLAUDE.md` in project root defines active vs reference memory load rules
- `memory/canonical-rules.md` ⚠️ — frozen master rule file (667 lines, Session 22). 29 sections (R1–R29). Supersedes all prior documentation on conflict.
- `memory/canonical-rules-index.md` — flat lookup table (one line per sub-rule, Chinese descriptions). Read first to find relevant rules.
- `memory/rules/*.md` — 7 topic cluster files (verbatim extracts from canonical, each fits one read). See CLAUDE.md for list + loading protocol.
- `memory/` folder in project root: presentation strategy, architecture brief, deliverable briefs (presentation-d1/d2/d3), design-member-interface.md, design-bets-report-issues.md, phase3-club-onboarding.md
- `memory/rpcs/` — local reference copies of all 8 Supabase RPCs (submit/correct_match_result, submit/correct_pool_result, cancel_match, replace_match_player, place_bet, edit_bet, rls_auto_enable). place_bet S78, edit_bet S79.
- `memory/schema/` — Supabase schema exports (schema-columns.csv, schema-check-constraints.csv, schema-foreign-keys.csv). Created S75.
- Auto-memory (`~/.claude/projects/.../memory/MEMORY.md`) handles domain rules, data model, resolved decisions — separate system, no overlap

## What's Built (as of S83 — existing "1.0" build; see S86 direction change: being rebuilt as 2.0)
⚠️ **S75 full system audit complete.** 38 source files + 8 rules files + 7 RPCs audited. 12 gaps identified with rule compliance verdicts. Priority fix list (13 items) received — 4 need design decisions. Priority 1 done (duplicate RPCs cleaned). Priority 2 resolved (sporadic_pool_id IS NULL fix). **Priority 3 done (S78)** — `place_bet` RPC deployed, all 4 new-bet creation paths rewired (paths 1+2 in S78, quickPick+bulkBuy in S79), R5.4 client fix applied, 18/18 functional tests pass. **Priority 3b done (S79)** — `edit_bet` RPC deployed, adjustAmount+swapTeam rewired to atomic RPC, R13.3 invariant enforced, bulkReduce R13.3 drift fixed. Priority 4 done (S76). Priority 5 done (S76). `BetEntryView.tsx` deleted S76. **Priority 6 done (S80)** — `match_settlements` table created (schema migration). **Priority 7 done (S80)** — settlement write path: `persistMatchSettlement`/`persistPoolSettlement` auto-persist after result RPCs, `MatchSettlementReport.tsx` reads from DB (single source of truth), `CorrectionPreviewModal` for result corrections, monthly `settlements` table auto-aggregated.
- **S83: P7 bug fixes done** — Fix 1 (pool result on completed matches), Fix 2 (stale state after correction), Fix 5 (placeholder position). Pool result flow redesigned: conditional fetchAll (stay if pending pools, sync if all resolved). Automated test script `test-p7-settlement.mjs` (13/13 pass). `src/lib/match-domain.ts` created.
- **8 Supabase RPCs:** submit/correct_match_result, submit/correct_pool_result, cancel_match, replace_match_player, place_bet, edit_bet. Plus `rls_auto_enable` utility. References: `memory/rpcs/` (9 files).
- Supabase connected, 10 tables with RLS (members, matches, bets, settlements, match_settlements, match_team_player_shares, club_billing_config, audit_log, sporadic_pools, bet_requests)
- RLS: permissive allow_all policies — replace with auth.role()='authenticated' when auth is built
- Sidebar + MobileNav + OverdueCountContext: see `src/components/`. `src/types.ts`: all shared types/constants. `Record<Match["match_type"], string>` pattern enforces exhaustiveness.
- `test-data.sql` — 10 TEST members, 4 matches, 30 bets, 10 settlements (cleanup: `DELETE FROM members WHERE name LIKE 'TEST%'`)
- `stress-test-bets.sql` + `seed-stress-test.mjs` — 85-bet stress test (cleanup: `DELETE FROM members WHERE name LIKE 'STRESS%'`)


⚠️ **Keep test data in Supabase until launch** — needed for testing across all pages. **Before launch:** `DELETE FROM members WHERE name LIKE 'TEST%'; DELETE FROM members WHERE name LIKE 'STRESS%';` and delete `seed-stress-test.mjs` from project root.

### `/members` page — roster complete, profile planned (Step 9b)
- Full CRUD, search, active/inactive toggle, 介紹人 click-to-jump, 本月結餘 link. All details in `src/app/members/page.tsx`.
- **Planned (Step 9b):** Member profile/history view — bet history, settlement history, running balance. Historical member lookup lives here, not on bets page.

### `/bets` page — entry + report + landing (Sessions 34–72)
- **Match-first entry** (`/bets?match=id&from=bets`) — `MatchBetEntry.tsx`. Two-column bets, entry form, pencil edit mode, 選手佔成 inline edit, pool bet entry.
- **Landing page / workbench** (`/bets` default) — `src/components/BetsLanding/`. Three tabs: 賽事總覽, 會員批次登錄, 會員查詢. Member batch entry restores the old LINE member-first workflow but submits through `place_bet` only. Shared actions in `src/lib/betting-actions.ts`.
- **Per-match report** (`/bets?match=id&from=completed`) — `MatchSettlementReport.tsx` + settlement components. Pool sections inline.
- **Status-based routing**: scheduled/betting_closed → entry, completed/active/cancelled → report.
- Components: `src/components/Bets/` (13 files). Share editing (#4), sporadic pools (#5), report (#6). All issues resolved — see `memory/design-bets-report-issues.md`.
- **S72: MatchHeader redesigned** — hero matchup layout (player names biggest, directional handicap →/←, 3-zone card). 選手佔成 merged into MatchHeader footer (one-line display, inline input edit). All confirmation modals redesigned (match name in summary card, imbalance badge, member preview, zero-state handling). Edit toast → grouped summary. Player divider between self-bets and regular bets.

### `/matches` page — complete
- 3 tabs (當前/已完成/已取消). 當前: collapsible time sections (overdue always open, localStorage persist). 已完成: month picker + weekly grouping. 已取消: date-grouped.
- Match cards: status-based styling (overdue red, active teal, completed emerald). Footer: `管理投注` | `新增加強盤` | `輸入結果 >` (varies by status). Pool child cards: fuchsia outline, collapsible via `加強盤 ×N` tag, hover stack animation.
- Result entry: atomic RPCs (`submit_match_result` / `correct_match_result`), `FOR UPDATE` lock, per-bet audit, `sporadic_pool_id IS NULL` filter. Correction via pencil on completed cards.
- (4A) Self-bets: 4 × 5兩 auto-inserted at match creation. (4B) Inbox Zero: in-place card transform after result entry via `justCompleted` map.
- (4C) 封盤/取消封盤/自動派注 — removed from matches page S62. All bet actions on bets page only.
- (4D) 自動派注 on bets page (BettingActions + MatchListActions). (4E) Bookkeeper bet entry — `管理投注` navigates to `/bets?match=id`.
- Player replacement: `replace_match_player` RPC (atomic void + create + transfer shares + audit). Allows scheduled + betting_closed.
- Sporadic pools: `PoolCreationModal.tsx`, pool RPCs (`submit_pool_result`, `correct_pool_result`, `cancel_match`).
- Shared: `MatchHeader.tsx` (hero matchup layout, S72 rewrite), `MatchTabBar.tsx` (select dropdown), `ReportBetColumn.tsx`, `BettingActions.tsx` (封盤 + 全額降注 with member preview).
- Form: match type selection, handicap (不讓分→平盤), cross-match same-day player blocking, duplicate name auto-suffix. Error handling: fetchError retry + saveError banner.

### Auto-Placement Engine — `src/lib/auto-placement.ts`
- Pure function, no Supabase dependency. R10.4 3-step algorithm: count → amount → tiebreaker (Team A). Per-member recalculation after each placement.
- `tests/auto-placement.test.ts` — 10 tests (count balancing, Session 20 scenario, amount balancing, tiebreaker, edge cases, immutability).

### Settlement Engine — Step 1 complete (Session 29)
- `src/lib/settlement.ts` — pure TypeScript, no Supabase dependency. Integer-only NTD arithmetic (R18.1). Two primitives: `floorDiv` (R18.3), `roundHalfUp` (四捨五入). Functions: `allocateByShares` (R18.4), `calculateRake` (R19.4), `calculateProviderFee` (R20.4), `calculateMatchPayout` (R16+R21), `calculateMonthlySettlement` (R21.3), `generateDefaultShares` (R17.4).
- `tests/settlement.test.ts` — 143 assertions. Session 20 verified example + edge cases (60/40 shares, odd totals, players-only, 小盤, provider fee active/free) + degenerate cases (lopsided, zero-bets).
- `match_team_player_shares` table — R17.2. Auto-populated at match creation (INSERT only, 50/50 default). UPDATE does not touch shares.
- `club_billing_config` table — R20.2. Seeded: 100 BPS (1%), 6 months free from 2026-05-11.

## Working Preferences
- Move carefully section by section for code reviews and implementation. Prefer small verified slices over broad changes, especially around database, settlement, money-state, or test-harness work.

## Lessons Learned / Gotchas
- DB mutation scripts must fail closed by default: no hardcoded Supabase URL/key, require env vars + explicit test/staging project guard, and restore shared config/test data through `finally` cleanup paths.
- After mechanical destructure cleanup, search the changed identifier in the surrounding block before verifying. Removing `{ data }` while a later line still reads `data` creates runtime-only failures that `tsc` may not catch in excluded `.mjs` scripts.
- Settlement is a multi-write pipeline (result RPC → `match_settlements` → monthly `settlements`) with no atomicity boundary. New write paths in this domain must either be atomic at the DB layer or expose a durable repair state — surfacing errors in the UI alone is a stopgap, not a fix.
- Supabase RPC migrations must preserve existing parameter defaults in the `CREATE OR REPLACE FUNCTION` wrapper; omitting a remote default causes `cannot remove parameter defaults from existing function` and blocks `db push` before applying changes.
- Never commit file deletions silently (S87). `wrap`/`commit` `git add -A` can propagate app-side deletions to all devices. Guarded now: `.githooks/pre-commit` blocks deletion commits in both repos (override `ALLOW_DELETIONS=1 git commit`), `wrap`/`commit` ask-first, `ready` step 1b auto-arms per machine. See auto-memory `feedback_no_silent_deletions.md`.
- Frozen master `canonical-rules.md` self-contradicts in 2 early glossary defs (S88): R1.3 defines `is_sporadic` (deprecated by R2.2/R5.12 → count `sporadic_pools` rows); R1.25 defines `bet_increment_liang` (deprecated by R2.6/R11.3 → base amounts fixed 1/2兩). R1 section never revised. `canonical-rules-index.md` verified 100% in sync with master. Don't treat R1.3/R1.25 fields as live.

## UI/UX Design Principles

**Visual hierarchy** — size = importance. Clear tiers. Too many elements at the same size = noise. Smallest font sets the floor — build upward, never go below it.

**Simplicity** — every element earns its place. Clean whites, soft shadows, no clutter. Show what matters, let everything else recede.

**Confirmation for danger only** — no popups for non-destructive actions. Reserve for delete, cancel match, settle money.

**Intuition over instruction** — first-time user knows what to do without explanation. cursor-pointer + hover states everywhere. Primary actions: orange, solid. Destructive actions: unmistakable but not alarming.

**Color is functional** — consistent meaning app-wide. See Design System for mappings.

**Proportionality is systemic** — font changes disrupt contrast across tiers. Audit the full page, not just the target element.

**Mobile first** — sidebar desktop, bottom nav mobile, built in from day one, never retrofitted.

## Design System
- **Colors:** slate-900 sidebar · orange-500 primary · teal active/live · red danger · emerald positive/win · blue-400 toggle on / slate-300 toggle off
- **Match type colors:** Blue (週一例行賽) · Lime (固定隊內賽) · Fuchsia (加強版)
- **Terminology:** sporadic match = 加強版 (not 驚喜賽)
- **Font base:** 17px. Tiers: text-lg → text-base → text-sm → text-xs (floor)
- **Hierarchy:** size = importance. cursor-pointer on every clickable element, no exceptions

## Phases — Project Roadmap

**Phase 1 — MVP**
Build a functional product for Casino Golf Society. Two interfaces: bookkeeper backstage (match management, bet entry, result recording, settlement reports) + member-facing frontend (view data, place/edit bets; full scope TBD). Same backend/database. 85 real users, real money — must handle everything the club needs correctly.

**Phase 2 — Polish & Interactivity**
Refine UI, improve usability, complete all functional features. Make the system robust, foolproof, and ready for real daily use by the bookkeeper and admins.

**Phase 3 — Scale & Commercialise**
Transform the internal tool into a sellable product for other golf clubs. Introduce member performance history, automatic odds calculation, and a data analytics dashboard. The system evolves from an internal admin tool into a full data insights platform. Requires rethinking architecture for multi-tenancy and scalability.

## Session Config
- Timer unavailable = log duration as `n/a`
- Segment start file: `/tmp/p2_segment.txt`
- Accumulated time file: `/tmp/p2_accumulated.txt`
- Session log: `/Users/veronicalin/Desktop/projects/p2.sportsbet/2-session-log.md`
- Last wrap: `/Users/veronicalin/.claude/projects/-Users-veronicalin-Desktop-projects-p2-sportsbet/memory/last-wrap.md`
- Rolling wraps: `/Users/veronicalin/Desktop/projects/p2.sportsbet/4-last-wraps/wrap-sXX.md` (XX = session number)

## Pre-Launch Execution Plan (MVP)
⚠️ **Full plan:** `memory/plan-ticklish-chasing-cocke.md` — finalized Session 28. Phase A (Mar 4–Apr 7, 13–19 sessions) → Blackout (Apr 8–26) → Phase B Polish (Apr 27–30) → Launch (May 4 presentation, May 11 go live) → Phase C post-launch. Visual roadmap: `3-mockup-HTML/Mockup-Execution-Roadmap.html`. Step 3 split into 3a (schema) / 3b (concurrency). Member read-only view ships at launch (Step 9). **Steps 4+5 fully tested (S55). Implementation plan: `memory/plan-*` files (6 files). Deferred: `plan-deferred.md` (Step 7 guard, R24.4).**

## ⚠️ DIRECTION CHANGE (S86, 2026-07-11) — READ FIRST
**External engineering team onboarded (betting-industry veterans, working free). System being rebuilt fresh as "2.0" — existing build is reference only, not being ported.** Veronica's role shifts from builder → **domain authority**. Full context: `project_2.0_team_rewrite_urd.md` (auto-memory) + `4-last-wraps/wrap-s86.md`.
- **Phase 1 (build now):** bookkeeper-facing ONLY, single club. Goals: prove money math correct + gather first real dataset. NO member-facing.
- **Phase 2 (future):** member-facing. **Phase 3 (future):** multi-club.
- **Handoff spec authored:** `URD-Golf-Betting-System.md` (EN) + `URD-高爾夫投注系統-繁中.md` + `.pdf` (the send artifact) + `.html`. 9 screenshots in `here/`.
- **New reqs (absent from current build):** weekly settlement, settle-tracking (mark paid, terminal/protected), settlement confirmation (commit a period), 1v1/1v2/1v3 formats, assisted match creation from pasted text, real-time unsettled balance per member.
- **Canonical R22.4 changed monthly → weekly** (創隊長-confirmed, dated revision in frozen file). ⚠️ Other memory files still say "monthly" — reconcile.
- **Open:** 創隊長 to verify the 4 worked settlement examples (URD Appendix E); `canonical-rules.md` deliberately NOT sent to team (test to see if they ask) → URD Appendices D+E are their entire correctness contract; English PDF not yet generated.
- The old solo pre-launch roadmap (`plan-ticklish-chasing-cocke.md` + the priority sequence below) is **PAUSED** pending the team's 2.0 build.

## TODO
### Done ✓
- Sessions 1–10: matches/members page UI, security rules, phase roadmap.
- Sessions 21–26: canonical rules normalization (R1–R29). All OQs resolved S22.
- **Step 1** ✓ (S29–30): Settlement engine + `match_team_player_shares` + `club_billing_config`. 143 test assertions.
- **Step 2** ✓ (S31): Result entry RPCs + `audit_log`. **Step 3a** ✓ (S32): `bet_requests` + `sporadic_pools` tables, attribution columns, 47 pipeline tests.

### Next (Execution Plan Steps)
- **Step 4+5: Bookkeeper Bet Entry + Match Enhancements + Per-Match Report** ✓ (Sessions 33–55) — All 6 unified items (#4 share editing, #5 sporadic pools, #6 report rewrite, 4A–4E base features). 17 fix-now items implemented (S53). Functional testing complete: 14/14 tests pass + 5 code-review confirmed (S54–55). Export buttons placeholder only. 4G (小盤) = built but hidden. S55: 投注明細 hidden when match has result (redundant with 結算明細).

#### Roadmap — Current Priority Sequence (S83)
Reordered S83: build launch-critical features first, polish later. Fixes 1+2+5 done and validated (13/13 automated + 4/4 visual).

1. ~~Fixes 1+2+5~~ ✓ (S83) — pool eligibility, correction fetchAll, placeholder position
2. ~~Validate testplan~~ ✓ (S83) — automated script `test-p7-settlement.mjs`, 13/13 pass
3. **Step 6: Weekly Report** — `/reports` page, bookkeeper's weekly LINE deliverable `← NEXT`
4. **Step 7: Monthly Settlement** — `/settlement` page, real money
5. **Step 9: Auth + Member Read-Only View** — security, member access
6. Fix 3 — correction preview with projected values (~1 session)
7. Fix 4 — team label consistency (~1–2 sessions)
8. S73 sporadic pool grouping redesign
9. P12 — Overdue count reliability
10. Step 3b-lite — capacity enforcement + pending bet UI
11. P3c — Auto-placement rewire to RPC
12. Revisit/rewrite `~/.claude/CLAUDE.md` (user-driven, not Claude)

#### Standalone Design Tasks (pre-Step 6, gap-filled from S55)
- **Bets page default landing** ✓ — S60 implementation, S61 visual match confirmed.
- **Match card redesign** ✓ (S62–63)
- **Bets entry/report UI optimization** 🔄 (S63–73) — S72 UIEval complete. S73 sporadic pool fixes reverted. Reference: `archive/s73-reverted/`. Resuming at roadmap step 10.
- **Member profile/history view (Step 9b design)** — needs discussion → mockup → approval. Implementation at Step 9b.

#### Execution Plan Steps (remaining)
- **Step 6: Weekly Report (每週報表)** — `/reports` page. Per-member weekly summary, screenshot-friendly for LINE sharing, content per R22.5. Not started.
- **Step 7: Monthly Settlement (月度結算)** — auto-calculated, double-check audit, rake rounding
- **Step 9: Auth + Member Read-Only View**
- **Step 9b: Member Profile View on `/members`** — implementation of the design from the standalone task above. Not launch-blocking, ships Phase 1.
- Buffer: Presentation Prep + Step 10 (Member Bet-Placement UX)

### Parked Discussions (need design decision before building)
- **Bulk reduction naming** — naming convention still open
- **Admin permission matrix** — deferred, revisit when admin roles are built (R29.8)
- **Error code system (錯誤代碼)** — Design a structured error code framework for settlement mismatches and other system failures (example format: `SETTLE-MISMATCH-0302-G3`). This system will power the calculation-error state shown in per-match reports. Final scope, namespace structure, and error taxonomy are **not yet defined**.
- **選手 voluntary betting (S54)** — R8.4 allows it ("player or external bettor"). User believes players shouldn't be able to. Needs organizer confirmation.
- **取消封盤 after 自動派注 (S54)** — currently allowed without cleanup of auto-placed bets. Could create duplicate bets if member then self-bets. Design decision needed.
- **Export buttons (S54)** — 匯出 Excel + 快速截圖 still placeholders, need implementation.
- **Full canonical rules audit** ✓ (S75) — Complete. 12 gaps assessed against R1–R29. Priority fix list produced (13 items). See S75 wrap for consolidated findings.
- **Priority 3: `place_bet` RPC** ✓ (S78) — Implemented and functionally tested (18/18 pass). Schema migrated (`bet_config`), RPC deployed (`memory/rpcs/place_bet.sql`), paths 1+2 rewired, R5.4 client fix applied. Phase 10 artifacts saved.
- **Priority 3b: `edit_bet` RPC** ✓ (S79) — Implemented and tested. Atomic RPC for adjustAmount+swapTeam, R13.3 enforced, both tables synced. RPC deployed, `memory/rpcs/edit_bet.sql`. bulkReduce R13.3 drift also fixed. Design details: `memory/design-place-bet-rpc.md` §Priority 3b.
  - **Priority 6: `match_settlements` schema** ✓ (S80) — Table created with partial unique indexes, CHECK constraints, RLS. `provider_fee_liang` added to `settlements`. Migrations: `memory/migrations/006_match_settlements.sql`, `007_settlement_detail.sql`.
  - **Priority 7: Settlement write path** ✓ (S80) — `persistMatchSettlement`/`persistPoolSettlement` in `src/lib/settlement-actions.ts`. Auto-persists after result RPCs. `MatchSettlementReport.tsx` reads from DB (single source of truth). `CorrectionPreviewModal` for corrections. Monthly `settlements` auto-aggregated. Blastcheck: 10 consistent, 0 code issues. **S81: Functional testing complete (14/19 pass, 3 blocked by pool UI bug). Two bugs fixed: upsert constraint (007b) + liang NUMERIC columns (007c). Five additional bugs found and logged (1 critical, 2 medium, 2 low). Testplan: `memory/testplan-P7-settlement-write-path.md`.**
- **Pool section UX improvements (S78)** — Two items from functional testing: (1) Pool title should show player names + full handicap info (currently only `B隊開盤 · A隊讓2洞`). (2) Pool bet deletion (X button) should have a confirmation modal ("確定要刪除？") to prevent accidental deletes. Both are UI enhancements, not bugs. Discuss design before building.
- **Pool result entry hidden on completed matches** — ✓ Fixed S83 (Fix 1). `canEnterPoolResult()` in `src/lib/match-domain.ts`.
- **Stale state after result correction** — ✓ Fixed S83 (Fix 2). `executeMatchCorrection` now calls `fetchAll()`.
- **Pool result flow loses context** — ✓ Fixed S83. Conditional fetchAll: stay if pending pools remain, sync if all resolved.
- **Correction preview must show projected values (S81→S82 decision)** — `CorrectionPreviewModal` displays pre-correction `net_liang` with no label. S82 decided: labeling the old numbers is throwaway work. Build Option A instead: modal fetches bets/shares/billing config, runs `calculateMatchPayout` (pure TS, already in `src/lib/settlement.ts`) with both old and new winner client-side, displays per-member before/after/delta. Must handle both base match and sporadic pool contexts. No server-side RPC needed — the settlement engine is already client-side. **Scope: ~1 session** (modify `CorrectionPreviewModal.tsx` to fetch settlement inputs + run engine + redesign member list with 3-column before/after/delta layout). Needs own design discussion for the delta display format. **Scoping question:** `calculateMatchPayout` needs bets, shares, and billing config. The modal currently only fetches `match_settlements` rows — it has no access to those inputs. Design session should start with whether to pass them as props or fetch inside the modal.
- **C/D vs A/B team label mismatch (S81→S82 scope analysis)** — Matches page uses `teamLabel()` (status-based sort: active=0, scheduled=1, completed=2). Report page + 12 child components hardcode A/B. S82 found: the two pages use incompatible sort orders (status-priority vs start_time), and the blast radius is 13+ locations across 10 files (full inventory in `memory/plan-P7-bug-fixes.md` Fix 4 section). Partial fix is worse than current state (header says "C隊" but settlement columns say "A隊" on the same page). **Scope: ~1–2 sessions.** Requires: (1) design decision on canonical sort rule (recommendation: start_time ascending, created_at tiebreaker — labels stay stable across status transitions), (2) create `getMatchDisplayLabels()` in `match-domain.ts`, (3) thread label pair as props through full component tree (10 files), (4) blastcheck after.
- **Bet-exists guard on match/pool editing (S73→S83 closed)** — Investigated S83: player changes already go through `replace_match_player` RPC (R25.3, atomic void+create). Handicap changes don't invalidate bets. No guard needed — design was intentional.
- **S73 sporadic pool grouping redesign** — S73 blastcheck found 8 issues, attempted fixes, reverted all code. Critical problem: matches page grouping logic uses separate source arrays per section — new match categories create invisible matches. Before writing any sporadic pool code, redesign grouping: single source (`currentMatches`) for all groups, overdue = all past-date needing action, today = strict date match, status determines appearance, date determines placement. Then reapply verified fixes (1–6) as a unit. Reference: `archive/s73-reverted/README-s73-revert.md`.
- **Post-自動派注 workflow (S54)** — Partially resolved by removing delete (bet count stays stable). May still need a verification/count mechanism.
- **Bets landing page empty state (S83→S86)** — Resolved with present-focused scope: `/bets` still shows only scheduled/betting_closed matches, and empty state links to `/matches`.
- **Sporadic pool edit mode (S67)** — Pool bets have no edit capability (delete + re-create only). Deferred — discuss when ready.
- **Code audit — Batch 1 (Settlement)** 🔄 — see `memory/audit-batch1-settlement.md`. 6 findings (5 critical, 1 medium). Finding 6 fix shipped (commit 2024815, supabase migration `20260506161005`, **deployment unverified**). Pending: architecture for Findings 1+2 (Option A atomic RPC vs Option B durable repair state — assistant recommends B), R21.5 verbatim verification (Finding 3), Finding 4 standalone fix, R21.6 deferral-status check (Finding 5). Batches 2 (Betting) + 3 (Lifecycle) not started.
- **Bets workbench + backend safety (S86)** — Added `會員批次登錄` tab and backend safety migration. Details/deferred pool deletion RPC: `memory/design-bets-workbench-backend-safety.md`.

### End of Phase 1
- Generate bookkeeper user guide — blocked by Steps 4–9
