# Page Responsibilities & Information Architecture

> **Reference document** — defines what each page owns, what information it shows, and how pages connect. Use as a constraint when designing any page's UI. Established Session 55.

---

## Foundational Principle: Three-Role Bookkeeper

The bookkeeper simultaneously operates as three roles. Every page design must be evaluated against all three — not just the role most obviously served by that page.

| Role | What she's doing | Mental state | Speed requirement |
|------|-----------------|--------------|-------------------|
| **Data entry operator** | Processing LINE messages into bets, one match at a time | "I have a message to enter" | Medium — accuracy matters more than speed |
| **Member support agent** | Answering member questions: "did I bet?", "what was my settlement?", "who won?" | "A member is asking me something" | High — member is waiting for an answer |
| **Operations manager** | Tracking deadlines, coverage, 封盤 status, chasing stragglers | "What's the overall status?" | Medium — scanning, not clicking |

The system must support all three without requiring her to think about which mode she's in. She doesn't switch modes — she switches tasks mid-flow, constantly.

---

## Page Architecture

### `/matches` — Match Management (Card View)

**Interaction pattern:** Cards. One action per card with full visual context (status, teams, handicap, overdue indicators).

**What this page owns:**
- Match CRUD (create, edit, delete)
- Match lifecycle status dashboard (overdue, today, upcoming, completed, cancelled)
- Result entry + result correction
- Match-level status at a glance ("who won?", "which matches need results?")

**What this page shows:**
- All matches organized by status/time (3 tabs: 當前/已完成/已取消)
- Per-match: teams, players, handicap, match type, status, result
- Overdue section pinned at top with visual urgency (red border, muted text)
- Sporadic pool child cards below parent (fuchsia border)

**Actions available:**
- Create match (+ 新增賽事)
- Edit match (click card when scheduled/betting_closed)
- Enter result (click card when overdue/active)
- Correct result (pencil icon on completed cards)
- Create sporadic pool (+ 加強盤 on card footer)
- 封盤 toggle (per-card, kept for batch convenience on 7 Monday matches)

**Navigation OUT:**
- "投注" button on scheduled/betting_closed cards → `/bets?match=id` (entry view)
- "查看投注" on completed cards → `/bets?match=id` (report view)

**What this page does NOT own:**
- Bet entry, bet editing, bet display
- Settlement calculations or reports
- Member-specific data
- 自動派注, 全額降注

---

### `/bets` — Betting Operations (List View)

**Interaction pattern:** List. Dense, scannable, optimized for speed. Two equal tabs.

**What this page owns:**
- All betting operations (entry, editing, viewing)
- Per-match settlement reports (deep link)
- 封盤/取消封盤, 自動派注 (operational actions)
- Betting progress monitoring (cross-match overview)

#### Tab 1: Match List (Default Landing)

**Serves:** Operations manager (primary) + data entry operator (secondary, as entry funnel)

**Scope:** Status-based, not date-based. Shows all matches with status `scheduled` or `betting_closed`, regardless of date. Typically ~7-9 matches max.

**Grouping & Sort (confirmed S57–59):**
- Date section headers group matches by date: `3/17 (一)` with match count.
- No time shown on landing page (S59) — not actionable here, visible on entry page header.
- Within a date group, matches sorted by start_time ASC, then match name.
- Single sort order: chronological, nearest date first. No sort modes (S58).

**What it shows — per match row (confirmed S57, finalized S59):**
- Match name + type badge (週一/熱身) + handicap (no time) — primary identification
- Player names with team labels: `A name · name ｜ B name · name` (fullwidth bar separator)
- Combined A/B split bar (S59): single column showing bettor count per side + dual-color progress bar (teal=A, blue=B, gray=unbetted). Monday: `A 38  71/85  33 B`. Optional: `A 5 ··· 3 B` with capacity `5/20支` aligned under each side. No column headers — self-explanatory.
- Sporadic pool count indicator (fuchsia badge, if any)
- No 封盤 row styling — all rows same white background (S59)

**What it does NOT show:**
- Source split (自投/代入/補) — meaningless in Phase 1 (all bookkeeper-entered). Data tracked in DB for Phase 3 analytics. See `plan-defer-phase2.md`.

**Slim status line (above match list, S58):**
- 封盤 progress: 已封盤 X/Y 場
- 自動派注 status: 已派注 X/Y 場 (Monday matches)
- No cross-match coverage metric (dropped S58 — not actionable)

**Actions available on rows:**
- Click row → navigate to `/bets?match=id` (match-first entry view, full workspace)
- 封盤 solid amber button (per row, without leaving the page)
- 派注 solid blue button (per row, Monday only, visible after 封盤; shortened from 自動派注 for visual consistency with 封盤, matches 已派注 in status line)

**Actions NOT on rows (too complex/rare for list density):**
- 全額降注 — stays inside match-first entry view only

**Key workflow this tab supports:**
Sunday crunch: scan progress → 封盤 each match → 自動派注 each match → verify 85/85 coverage. All without leaving the page.

#### Tab 2: Member Lookup

**Serves:** Member support agent (primary) + data entry operator (secondary, for 全部買A隊 scenarios)

**Scope:** Same as Tab 1 — all matches with status `scheduled` or `betting_closed`.

**What it shows (confirmed S57, refined S58):**
- Member search (by name)
- Per-match bet status for selected member: team, amount, bet type badge (補 only)
- Is-player label per match (選手 — mandatory self-bet, not editable)
- Mandatory unbetted: orange highlight + inline A/B quick-pick buttons
- Optional unbetted: neutral treatment, subtle "新增 →" button (not orange — betting is voluntary)
- Summary count split: `週一 X/Y 場 · 熱身 X/Y 場` (S58)
- Amount toggle (1兩/2兩) for quick bet entry
- "全部買 A/B" bulk action for mandatory unbetted matches only
- Compact date label per match when matches span multiple days
- Edit button per existing bet → links out to `/bets?match=id` (match-first entry view). No inline editing.

**What this tab does NOT show:**
- Historical bet data (last week, last month) — belongs on `/members` (Step 9b)
- Settlement history — belongs on `/members` (Step 9b)
- Member total exposure — belongs on `/members` profile (financial summary)
- Member phone/contact — future: LINE chat jump button (requires LINE Login, see `plan-defer-phase2.md`)

#### Deep Link: Per-Match Report (`/bets?match=id` with completed match)

**Not a tab — a deep-link destination.** Accessed from:
- Matches page "查看投注" button on completed cards
- Future member profile (click a match in member's history)
- Any URL that resolves to a completed match

**What it shows:**
- Full settlement breakdown: per-member expandable rows (bets, player flows, rake, net)
- Sporadic pool sections inline below base match (fuchsia accent)
- Grand summary with base + pool totals
- Share ratios (locked, read-only)

**Routing logic:**
- `?match=id` with scheduled/betting_closed → entry view (MatchBetEntry)
- `?match=id` with completed/active/cancelled → report view (MatchSettlementReport)
- No `?match` param → default landing (match list tab)

---

### `/members` — Member Management + Member Reference

**Interaction pattern:** Table (roster) + profile/history view (Step 9b, planned).

**What this page owns:**
- Member CRUD (add, edit, deactivate, delete)
- Member roster (search, filter, active/inactive)
- Member profile/history (Step 9b): bet history, settlement history, running balance, referrer info
- Historical member-specific questions ("what was my settlement last week?")

**Current state (built):**
- Full CRUD table with search
- Active/inactive toggle in edit modal
- 介紹人 click-to-jump
- 本月結餘 links to `/reports?member=id`

**Planned expansion (Step 9b):**
- Click member → profile view with:
  - Bet history (all matches, bets, win/loss, amounts)
  - Settlement history (monthly balances, settled/outstanding)
  - Running balance
  - Referrer info, contact info
- Date range selector for historical lookups
- Click a specific match in history → deep link to `/bets?match=id` (report view)

**Why historical lookup lives here, not on `/bets`:**
- "What was my settlement?" is a question about a person, not about today's betting operations
- Keeps `/bets` symmetrically present-focused (both tabs same time scope)
- The bookkeeper's mental model: "I'm looking up a person" → members page. "I'm working on today's betting" → bets page
- The members page needs a purpose beyond rarely-used CRUD — this gives it one

---

### Future Pages (not yet built, included for completeness)

**`/reports` — Weekly Report (Step 6)**
- Per-member weekly snapshot: matches, bets, results, running monthly balance
- Screenshot-friendly format for LINE sharing
- One report design shared by both bookkeeper and members (full transparency, Session 44)
- Bookkeeper interface includes action controls; member interface is read-only

**`/settlement` — Monthly Settlement (Step 7)**
- Monthly balance tracking, paid/unpaid status per member
- Double-check audit (re-calculate, compare, block on mismatch)
- Settlement period = 4th Monday cutoff

**Dashboard (Step 8, floatable)**
- Active matches summary
- Upcoming settlement date
- Quick-glance operational status

---

## Navigation Map

```
Sidebar "賽事" → /matches (card view, match management)
Sidebar "投注" → /bets (match list tab, betting operations)
Sidebar "會員" → /members (roster + future profile)

/matches card "投注"     → /bets?match=id (entry view)
/matches card "查看投注"  → /bets?match=id (report view)
/bets match list row     → /bets?match=id (entry view)
/members profile match   → /bets?match=id (report view)  [Step 9b]

Within /bets:
  Tab: 賽事投注 (match list)  ↔  Tab: 會員查詢 (member lookup)
  Match list row click       →  /bets?match=id (entry view)
```

---

## Question Routing Guide

When the bookkeeper receives a question, this is where she finds the answer:

| Member asks... | Bookkeeper goes to... | Why |
|---------------|----------------------|-----|
| "Who won the Thursday match?" | `/matches` completed tab | Match-level result → matches page |
| "Did I bet on Match 3?" (today) | `/bets` member lookup tab | Current betting status → bets page |
| "What was my settlement last week?" | `/members` profile (Step 9b) | Historical member data → members page |
| "Show me the full breakdown of Match 3" | `/bets?match=id` (report deep link) | Full settlement detail → report |
| "What's the overall betting status?" | `/bets` match list tab | Cross-match overview → bets page |
| "I forgot what I bet" (today) | `/bets` member lookup tab | Current member status → bets page |
| "I forgot what I bet" (last week) | `/members` profile (Step 9b) | Historical member data → members page |
| "How much do I owe this month?" | `/members` profile (Step 9b) | Running balance → members page |

---

## Design Constraints (apply when designing any page)

1. **No mode-switching.** The bookkeeper doesn't think "am I in data entry mode?" — she switches tasks mid-flow. Every page must handle its responsibilities without requiring conscious role selection.

2. **Present vs historical is the time boundary.** `/bets` = today's active operations. `/members` = historical reference. `/matches` = match lifecycle (past and present, but match-centric not member-centric).

3. **Each page has ONE interaction pattern.** Matches = cards. Bets = list. Members = table + profile. Don't add a card view to the bets page or a list view to the matches page.

4. **Deep links are destinations, not surfaces.** The per-match report exists at a URL, not in a tab. Multiple pages can link to it. It doesn't need to be "found" through navigation — it's reached directly.

5. **Actions live where their data lives.** 封盤 and 自動派注 are on the bets page (where bet data is visible), not only on the matches page. 全額降注 is inside the match entry view (where individual bets are visible), not on the overview list.

6. **Cross-match aggregates belong on the list, not on cards.** "71/85 members have bet across all matches" is a cross-match question. Cards show one match each — they can't answer cross-match questions. The list can.

7. **The granularity split resolves overlapping questions.** Match-level → matches page. Member-level → members page. Full detail → report deep link. When in doubt about where something belongs, ask: "Is this about a match, a person, or a specific settlement breakdown?"
