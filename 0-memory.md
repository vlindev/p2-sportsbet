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
- Auto-memory (`~/.claude/projects/.../memory/MEMORY.md`) handles domain rules, data model, resolved decisions — separate system, no overlap

## What's Built (as of Session 66)
- Supabase connected, 9 tables created with RLS enabled (members, matches, bets, settlements, match_team_player_shares, club_billing_config, audit_log, sporadic_pools, bet_requests)
- RLS: permissive allow_all policies on all 9 tables — replace with auth.role()='authenticated' when auth is built
- Sidebar: slate-900, orange-500 active state, hidden on mobile; MobileNav: fixed bottom bar. Overdue badge count via shared `OverdueCountContext` provider (single poll, not duplicated)
- `src/types.ts` — single source of truth for `Match`, `Bet`, `BetRequest`, `SporadicPool`, `MatchTeamPlayerShare`, `CreatedByRole`, `CreatedVia`, `MATCH_TYPE_LABEL`, `MATCH_TYPE_STYLE`. Constants typed as `Record<Match["match_type"], string>` for exhaustiveness. All consumers import from here.
- `test-data.sql` in project root — 10 TEST members, 4 matches, 30 bets, 10 settlements (cleanup: `DELETE FROM members WHERE name LIKE 'TEST%'`)
- `stress-test-bets.sql` + `seed-stress-test.mjs` — 85-bet Monday stress test (cleanup: `DELETE FROM members WHERE name LIKE 'STRESS%'`)


⚠️ **Keep test data in Supabase until launch** — needed for testing across all pages. **Before launch:** `DELETE FROM members WHERE name LIKE 'TEST%'; DELETE FROM members WHERE name LIKE 'STRESS%';` and delete `seed-stress-test.mjs` from project root.

### `/members` page — roster complete, profile planned (Step 9b)
- Full CRUD, search (live, partial, phone hyphen-normalised), edit mode toggle, add/edit/delete modals, 介紹人 click-to-jump, 本月結餘 links to /reports?member=id
- Active/inactive: toggle in edit modal only (blue/slate), deactivation confirmation popup. Table shows inactive rows as greyed-out text. 介紹人 still clickable on inactive rows (debt accountability).
- Delete blocked if member has match/bet records, error message suggests 停用
- **Planned (Step 9b):** Member profile/history view — bet history, settlement history, running balance. Bookkeeper's reference tool for answering "what was my settlement?" type questions. Historical member lookup lives here, not on bets page.

### `/bets` page — 4E v1 built (Session 34)
- **Match-first entry view** at `/bets?match=id&from=current` — match header, two-column bet list (A/B sides with counts + totals), entry form between 分潤 and 封盤 (member search → team toggle → amount toggle → instant save). Pencil edit mode per-side: toggle adjust 1↔2兩 + delete X on voluntary bets. Sorted by type→amount desc, "補" badge on auto-placed only. Members with existing bets greyed out ("已投注"). `MatchBetEntry.tsx`.
- **Member-first entry view** at `/bets` (default, no params) — date pills, member select, shows all matches for that date with per-match team/amount toggles. Secondary path for "全部買A隊" scenarios. `BetEntryView.tsx` + `MatchBetRow.tsx`.
- **(#6)** **Per-match settlement report** at `/bets?match=id&from=completed` — `MatchSettlementReport.tsx` (S50). Full settlement via `calculateMatchPayout()`. Expandable detail per member (bet lines, player flows, rake, net). Pool sections inline with fuchsia accent. `SettlementSection.tsx` per section, `SettlementRow.tsx` per member, `SettlementSummary.tsx` grand summary. Export buttons placeholder only.
- **Status-based routing**: scheduled/betting_closed → entry view, completed/active/cancelled → report view.
- Components: `src/components/Bets/` (types.ts, BetEntryView.tsx, MatchBetRow.tsx, MatchBetEntry.tsx, MatchTabBar.tsx, MatchHeader.tsx, BettingActions.tsx, ReportBetColumn.tsx, ShareRatioEditor.tsx, PoolBetSection.tsx, MatchSettlementReport.tsx, SettlementSection.tsx, SettlementRow.tsx, SettlementSummary.tsx, PoolReportHeader.tsx, settlement-helpers.ts)
- All visual/report issues resolved — see `memory/design-bets-report-issues.md`
- **(#4)** Share ratio editing — `ShareRatioEditor.tsx` (4 states: compact 50/50, custom, edit with presets/swap/estimation, locked). Integrated between MatchHeader and bet columns. R17.11 min exposure validation at 封盤 + on manual save post-封盤. `src/lib/share-validation.ts` (pure `checkMinExposure`). Auto-adjustment warning banner (amber, clears on manual edit). `pre_adjustment_bps` column tracks originals.
- **(#5)** Sporadic pool bet entry — `PoolBetSection.tsx` per pool below base bets. Pool header, fuchsia capacity bar, R5.4 restricted opening-team column, 支-based amount presets (1/2/3/5/10 + custom), ShareRatioEditor per pool (`context="sporadic_pool"`, no min exposure). **S61: R5.4 UX fix** — className priority corrected (disabled > selected), useEffect auto-clears invalid team selection on member change. Server-side validation retained as defense in depth.

### `/matches` page — complete
- 3 tabs (當前/已完成/已取消), collapsible time-based sections in 當前賽事
- Header: title + match type badge bar, stats (X場須補結果 · X場今日), 新增賽事 button
- Section headers always visible even when empty. localStorage-persisted collapse state.
- 請輸入獲勝隊伍 (overdue, always open) + 今日賽事 + 本週/下週/未來 (collapsible, with date ranges)
- Auto-transition scheduled→active (60s poll), undo toast
- Overdue: red border + muted text + card clickable + red 輸入結果 text
- All cards: hover:shadow-2xl, active/upcoming click opens edit, overdue click opens result
- Result entry (2-step + correction flow), correction via pencil icon top-right
- Completed cards: grey text, emerald result band, pencil for correction
- 已完成 tab: month picker with dropdown grid + weekly grouping (Mon–Sun, most recent week open, 本週 label in teal)
- 已取消 tab: date-grouped display
- Match type reference: hoverable badge bar next to title (Blue/Lime/Fuchsia)
- Form: 不讓分 handicap option (displays as "平盤" on form/confirmation, "vs." on card), fonts bumped up, slimmer confirmation modal
- Cross-match same-day player blocking (MemberSelect "已排賽" label), same-day duplicate name check with root matching + auto-suffix, thicker active border (border-2 border-teal-400)
- Future matches: 輸入結果 greyed out + cursor-not-allowed
- Error handling: `fetchError` state with retry button (primary=matches blocks, secondary=members degrades); `saveError` state with red banner in modal confirmation (cleared on open/close/save start)
- Result entry via atomic RPCs: `submit_match_result` / `correct_match_result` (Step 2). Single SQL transaction with `FOR UPDATE` row lock, idempotency guards, per-bet audit log entries, `AND sporadic_pool_id IS NULL` filter (base match bets only — sporadic pool bets settle independently per R5.7). Client calls `.rpc()` directly.
- **(4A)** Mandatory self-bets: 4 × 5兩 bets auto-inserted at match creation (R7.1–R7.6), `system/rule_engine` attribution
- **(4B)** Inbox Zero: after result entry, card transforms in-place (greyed text, emerald band, pencil). No fetchAll, no tab switch, no reordering. `justCompleted` Map drives visual overrides. Auto-poll paused during batch. Cleanup on tab switch.
- **(4C)** 封盤/取消封盤 — **S62: removed from matches page entirely (S38 reversal).** All bet actions (封盤, 取消封盤, 自動派注) now exclusively on bets page. `CloseBettingModal.tsx` shared by BettingActions + MatchListActions (bets page only).
- **(4D)** 自動派注 — on bets page only (BettingActions + MatchListActions). runs `autoPlaceMonday()` algorithm, inserts `bet_requests` (accepted) + `bets` with `system/scheduled_job` attribution.
- **(4E)** Bookkeeper bet entry — match-first primary (`/bets?match=id`, instant save, remove via DELETE) + member-first secondary (`/bets` default). Teal "管理投注" on scheduled/betting_closed match cards → navigates to entry view. `bookkeeper/manual` attribution.
- **Player replacement RPC** (Session 41) — `replace_match_player` Supabase RPC. Atomic: void old self-bet + create new + update player column + transfer shares + audit log. Called from `confirmSave()` when player slots change. R25.4 conflict detection (incoming player has voluntary bet). Allows scheduled + betting_closed.
- **Multi-match selector** (Session 41→54) — `MatchTabBar.tsx`. Session 54: rewritten from pill buttons to `<select>` dropdown with full match names (no truncation). Same-day match switching on both entry and report views.
- **封盤 + 自動派注 + 全額降注 on bets page** (Session 41, updated 42) — `BettingActions.tsx` component. Amber banner when betting_closed. 自動派注 (Monday). 全額降注 modal (A隊/B隊/全部, 2兩→1兩) with audit log entry + stronger confirmation text. Matches page actions untouched (both pages have access).
- **Shared MatchHeader** (Session 42) — `MatchHeader.tsx`. Layout B stacked format used by both `MatchBetEntry` and `MatchBetReport`. Single source of truth for match header layout.
- **ReportBetColumn** (Session 42) — `ReportBetColumn.tsx`. Extracted from report view. Win/loss styling logic, bet type badges. Isolated for future growth (Step 6 report rewrite).
- **S62 match card redesign** — footer: 3-item spread (`管理投注` | `+ 加強盤` | `輸入結果 >`), Option C labels (管理投注 for editable, 查看投注 for completed). Player names horizontal with dot separator. Date/time combined inline (`YYYY-MM-DD · HH:MM`). Pool child cards rebuilt: full match cards with teams/handicap/footer, `bg-fuchsia-50`, pencil → parent edit, correction pencil in emerald band. Parent + pools wrapped in single div (grid fix). Removed parent completed pool section (redundant). **Awaiting visual feedback next session.**
- **(#5)** Sporadic pools on matches page (Session 49) — `+ 加強盤` button on scheduled/betting_closed cards. `PoolCreationModal.tsx` (`src/components/Matches/`): creates pool + auto-creates 50/50 share rows per team. Pool child cards with fuchsia left border below parent (S62: rebuilt as full match cards). Pool count badge (`加強盤 ×N`) on parent card. Pool result entry/correction modal (calls `submit_pool_result` / `correct_pool_result` RPCs). Atomic `cancel_match` RPC replaces old non-atomic two-write cancellation.
- **(#5)** Pool RPCs (Session 49) — `submit_pool_result` (lock + fan-out + audit), `correct_pool_result` (flip + audit), `cancel_match` (atomic: void bets + expire requests + cancel pools + audit). SQL archived S56.

### Auto-Placement Engine — `src/lib/auto-placement.ts`
- Pure function, no Supabase dependency. R10.4 3-step algorithm: count → amount → tiebreaker (Team A). Per-member recalculation after each placement.
- `tests/auto-placement.test.ts` — 10 tests (count balancing, Session 20 scenario, amount balancing, tiebreaker, edge cases, immutability).

### Settlement Engine — Step 1 complete (Session 29)
- `src/lib/settlement.ts` — pure TypeScript, no Supabase dependency. Integer-only NTD arithmetic (R18.1). Two primitives: `floorDiv` (R18.3), `roundHalfUp` (四捨五入). Functions: `allocateByShares` (R18.4), `calculateRake` (R19.4), `calculateProviderFee` (R20.4), `calculateMatchPayout` (R16+R21), `calculateMonthlySettlement` (R21.3), `generateDefaultShares` (R17.4).
- `tests/settlement.test.ts` — 143 assertions. Session 20 verified example + edge cases (60/40 shares, odd totals, players-only, 小盤, provider fee active/free) + degenerate cases (lopsided, zero-bets).
- `match_team_player_shares` table — R17.2. Auto-populated at match creation (INSERT only, 50/50 default). UPDATE does not touch shares.
- `club_billing_config` table — R20.2. Seeded: 100 BPS (1%), 6 months free from 2026-05-11.

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

## Pre-Launch Execution Plan (MVP)
⚠️ **Full plan:** `~/.claude/plans/ticklish-chasing-cocke.md` — finalized Session 28. Phase A (Mar 4–Apr 7, 13–19 sessions) → Blackout (Apr 8–26) → Phase B Polish (Apr 27–30) → Launch (May 4 presentation, May 11 go live) → Phase C post-launch. Visual roadmap: `3-mockup-HTML/Mockup-Execution-Roadmap.html`. Step 3 split into 3a (schema) / 3b (concurrency). Member read-only view ships at launch (Step 9). **Steps 4+5 fully tested (S55). Implementation plan: `memory/plan-*` files (6 files). Deferred: `plan-deferred.md` (Step 7 guard, R24.4).**

## TODO
### Done ✓
- Sessions 1–10: deepcheck/bonsai/preference-capture upgrades, security rules, bonsai trim, phase roadmap, matches page UI overhaul, members page active/inactive redesign, 已完成 weekly grouping + month picker dropdown.
- Sessions 21–26: Canonical rules normalization (5a SQL, 5b code, grep gate, 5c SQL). All OQs resolved Session 22.
- **Step 1: Settlement Engine + Financial Foundation** ✓ (Session 29–30) — `src/lib/settlement.ts`, `tests/settlement.test.ts` (143 assertions), `match_team_player_shares` + `club_billing_config` tables, auto-populate shares at match creation. Payout verification test suite complete.
- **Step 2: Result Entry RPC + Audit Log** ✓ (Session 31) — `submit_match_result` + `correct_match_result` RPCs (atomic, `FOR UPDATE`, idempotency guards, per-bet audit entries). `audit_log` table (append-only RLS). `submitResult()` client code reduced 113→31 lines. 5/5 tests passing.
- **Step 3a: Bet Pipeline — Schema + Basic Routing** ✓ (Session 32) — `bet_requests` + `sporadic_pools` tables, attribution columns on `bets` (backfilled per R26.7), partial unique indexes (base + pool), `src/lib/bet-pipeline.ts` (routing/validation/capacity/cancellation, 47 tests). RPCs updated with `sporadic_pool_id IS NULL` filter.

### Next (Execution Plan Steps)
- **Step 4+5: Bookkeeper Bet Entry + Match Enhancements + Per-Match Report** ✓ (Sessions 33–55) — All 6 unified items (#4 share editing, #5 sporadic pools, #6 report rewrite, 4A–4E base features). 17 fix-now items implemented (S53). Functional testing complete: 14/14 tests pass + 5 code-review confirmed (S54–55). Export buttons placeholder only. 4G (小盤) = built but hidden. S55: 投注明細 hidden when match has result (redundant with 結算明細).

#### ⬛ Standalone Design Tasks (pre-Step 6, gap-filled from S55)
These are NOT part of any execution plan step. They emerged from the S55 page responsibilities discussion as work the plan didn't originally account for. Must be completed before Step 6.
- **Bets page default landing** ✓ — match list tab + member lookup tab. Architecture locked (S55), information requirements confirmed (S57), **mockup v7 approved (S59)** at `3-mockup-HTML/Mockup-Bets-Landing.html`. **S60: Implementation complete (SIP Step 6). S61: SIP Step 7 complete (user confirmed visual match). 9 files in `src/components/BetsLanding/`, shared `src/lib/betting-actions.ts`. Back navigation fixed (from=bets → 返回投注).**
- **Match card redesign** ✓ (S62–63) — footer 3-item spread, Option C labels, horizontal player names, date/time combined, pool child cards (fuchsia outline, collapsible via tag, hover stack animation), 封盤 removed from matches page, 輸入結果 hidden on scheduled/betting_closed, B隊開盤 prominent badge, bigger tap targets, card-wide click removed. `items-start` on grids.
- **Bets entry/report UI optimization** 🔄 (S63–66) — Full UX/UI evaluation → 13 fixes → mockup v3 (S63) → v4 (S64) → v5 (S65). v5: typography applied (14px floor, 12px badges, 16px buttons), 分潤比例→選手佔成, per-player hero % for non-50/50, dropdown custom arrow, 編輯→pencil only. Full decision log: `memory/design-bets-entry-report-redesign.md`. **S66: SIP Steps 5–6 complete. All 8 components implemented via 3-batch protocol.** Changes: MatchHeader date combine, MatchTabBar optgroup, SettlementSection R2/R3, SettlementRow R1 chevron, SettlementSummary R8 metric cards, BettingActions→modals-only, MatchBetEntry absorbed toggle+banner+form+bet columns, ShareRatioEditor→metric card hero %. **SIP Step 7 (visual sanity check) next.**
- **Member profile/history view (Step 9b design)** — expand `/members` from roster CRUD to member reference tool. Bet history, settlement history, running balance. Historical member questions route here, not to bets page. **Needs: discussion → mockup → approval.** Implementation can wait until Step 9b in the plan sequence.

#### Execution Plan Steps (remaining)
- **Step 3b-lite: Capacity Check + Pending Bet UI** — Split from Step 3b (S60). Enforce capacity limits on optional matches, pending/confirmed visual distinction, accept/reject flow. Current code skips capacity entirely — correctness issue, not just scaling. Does NOT need concurrency layer. Needs own session (discussion → plan → build).
- **Step 6: Weekly Report (每週報表)** — `/reports` page. Per-member weekly summary, screenshot-friendly for LINE sharing, content per R22.5. Separate page, separate scope. Not started.
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
- **Full canonical rules audit (S60)** — Systematic check of all R1–R29 rules against implementation code. Not yet started.

### End of Phase 1
- Generate bookkeeper user guide — blocked by Steps 4–9
