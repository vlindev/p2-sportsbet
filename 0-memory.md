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

## What's Built (as of Session 72)
- Supabase connected, 9 tables with RLS (members, matches, bets, settlements, match_team_player_shares, club_billing_config, audit_log, sporadic_pools, bet_requests)
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
- **Landing page** (`/bets` default) — `src/components/BetsLanding/` (9 files). Match list tab + member lookup tab. Shared actions in `src/lib/betting-actions.ts`.
- **Per-match report** (`/bets?match=id&from=completed`) — `MatchSettlementReport.tsx` + settlement components. Pool sections inline.
- **Status-based routing**: scheduled/betting_closed → entry, completed/active/cancelled → report.
- Components: `src/components/Bets/` (16 files). Share editing (#4), sporadic pools (#5), report (#6). All issues resolved — see `memory/design-bets-report-issues.md`.
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
⚠️ **Full plan:** `~/.claude/plans/ticklish-chasing-cocke.md` — finalized Session 28. Phase A (Mar 4–Apr 7, 13–19 sessions) → Blackout (Apr 8–26) → Phase B Polish (Apr 27–30) → Launch (May 4 presentation, May 11 go live) → Phase C post-launch. Visual roadmap: `3-mockup-HTML/Mockup-Execution-Roadmap.html`. Step 3 split into 3a (schema) / 3b (concurrency). Member read-only view ships at launch (Step 9). **Steps 4+5 fully tested (S55). Implementation plan: `memory/plan-*` files (6 files). Deferred: `plan-deferred.md` (Step 7 guard, R24.4).**

## TODO
### Done ✓
- Sessions 1–10: matches/members page UI, security rules, phase roadmap.
- Sessions 21–26: canonical rules normalization (R1–R29). All OQs resolved S22.
- **Step 1** ✓ (S29–30): Settlement engine + `match_team_player_shares` + `club_billing_config`. 143 test assertions.
- **Step 2** ✓ (S31): Result entry RPCs + `audit_log`. **Step 3a** ✓ (S32): `bet_requests` + `sporadic_pools` tables, attribution columns, 47 pipeline tests.

### Next (Execution Plan Steps)
- **Step 4+5: Bookkeeper Bet Entry + Match Enhancements + Per-Match Report** ✓ (Sessions 33–55) — All 6 unified items (#4 share editing, #5 sporadic pools, #6 report rewrite, 4A–4E base features). 17 fix-now items implemented (S53). Functional testing complete: 14/14 tests pass + 5 code-review confirmed (S54–55). Export buttons placeholder only. 4G (小盤) = built but hidden. S55: 投注明細 hidden when match has result (redundant with 結算明細).

#### ⬛ Standalone Design Tasks (pre-Step 6, gap-filled from S55)
These are NOT part of any execution plan step. They emerged from the S55 page responsibilities discussion as work the plan didn't originally account for. Must be completed before Step 6.
- **Bets page default landing** ✓ — match list tab + member lookup tab. Architecture locked (S55), information requirements confirmed (S57), **mockup v7 approved (S59)** at `3-mockup-HTML/Mockup-Bets-Landing.html`. **S60: Implementation complete (SIP Step 6). S61: SIP Step 7 complete (user confirmed visual match). 9 files in `src/components/BetsLanding/`, shared `src/lib/betting-actions.ts`. Back navigation fixed (from=bets → 返回投注).**
- **Match card redesign** ✓ (S62–63) — footer 3-item spread, Option C labels, horizontal player names, date/time combined, pool child cards (fuchsia outline, collapsible via tag, hover stack animation), 封盤 removed from matches page, 輸入結果 hidden on scheduled/betting_closed, B隊開盤 prominent badge, bigger tap targets, card-wide click removed. `items-start` on grids.
- **Bets entry/report UI optimization** 🔄 (S63–72) — Full UX/UI evaluation → mockup v5 (S65) → implementation (S66) → visual/functional fixes (S67–68) → edit mode redesign (S69) → **S72: UIEval on 5 screenshots → MatchHeader hero rewrite (Option C) + 選手佔成 merged into footer + all modal fixes + typoaudit. Full decision log: `memory/design-bets-entry-report-redesign.md`. Remaining: PoolBetSection visual check (ShareRatioEditor standalone), post-自動派注 verification, sporadic pool edit.**
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
