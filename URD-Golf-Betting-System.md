# User Requirements Document — Golf Society Betting Management System

**Owner:** Veronica Lin · **Prepared for:** Engineering team

**Orientation.** New to this club? Read Appendix B (how the club plays and bets) and Appendix C (sporadic pools) first. For the complete Phase-1 scope at a glance, see §6.


## 1. Purpose & Success Criteria

This system replaces a manual betting-settlement workflow for a private golf society. Today one bookkeeper reads 85 members' bets out of a group chat, records them in Excel, and calculates by hand who won and lost money on each match. The system makes that automatic: the bookkeeper records bets and match results, and the system computes every member's winnings, losses, and running balance in real time.

This is **Phase 1** (see §2). Its job is narrow and deliberate. Two success criteria define "done":

1. **Provable correctness.** Every monetary calculation must match the rules in Appendix D exactly and reproduce every number in the worked example in Appendix E. This system moves real money between real people; a wrong figure is not an acceptable iteration.
2. **A first real dataset.** By operating for real matches, the system must capture a clean, complete, durable record of bets, results, and settlements — the evidence base for designing Phase 2.

## 2. Product Phases

The product will be built in three phases. **Build Phase 1 only.** Do not build Phase 2 or 3 functionality now. Do architect so that Phases 2 and 3 are not foreclosed — make the cheap future-proofing choices and defer the expensive ones.

| Phase | What it is | Status |
|---|---|---|
| **Phase 1** | Bookkeeper-facing tool for a single club. Record bets, record results, calculate settlement, produce reports. | **This document.** |
| **Phase 2** | Member-facing access: members view their own data and place their own bets. | Future |
| **Phase 3** | Scale to multiple clubs, each with its own rules and rates. | Future |

The single club for this phase is Casino Golf Society; do not hard-code club-specific rules or fee rates into program logic — hold them as configuration for potentially expanding this system to other clubs. The full Phase-1 scope is in §6.

## 3. Users

| User | Count | Role |
|---|---|---|
| **Bookkeeper (會計)** | 1 | The primary and near-sole user. Records bets, closes betting, runs auto-placement, records and corrects results, produces reports, manages weekly and monthly settlement. |
| **Admin / maintainer** | 2–3 | Oversight and correction of genuine errors that no normal workflow can fix. All such actions must be logged. |
| **Members (會員)** | 85 | **Not system users in Phase 1.** Their bets and results are recorded *about* them by the bookkeeper; they do not log in or interact with the software. |

The bookkeeper works in three modes continuously: (1) **data entry** (recording bets one member at a time), (2) **member support** (answering "did I bet?", "who won?"), and (3) **operations** (tracking deadlines, coverage, and who still owes). The system must serve all three fluidly. Speed on high-frequency actions and accuracy on money are both required.

## 4. Functional Requirements

### 4.1 Members
Maintain the roster of members: create, edit, deactivate. Each member has a name, contact number, active/inactive status, and an optional referrer (the member who introduced them). Each member row also shows their real-time unsettled balance.

### 4.2 Matches
Create, edit, and cancel matches. A match records its date and start time, type (Monday regular / optional), the players, the handicap (type, value, and which team concedes it), an optional per-side capacity limit, and its bet configuration (standard or small). The system records the final result only; it does not compute hole-by-hole scores. The bookkeeper can enter a result and later **correct** it; a correction must flow through to every affected bet and settlement without leaving stale values behind. Cancelling a match voids all its bets, and replacing a player before the match reissues that player's mandatory self-bet; both follow the match-lifecycle rules in Appendix D (R23–R25).

- **Match formats.** The system must support **2v2, 1v1, 1v2, and 1v3** — a team may have one, two, or three players, and the two sides need not be the same size. 2v2 is by far the most common (~85% of matches) but is not the only case. Player share allocation and mandatory self-bets must work for any of these sizes.
- **Assisted match creation from pasted text (nice-to-have).** In addition to entering a match manually, the bookkeeper can paste raw text copied from the group chat; the system detects the relevant details (players, teams, handicap, date/time) and presents a pre-filled match-creation **preview**. The bookkeeper reviews, corrects anything wrong, and confirms. The system never creates a match from pasted text without the bookkeeper's review.

### 4.3 Sporadic pools (加強盤)
Create one or more sporadic pools on a match, enter each pool's result, and correct it. A pool is an independent side-bet with its own handicap, capacity, and result (see Appendix C). Each pool settles on its own, separately from the base match.

### 4.4 Bet entry
Record bets on behalf of members, for both base matches and sporadic pools. The system must support all bet types (mandatory self-bets, mandatory Monday bets, and voluntary bets) and enforce the amount, team, capacity, and duplicate rules in Appendix D. Recording a bet must be **atomic** — it either fully succeeds or has no effect. The bookkeeper can adjust or reassign a recorded bet before the match is locked.

### 4.5 Betting operations
- **Betting close (封盤):** close a match to further betting, and reopen it if needed.
- **Auto-placement (自動派注):** after the Monday deadline, place a standard small bet for every member who did not bet, assigned to balance the two sides by the algorithm in Appendix D (R10).
- **Bulk reduction (全額降注):** reduce all larger bets on a chosen side down to the base amount.
- **Player share ratios:** set how a team's players split their shared winnings and losses (default even; adjustable), subject to the minimum-exposure rule in Appendix D. Settlement must use these ratios, not an assumed even split. Must work for teams of one, two, or three players.

### 4.6 Settlement, settle-tracking & reports
- **Real-time settlement:** as each match (and each pool) result is entered, compute every participant's win/loss, rake, and net — the calculation the bookkeeper previously did by hand in Excel — immediately and correctly.
- **Weekly settlement:** members settle money **weekly**. The system produces a per-member weekly settlement for the bookkeeper to confirm and then track through to payment.
- **Monthly settlement:** aggregate each member's confirmed weekly results into a monthly balance and status.
- **Confirm a settlement (commit the period's numbers):** the bookkeeper must be able to **confirm** a period's settlement — weekly and monthly — to finalize it. On confirmation the system runs the double-check (§5.1); only a confirmed settlement becomes the official record from which each member's running balance is carried forward. Live figures are committed at confirmation, not left floating.
- **Mark payment settled (settle-tracking):** once a member actually pays or is paid, the bookkeeper marks that member **settled**. On marking settled, that member's outstanding balance immediately **recalculates** — the settled amount drops out of what they owe or are owed. Marking settled is durable and terminal: a settled record is protected so that later result corrections cannot silently overwrite it. This keeps running and outstanding balances correct over time.
- **Reports** — both formatted to be screenshot-friendly for sharing in the group chat, and available for the weekly and monthly periods:
  - **All-member settlement view:** one row per member showing their balance (owed to / owed by), the running total behind it, and settled/outstanding status.
  - **Per-match breakdown:** for a single match, each participant's role (player or bettor), team, bet amount, win/loss, net, and rake, plus a match summary (winner, total pool, total rake).

### 4.7 Authentication & audit
- **Authentication:** a small number of staff accounts (bookkeeper and admins). No public or unauthenticated access to any data.
- **Audit trail:** every action that affects money — result entry, result correction, settle/unsettle, and any admin override — is recorded in an append-only log capturing who did it, when, and what changed.

## 5. Non-Functional Requirements (priority order)

1. **Financial correctness — paramount.** Every calculation matches Appendix D exactly and reproduces Appendix E. Money-affecting writes are atomic. Settlement is self-checking: it computes independently twice and blocks confirmation on any mismatch. A wrong number here is irreversible loss of trust, not a fixable bug.
2. **Security.** Real authentication; no unauthenticated data access; no secrets in client-side code.
3. **Auditability.** An append-only, tamper-evident record of every money-affecting action.
4. **Usability.** Traditional Chinese interface; usable on a phone; legible for users aged 50+ (no critical text below roughly 14px); the bookkeeper's frequent actions are fast and low-friction.
5. **Data durability.** Match, bet, and settlement data is never deleted and is retained in a form suitable for later export and analysis — it is the dataset that justifies this phase and seeds the next. Backups and recovery must be in place before real money enters the system.

## 6. Scope & Priorities (MoSCoW)

This section is the complete Phase-1 scope in one place, ranked by the MoSCoW method — the scope contract for what must ship, what may be cut under time pressure, and what is explicitly excluded.

- **Must have:** member roster (with real-time unsettled balance per member); match management for all formats (2v2, 1v1, 1v2, 1v3) with result entry and correction; sporadic pools; atomic bet entry (all types) exact to Appendix D; player share ratios; betting close; auto-placement; real-time per-match settlement; weekly settlement and reporting; monthly settlement; settlement confirmation (finalize a period's numbers, gated by the double-check); settle-tracking (mark a member paid so their outstanding balance recalculates, terminal and protected); both report views (all-member settlement view + per-match breakdown); authentication; audit trail.
- **Should have:** assisted match creation from pasted text; scheduled automation of betting-close and auto-placement (a manual trigger is acceptable at launch); bulk reduction; an operational dashboard (active matches, next settlement date).
- **Could have:** convenience refinements to the bookkeeper's high-frequency flows.
- **Won't have (this phase):** any member-facing feature; member self-service betting; multi-club onboarding; automatic odds calculation; an analytics or player-performance dashboard; group-chat / LINE integration.

---

# APPENDICES

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| 兩 (liang) | Base money unit. 1兩 = NT$1,000 exactly. Bet amounts are whole 兩. |
| 支 (zhi) | Capacity unit. 1支 = 3兩 = NT$3,000. |
| 會計 | Bookkeeper — the primary user. |
| 選手 / 球員 | Player — a member playing in a match (teams of 1–3 per side). |
| 下注者 | Bettor — a member betting on a match they are not playing in. |
| 封盤 | Betting closed — no more bets accepted (bookkeeper retains correction ability). |
| 自動派注 | Auto-placement — system-placed bets for Monday members who did not bet. |
| 全額降注 | Bulk reduction — reduce all larger bets on a side to the base amount. |
| 加強盤 / 加強版 | Sporadic pool — an independent side-bet on a match (see Appendix C). |
| Rake (水錢) | The club's cut: 5% of each winner's net gain, rounded to the nearest NT$100. |
| Provider fee | System-maintenance fee (1% of rake); free for the first 6 months of this deployment. |
| Settlement (結算) | The calculation of net money owed to or by each member; done per match, settled weekly, totalled monthly. |

## Appendix B — How this golf society plays and bets

*Background for readers who have not seen the club's rules. This is orientation; the binding rules are in Appendix D.*

**The society.** A private golf society of ~85 members who play and bet on matches together, coordinating today through a group chat. Members bet real money on match outcomes; one bookkeeper tracks it all.

**The game.** Matches are played over 18 holes, usually **2v2 best ball** (each hole, the better score of a pair counts), though **1v1, 1v2, and 1v3** also occur. Players choose their own teammates and opponents each week; the bookkeeper simply records who is playing whom. The bookkeeper enters only the **final result** — hole-by-hole play is followed live in the group chat, not in the system.

**Handicaps.** Because sides are often unequal, the players agree a handicap before play and the bookkeeper records it. Three kinds: **讓點** (the stronger team concedes N points, applied from the hardest hole down), **讓洞** (the stronger team gives extra swings on certain holes), and **不讓分 / 平盤** (no handicap, even match).

**The three match types.**
1. **週一例行賽 (Monday regular / even odds)** — every Monday. All 85 members must take part, as a player or a bettor. Players must self-bet 5兩 on their own team. Members who forget to bet are auto-placed a small bet after the Sunday deadline.
2. **熱身賽 (optional / standard)** — Thursday or Friday, depending on course availability. Voluntary.
3. **加強版 / 加強盤 (sporadic / enhanced)** — any day. Voluntary side-pools opened by a team and bet into by others. Explained in full in Appendix C.

**How the betting works.** Money is measured in **兩** (1兩 = NT$1,000) and, for capacity, in **支** (1支 = 3兩). The model is **peer-to-peer and 1:1, with the players acting as the house** — there is no bookmaker and no odds. When a match ends, all the money bet on the losing side goes to the winning team's players, and every winning bet is paid back 1:1 by the losing team's players; the players on a team split their side's winnings and losses by an agreed ratio (even by default). On Monday matches everyone bets 1兩 or 2兩; sporadic pools use larger 支-based amounts. Players' mandatory 5兩 self-bets are part of this flow.

**The club's cut (rake).** The club takes **5% of each winner's net gain** (rounded to the nearest NT$100). Losers are not charged. This is the club's revenue.

**Settlement.** No money is held by the system — it only tracks who owes whom. The bookkeeper calculates each member's net position, members settle directly with each other **weekly**, and the bookkeeper marks each as settled or outstanding. Monthly totals roll the weeks up.

## Appendix C — What a sporadic pool (加強盤) is

A sporadic pool is an optional, self-contained side-bet layered on top of a match — the club's "enhanced" betting mode. It behaves differently from ordinary match betting in specific, important ways.

**The idea.** One of the two teams "opens" a pool, setting its own handicap and a capacity limit. Other members bet *into* that pool, against the opening team. When the match ends, the pool is settled on its own handicap-adjusted result — which can differ from the base match result — with its own winners, its own 1:1 payouts, and its own rake.

**The rules that make it distinct (from R5):**
- A match may have **zero, one, or many** pools (R5.1). The same team may open more than one, each with a different handicap (R5.3).
- **You cannot bet on the team that opened the pool** — only on the opposing side (R5.4). The opening team's players are the house for that pool; they absorb the risk.
- Each pool **settles independently**: its own result, payout, and rake (R5.7). The bookkeeper enters a result for **each pool separately** (R5.8). A pool's result may differ from the base match's and from other pools on the same match.
- Pool bets are sized in **支** — multiples of 3兩, from 1支 (3兩) up to 50支 (150兩) (R5.6) — unlike base-match bets, which are 1兩 or 2兩.
- Each pool has its own **capacity** limit, at least 20支; if fewer bets come in, the pool still proceeds (R5.5).
- The same member may bet into **several pools** on the same match (R5.9).
- Pools are always **voluntary — even on a Monday**. Monday's mandatory betting applies only to the base match; no one is ever required to bet into a pool (R5.13).
- Ordinary bets (self-bets, Monday bets, plain voluntary bets) use the **base match's** handicap and result and are unaffected by any pool (R5.11).

**Plain example.** Team A is confident, so they open a pool offering Team B a generous handicap. Members who think Team B will cover that handicap bet against Team A into the pool, up to its capacity. When the round finishes, the pool is judged on its own handicap — Team A can win the actual match but *lose* the pool if they didn't cover the spread — and everyone in the pool is settled on that pool result alone, separately from the base match.

## Appendix D — Domain rules (the correctness specification)

**Read this before the rules.** This is a **peer-to-peer, players-as-house, 1:1 payout** model. It is **not** a bookmaker / odds / pooled-stakes model. There is no house edge, no odds, and no book. In every match the players *are* the house: they absorb all outside money. Two independent flows apply to each completed match — losing bets go to the winning team's players; winning bets are paid 1:1 by the losing team's players — each split between a team's players by their agreed share ratio. Standard sportsbook assumptions do not apply and will produce confidently wrong results if imported. When in doubt, follow these rules literally, not industry convention.

The complete, authoritative ruleset is the attached **`canonical-rules.md` (R1–R29)** — a frozen source of truth confirmed with the club organizer. It covers match types and scoring (R1–R4), sporadic pools (R5), money units and mandatory bets (R6–R9), the Monday auto-placement algorithm (R10), the bet pipeline and capacity (R11–R15), the payout model, player shares, arithmetic, rake, and settlement (R16–R22), match lifecycle and cancellation (R23–R25), attribution and concurrency (R26–R27), and maintainer override (R29).

**Highest-risk rules — implement to the letter, verify against Appendix E:**
- **R16** — the two money flows.
- **R17** — player share allocation, including the minimum 20兩 per-player exposure rule and the forced even split when total exposure is too small. Must generalize to teams of one, two, or three players.
- **R18** — integer-NTD arithmetic, floor division, and remainder distribution (no floating-point money).
- **R19** — rake: 5% of net gain, converted to NTD, rounded to the nearest NT$100 (half rounds up); losers are never raked.
- **R21** — two-pass settlement (bettor rows, then player flows) and the mandatory double-calculation check.

## Appendix E — Worked settlement example (acceptance test)

Given exactly these inputs, the system must produce exactly these outputs. This is a pass/fail conformance test. (This example is a 2v2 match, the most common format; the same rules apply to 1v1/1v2/1v3, with each team's flows split across however many players it has.)

**Match:** Team A vs Team B. **Result:** Team A wins. Every player has a mandatory 5兩 self-bet on their own team.

| Person | Role | Bet on | Amount | Flow 1 (losing bets → winning players) | Flow 2 (winning bets paid by losing players) | Net (before rake) |
|---|---|---|---|---|---|---|
| 張大明 | A player | A | 5兩 | +15兩 (½ of B side's 30兩 in losing bets) | +5兩 | **+20兩** |
| 李志強 | A player | A | 5兩 | +15兩 | +5兩 | **+20兩** |
| 小陳 | bettor | A | 1兩 | — | +1兩 | **+1兩** |
| 小林 | bettor | A | 2兩 | — | +2兩 | **+2兩** |
| 小王 | bettor | A | 5兩 | — | +5兩 | **+5兩** |
| 小黃 | bettor | B | 4兩 | −4兩 | — | **−4兩** |
| 小趙 | bettor | B | 3兩 | −3兩 | — | **−3兩** |
| 小周 | bettor | B | 6兩 | −6兩 | — | **−6兩** |
| 小吳 | bettor | B | 2兩 | −2兩 | — | **−2兩** |
| 小蔡 | bettor | B | 5兩 | −5兩 | — | **−5兩** |
| 王建宏 | B player | B | 5兩 | −5兩 (own stake lost) | −9兩 (½ of A side's 18兩 in winning bets) | **−14兩** |
| 林俊傑 | B player | B | 5兩 | −5兩 | −9兩 | **−14兩** |

**Invariant:** all nets sum to **0** before rake: (+20 +20 +1 +2 +5 −4 −3 −6 −2 −5 −14 −14) = 0.

**Rake — winners only, 5% of net gain, rounded to nearest NT$100, half rounds up:**

| Winner | Net gain | 5% | in NT$ | rounded | rake | Final net |
|---|---|---|---|---|---|---|
| 張大明 | 20兩 | 1兩 | $1,000 | $1,000 | 1兩 | **19兩** |
| 李志強 | 20兩 | 1兩 | $1,000 | $1,000 | 1兩 | **19兩** |
| 小陳 | 1兩 | 0.05兩 | $50 | $100 | 0.1兩 | **0.9兩** |
| 小林 | 2兩 | 0.1兩 | $100 | $100 | 0.1兩 | **1.9兩** |
| 小王 | 5兩 | 0.25兩 | $250 | $300 | 0.3兩 | **4.7兩** |

**Total rake this match: NT$2,500 (2.5兩). Losers pay no rake.**

---

### Example 2 — Sporadic pool settles independently

Team A opens a pool. Per R5.4, no one may bet on A — bettors bet on **B only**, in 支 (multiples of 3兩). A pool has no mandatory self-bets (voluntary only); the pool's house is Team A's two players, sharing 50/50. **Pool result: B wins.** All bets win; Team A's players pay them 1:1 (Flow 2 only — no losing bets, so no Flow 1).

| Person | Role | Bet on | Amount | Net (before rake) |
|---|---|---|---|---|
| 小X | bettor | B | 3兩 (1支) | **+3兩** |
| 小Y | bettor | B | 6兩 (2支) | **+6兩** |
| 小Z | bettor | B | 3兩 (1支) | **+3兩** |
| A player 1 | pool house (50%) | — | — | **−6兩** (½ of 12兩) |
| A player 2 | pool house (50%) | — | — | **−6兩** |

**Invariant:** +3 +6 +3 −6 −6 = **0**. **Rake (winners):** 小X → NT$200 (0.2兩); 小Y → NT$300 (0.3兩); 小Z → NT$200 (0.2兩). **Total rake NT$700.** The A players are losers — no rake.

---

### Example 3 — Non-50/50 player share split

2v2, **Team A wins.** Team A's players split **70/30** (張 70%, 李 30%); Team B split 50/50. Each player self-bets 5兩. A-side bets (winning): 張 5兩, 李 5兩, 小甲 2兩 = 12兩. B-side bets (losing): 王 5兩, 林 5兩, 小乙 4兩, 小丙 6兩 = 20兩.

- Flow 1 (20兩 losing → A players by share): 張 70% = 14兩, 李 30% = 6兩.
- Flow 2 (12兩 winning → paid by B players 50/50): 王 6兩, 林 6兩.

| Person | Role | Net (before rake) |
|---|---|---|
| 張 | A player (70%) | **+19兩** (+14 Flow 1, +5 own bet) |
| 李 | A player (30%) | **+11兩** (+6 Flow 1, +5 own bet) |
| 小甲 | bettor (A) | **+2兩** |
| 王 | B player (50%) | **−11兩** (−5 own bet, −6 Flow 2) |
| 林 | B player (50%) | **−11兩** |
| 小乙 | bettor (B) | **−4兩** |
| 小丙 | bettor (B) | **−6兩** |

**Invariant:** 19 +11 +2 −11 −11 −4 −6 = **0**. **Rake (winners):** 張 → NT$1,000 (1兩); 李 → NT$600 (0.6兩); 小甲 → NT$100 (0.1兩). **Total rake NT$1,700.** This example exists to prove settlement reads the share ratios (張 14 vs 李 6) and never assumes an even split.

---

### Example 4 — Result correction flips an already-settled match (1v1)

A **1v1**: 張 (Team A) vs 王 (Team B), each self-bets 5兩; one player per side, so each is 100% house. Bettors: 小甲 2兩 on A, 小乙 4兩 on B.

**Original result: A wins.**

| Person | Net (before rake) | Final (after rake) |
|---|---|---|
| 張 (A) | +14兩 (+9 Flow 1, +5 own) | **13.3兩** (rake NT$700) |
| 小甲 | +2兩 | **1.9兩** (rake NT$100) |
| 王 (B) | −12兩 (−5 own, −7 Flow 2) | **−12兩** |
| 小乙 | −4兩 | **−4兩** |

Invariant: 14 +2 −12 −4 = **0**.

**Corrected to: B wins.** Every bet result flips; settlement fully recomputes:

| Person | Net (before rake) | Final (after rake) |
|---|---|---|
| 王 (B) | +12兩 (+7 Flow 1, +5 own) | **11.4兩** (rake NT$600) |
| 小乙 | +4兩 | **3.8兩** (rake NT$200) |
| 張 (A) | −14兩 (−5 own, −9 Flow 2) | **−14兩** |
| 小甲 | −2兩 | **−2兩** |

Invariant: 12 +4 −14 −2 = **0**. A correction fully inverts the settlement (R23.11). **Safety rule:** if 張's original +13.3兩 had already been marked settled/paid, the correction must not silently overwrite it — the system flags it for manual resolution (see §4.6, settle-tracking).

## Appendix F — Existing system (reference only, not prescriptive)

A working first version already exists (Next.js + Supabase/PostgreSQL). It is provided as a **reference**, not a blueprint: it demonstrates the intended behaviour and encodes a data model and database functions already tested against the rules in Appendix D. You are free to redesign the physical schema, stack, and structure. Where the existing model reflects a hard domain rule (e.g. bets carry their win/loss result; a bet and its capacity-routing request are two records), that reflects a requirement in Appendix D — the requirement is binding, the specific implementation is not. Note the existing model uses **four fixed player slots per match**; supporting 1v1/1v2/1v3 (§4.2) will require a more flexible representation of team membership.

**Existing data model (10 tables), for reference:**

| Table | Purpose |
|---|---|
| `members` | Roster: name, phone, active flag, referrer. |
| `matches` | A match: date, type, players, handicap, capacity, result, status, bet config. |
| `bets` | A recorded bet: member, match, optional pool, team, amount, type, win/loss result, active/voided, attribution. |
| `bet_requests` | The routing/capacity record behind each bet (requested vs accepted amount, status). |
| `sporadic_pools` | A side-pool on a match: opening team, handicap, capacity, result. |
| `match_team_player_shares` | Each player's share (in basis points) of their team's flows, per match/pool. |
| `match_settlements` | Per-member, per-match settlement result (gross, rake, provider fee, net) plus a detail record. |
| `settlements` | Per-member monthly totals and settled/outstanding status. |
| `club_billing_config` | Per-club fee settings (provider rate, free period, contract start). |
| `audit_log` | Append-only record of money-affecting actions. |

**Existing database functions (atomic operations), for reference:** `place_bet`, `edit_bet`, `submit_match_result`, `correct_match_result`, `submit_pool_result`, `correct_pool_result`, `cancel_match`, `replace_match_player`.

The full schema export (columns, constraints, foreign keys) and the function source travel with this document as attachments.

## Appendix G — Behavioural reference

The existing build (Appendix F) is the reference for how the bookkeeper's workflow should look and feel. It is **incomplete** in areas Phase 1 must nonetheless deliver: the report views (§4.6), weekly and monthly settlement, settlement confirmation, settle-tracking, non-2v2 formats, assisted match creation, and authentication were not built in it. Those are specified by requirement here; detailed report layouts will be supplied separately as visual references.
