# Implementation Plan — Deferred to Phase 2+

Items deferred to post-launch polish or Phase 2. Not needed for MVP launch.
Source: UI audit (S51) + Backend audit (S52).

---

## UI-5 | Export button emojis

**What:** Export buttons in `SettlementSummary.tsx` are missing 📄 and 📷 emojis that the mockup shows.
**Why deferred:** Cosmetic. Export functionality itself is placeholder-only (buttons exist, no implementation).
**Trigger:** When export is actually implemented (Excel export + screenshot feature).

---

## UI-6 | Error state not implemented

**What:** Red triangle banner with `--` amounts and `請聯繫系統管理員` message when `calculateMatchPayout()` fails. Described in `plan-report-rewrite.md §6.6`.
**Why deferred:** Engine is well-tested (143 assertions). Crash is unlikely. 🟠-2 and 🟠-3 (fix-now) cover the most probable error paths (missing billing config, missing shares).
**Trigger:** Before launch. The remaining uncovered case is an unexpected throw from the settlement engine itself. Add a try/catch wrapper around `calculateMatchPayout()` that renders the error state.

---

## 🔵-1 | Player betting on opposing team → invisible in settlement display

**What:** A player on side A can place a voluntary bet on side B. Settlement engine handles this correctly, but `SettlementSection.tsx:buildSideRows` only places the player in side A's column. Their opposing-team bet and its settlement impact are invisible in the report.
**Why deferred:** Display-layer redesign — `buildSideRows` fundamentally groups by player membership, not bet direction. A member would need to appear in both columns, or the detail view needs cross-side aggregation. Not a one-liner. Edge case is rare (player voluntarily betting against their own team).
**Trigger:** If the bookkeeper reports a missing bet in the settlement report, or during Phase 2 report polish.

---

## 🔵-2 | Hardcoded "抽水 (5%)" label

**What:** `SettlementSection.tsx:54,59` hardcodes "5%" in the rake label. The settlement engine calculates the correct amount but doesn't surface the applied rate to the display layer.
**Why deferred:** Rake rate is fixed at 5% for Casino Golf MVP. No configurability until Phase 3 (per-club rates via `club_billing_config.provider_rate_bps`... though that's provider fee, not rake). Rake rate itself has no configurable storage yet.
**Trigger:** Phase 3 multi-club onboarding, when rake % becomes configurable per club. At that point, pass the rate from billing config through to the display layer.

---

## Analytics | Source split tracking (bet attribution)

**What:** Display bet source breakdown (自投 vs 代入 vs 補) per match — how many bets were self-placed by members vs bookkeeper-entered vs auto-placed.
**Data:** Already captured in `bets.created_by_role` + `bets.created_via` on every bet row since Step 3a (Session 32). No schema changes needed.
**Why deferred:** In Phase 1, all voluntary bets are bookkeeper-entered — the split is meaningless until member self-service exists (Step 11). After member self-service, this becomes an adoption metric ("what % of members are using the system directly?").
**Where it fits:** Phase 3 data analytics dashboard. Also useful as a bookkeeper dashboard widget once member self-service is live.
**Trigger:** After Step 11 (member bet-placement) is deployed and members start self-placing bets. Surface on a dashboard or bets page overview.

---

## 🔵-4 | Zero bets on one side — display could confuse

**What:** If all bets are on one side, the other side shows "尚無投注". Settlement runs correctly (flows are 0 for the empty side). Players on the empty side show only flow impacts, no bets — technically correct but potentially confusing.
**Why deferred:** Math is correct. Display handles it ("尚無投注" placeholder). Extremely unlikely in practice — Monday matches have 85+ members betting, optional matches have the bookkeeper distributing bets.
**Trigger:** If the bookkeeper reports confusion on a lopsided match report, or during Phase 2 report polish.

---

## LINE Integration | Chat jump button + LINE Login auth

**What:** Button on member lookup that opens a direct LINE chat with that member. Two variants: (1) jump to private chat, (2) jump to group chat.
**Technical requirement:** Needs LINE internal `userMid` per member. URL scheme: `line://ti/p/{userMid}` for private chat. Group chat jump also possible with group ID.
**Acquisition path:** The cleanest way to get `userMid` is as a byproduct of LINE Login (OAuth). If Step 9 (auth) uses LINE Login as the auth provider, each member's `userMid` is captured automatically at first login. Manual entry or LINE Official Account API are worse paths (error-prone, require behavior change).
**Schema:** Add `line_user_id` (nullable text) to `members` table. Populated automatically via LINE Login or manually as fallback.
**Why deferred:** Requires LINE Login integration (OAuth flow, LINE Developers console, channel creation). This is Step 9 scope. Building a standalone jump button before auth means acquiring IDs through a worse path.
**Dependency:** Step 9 auth provider decision. If LINE Login is chosen → chat jump is free. If token-based auth is chosen → LINE integration requires separate work.
**Trigger:** Step 9 auth design. When evaluating auth providers, include "LINE chat jump as a free byproduct" in the LINE Login pros column.
**Interim:** `tel:` phone link is trivially available (phone already in members table). Covers the "contact member" need until LINE integration exists.
