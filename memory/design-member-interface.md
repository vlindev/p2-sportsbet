# Session 20 — Direction Pivot Record
**Date:** 2026-03-03 | **Type:** Brainstorm only — no code changes

> **Why this file exists:** Session 20 is the sharp turn in project direction. The fundamental payout model was corrected, member-facing interface was explored as Phase 1 scope, and multiple rules were clarified directly with the organizer. This file is the permanent record. Do not trim or condense — every detail matters.

---

## Part 1: Strategic Shift — Member-Facing Interface

### The Realization
After conversations with actual club members, Veronica identified that a member-facing interface is **core to the value proposition**, not a Phase 2 polish item. Without it, members see "a website the bookkeeper uses" and don't understand why they're paying a rake. With it, they see their own data, their own matches, their own balances.

### What Members Need (minimum, not nice-to-have)
- **As bettor:** Who's playing who, handicap, bet distribution per team (how many people on each side)
- **As player:** How much money is riding on their match (potential upside/downside)
- Currently all of this is buried in the Line group chat alongside stickers, dinner announcements, financial reports, yearly game announcements, and random conversation

### The "Two Doors, One Room" Architecture
- **Lane A (self-service):** Members open the system directly, view matches, place bets, confirm
- **Lane B (Line holdouts):** Members bet via Line message, bookkeeper enters for them
- Both lanes write to the **same database, same table, same row format**
- A `source` field tracks who created the bet (member / bookkeeper / auto_placed) — this is metadata for the bookkeeper's dashboard, not logic. Settlement engine ignores it.
- **Bookkeeper role shifts from data entry to auditor/safety net**

### Auth Decision
- **Phase 1: Option A — Personal unique link per member** (e.g., `site.com/m/x8kf2`). Bookkeeper sends via Line DM. Member bookmarks it. Zero login friction. Risk of link-sharing is low in a private 85-person club.
- **Upgrade path: Option B — Phone + SMS code.** If link-sharing becomes a concern.
- **Long-term ideal: Option C — LINE Login (LIFF).** Zero friction via LINE's auth. Adds platform dependency.

### Adoption Strategy — Gravity Model
No forced migration. Three lanes coexist:
- **Lane 1 (holdouts, ~40-50%):** Keep betting via Line. Bookkeeper enters for them. Nothing changes.
- **Lane 2 (curious, ~30-40%):** Open the system, look around, maybe place a bet one Monday.
- **Lane 3 (early adopters, ~10-20%):** Place bets, check results, love it. Social proof drives others.

Natural gravity over 6 months. Bookkeeper handles mistakes regardless of channel. The banking/7-Eleven/healthcare parallel: two input channels, one system of record, one operator bridging the gap.

### Data Collision Risks (identified and resolved)
1. **Duplicate bet** (member self-places AND sends Line message): Bookkeeper dashboard shows existing bets per member per match — prevents double-entry at UI level.
2. **Contradictory bet** (member bets A in system, messages "actually B" in Line): Bookkeeper sees both, edits the existing bet. One bet per member per match enforced.
3. **Timing edge case** (simultaneous writes): Database unique constraint rejects the second write.

### Member UX Flow (prototyped in `3-mockup-HTML/Mockup-Member-Interface.html`)
1. Member opens bookmarked link → lands on match list with progress bar (X/7 已下注)
2. Each match card shows: teams, handicap, bet distribution bar, implied payout
3. Tap "下注" → bottom sheet modal: pick team (big buttons), pick amount (preset buttons), see estimated payout with rake, confirm
4. Toast confirmation → back to match list → progress bar updates
5. Bottom nav: "賽事" (matches) + "我的紀錄" (my record) with red badge showing remaining unbetted matches
6. "我的紀錄" accessible anytime — shows incomplete banner ("還有 X 場未下注") with one-tap back to match list
7. When 7/7 complete → auto-redirect to "我的紀錄" with green "全部完成" banner, summary stats, per-match breakdown, monthly balance

### Impact on Phase Roadmap (not decided, under discussion)
If member-facing becomes Phase 1, the roadmap rewrites entirely:
- Phase 1: Bookkeeper tool + member betting + member view + D1 dinner presentation
- Phase 2: Player stats, history, analytics teaser, polish
- Phase 3: Multi-club, commercial

---

## Part 2: Payout Model Correction (CRITICAL)

### What Was Wrong
Previously documented as a "pool model" where uneven sides split proportionally. **This was incorrect.**

### The Correct Model — 1:1 with Players as House
Confirmed directly with the organizer. Two money flows per match:

**Flow 1: All losing bets → winning team's two players**
- Every person who bet on the losing side loses their bet amount
- All that money is collected by the winning team's two players (split evenly)

**Flow 2: All winning bets paid 1:1 → by losing team's two players**
- Every person who bet on the winning side wins the same amount they bet (1:1)
- The losing team's two players are responsible for paying ALL of these winnings

### Verified Example
Match: A vs B. A wins.

**Before rake:**

| Person | Role | Bet On | Amount | Flow 1 | Flow 2 | Net |
|---|---|---|---|---|---|---|
| 張大明 | A player | A | 5兩 | +15兩 (half of B's 30兩) | +5兩 (self-bet win) | **+20兩** |
| 李志強 | A player | A | 5兩 | +15兩 | +5兩 | **+20兩** |
| 小陳 | External | A | 1兩 | — | +1兩 | **+1兩** |
| 小林 | External | A | 2兩 | — | +2兩 | **+2兩** |
| 小王 | External | A | 5兩 | — | +5兩 | **+5兩** |
| 小黃 | External | B | 4兩 | -4兩 (to A players) | — | **-4兩** |
| 小趙 | External | B | 3兩 | -3兩 | — | **-3兩** |
| 小周 | External | B | 6兩 | -6兩 | — | **-6兩** |
| 小吳 | External | B | 2兩 | -2兩 | — | **-2兩** |
| 小蔡 | External | B | 5兩 | -5兩 | — | **-5兩** |
| 王建宏 | B player | B | 5兩 | -5兩 (own stake) | -9兩 (pay winners) | **-14兩** |
| 林俊傑 | B player | B | 5兩 | -5兩 | -9兩 | **-14兩** |

**Balance check:** +20+20+1+2+5-4-3-6-2-5-14-14 = 0 ✓

### Key Insight
**Players = house.** They absorb all external bet flow. Winning players collect ALL losing money AND get their self-bet paid. Losing players lose their stake AND pay ALL winners. Player risk/reward is dramatically higher than external bettors.

---

## Part 3: Rake Rule (NEW — never documented before)

### The Rule
5% from every winner's winnings, then **四捨五入到百位整數 (NTD)** (round to nearest $100).

### Calculation
1. Winner's net gain (兩)
2. × 5% = raw rake (兩)
3. × 1000 = raw rake (NTD)
4. 四捨五入到百位 = actual rake (NTD)
5. ÷ 1000 = actual rake (兩)

### Examples from verified scenario

| Winner | Winnings | 5% | In NTD | Rounded | Rake | Net |
|---|---|---|---|---|---|---|
| 張大明 | 20兩 | 1兩 | $1,000 | $1,000 | 1兩 | **19兩** |
| 李志強 | 20兩 | 1兩 | $1,000 | $1,000 | 1兩 | **19兩** |
| 小陳 | 1兩 | 0.05兩 | $50 | $100 | 0.1兩 | **0.9兩** |
| 小林 | 2兩 | 0.1兩 | $100 | $100 | 0.1兩 | **1.9兩** |
| 小王 | 5兩 | 0.25兩 | $250 | $300 | 0.3兩 | **4.7兩** |

**Total rake this match: $2,500 (2.5兩)**

**Losers are NOT raked** — only winners pay rake.

---

## Part 4: Monday Auto-Placement Rules (Corrected)

### What Was Wrong
Previously documented as "LIFO balancing" where bets are dropped from the over-subscribed side. **LIFO is NOT used for Monday matches.** (Preserved for 加強版 only.)

### The Correct Algorithm

**Round 1 — Balance by COUNT (人數):**
- Count bets on each side
- Auto-place (1兩 each) on the side with fewer PEOPLE until both sides have equal count

**Round 2 — Balance by AMOUNT (兩數):**
- Check total amount on each side
- Remaining auto-bets go to the side with less total amount

**Tiebreaker:**
- If amounts are equal and one odd person remains → default to first team (A/C/E)

### Verified Example
Starting: A隊 30人 50兩 / B隊 25人 60兩. 10 members forgot to bet.
- Round 1: 5 to B (balance count) → A: 30人 50兩 / B: 30人 65兩
- Round 2: A has less amount → all 5 to A → **A: 35人 55兩 / B: 30人 65兩**

---

## Part 5: Remaining Organizer Questions

### Pending from This Session (OQ3+)

**OQ3 — Do losing players always split 50/50?**
Asked but not yet answered. Critical for settlement calculation.

**OQ4 — Can members edit or cancel their own bets before the deadline?**
If yes: member interface needs edit/delete actions on placed bets.
If no: members must call bookkeeper to fix mistakes (same as today via Line).

**OQ5 — Deadline edge case: bet submitted at 6:59pm, server processes at 7:00:01pm.**
Accept or reject? Need a hard rule. Options: (a) server timestamp is law — reject, (b) grace window, (c) submitted-time is law.

**OQ6 — Is the mandatory self-bet (5兩) auto-placed by the system when match is created?**
Or does the player still place it themselves? Affects whether it shows as locked/pre-filled in the member UI.

**OQ7 — What do members see AFTER Monday?**
Do they see live results as matches complete? Or just "completed" status after bookkeeper enters the result? Determines whether there's a real-time element.

**OQ8 — For Optional/Sporadic matches, does the same 1:1 payout model apply?**
Or do different match types have different payout rules?

**OQ9 — Does the rake rounding rule (四捨五入到百位) apply to all match types?**
Or only Monday?

**OQ10 — When there are 7 Monday matches, is auto-placement done independently per match?**
Or is there any cross-match consideration?

### Previously Pending (from MEMORY.md, still unconfirmed)

1. Hole-in-one = 4pts cap
2. Sunday 7pm cutoff is year-round
3. 讓洞 exact mechanics + which holes apply
4. Full rule differences: Monday vs Optional vs Sporadic
5. 加強版 — confirm bettors can only back the weak team

---

## Part 6: Caution Flags

Items that need attention before implementation. See main conversation for proposed actions.

1. **MEMORY.md payout documentation** — Multiple sections based on incorrect pool model. Needs complete rewrite.
2. **Bet report page (`/bets?match=id`)** — Already built, based on old model. Needs redesign.
3. **Rake rounding rule** — New rule, not in any code or documentation. Must be in settlement calculation.
4. **Member-facing data accuracy** — 85 members seeing financial data demands perfect accuracy from day one. Needs comprehensive test suite before launch.

---

## Files Created This Session
- `3-mockup-HTML/Mockup-Dual-Betting-Flow.html` — Dual-channel information flow diagram (not production code)
- `3-mockup-HTML/Mockup-Member-Interface.html` — Interactive member UI prototype in phone frame (not production code)
- `memory/design-member-interface.md` — This file (formerly session20-direction-pivot.md → payout-model-and-member-interface.md)

---

*This document is a permanent record. Do not trim, condense, or move to backup. It is referenced by MEMORY.md and is essential context for all future sessions.*
