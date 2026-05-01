# Pre-Launch Execution Plan — p2.sportsbet (MVP)

## Context

Phase 1 is an **MVP, not a proof of concept**. 85 real people will use this daily with real money. The system must handle everything the club needs correctly — no manual workarounds, no "the bookkeeper can manage that part."

The canonical rules (R1–R29) define the complete system. This plan determines what the MVP must include vs what can wait for Phase 2 polish.

**Phase 1 scope:** Bookkeeper backstage + member-facing interface. Two interfaces, one backend. Both writing to the same database.

---

## Hard Deadline & Timeline (Session 28, 2026-03-04)

| Window | Dates | Duration | Purpose |
|---|---|---|---|
| **Active dev** | Mar 4 → Apr 7 | ~34 days, ~24–26 active days | All core implementation |
| **Blackout** | Apr 8–26 | 19 days | Zero work — completely unavailable |
| **Polish** | Apr 27–30 | 4 days | Bug fixes, UX tweaks, final testing only |
| **Ready** | May 1 | — | Production-ready |
| **Presentation** | May 4 (Mon) | — | Pitch to 85 members |
| **Go live** | May 11 (Mon) | — | First real matches processed |

**Session capacity:** ~20–25 coding sessions before April 7 (based on actual velocity: ~11 coding sessions in 10 days, ~1 rest day per 3–4 active days).

**Implication:** The full 13-step plan (20–29 sessions) does not fit before the blackout. The plan below sequences work into three phases: must-do before Apr 7, polish window, and post-launch.

---

## Step 0: Housekeeping — PoC → MVP Text Updates ✅ DONE (Session 28)

Updated all "proof of concept" → MVP in active memory files. Backup files frozen, not edited.

---

## Completeness Review

### From the user's candidate list:

| Candidate Area | Verdict |
|---|---|
| Match page refinement | **MVP** — Inbox zero pattern + betting close enforcement |
| Member-facing interface | **MVP** — confirmed. Members place/edit bets. |
| Bets page design | **MVP** — report redesign + bet entry interface |
| Weekly report | **MVP** — bookkeeper's weekly deliverable to Line group |
| Monthly settlement | **MVP** — real money changes hands |
| Daily report | **Not a separate page** — member landing page IS the daily view |
| Per-match settlement logic | **MVP — BUILD FIRST** — mathematical core everything depends on |
| Member interface login | **MVP** — personal unique links |
| Auth (bookkeeper) | **MVP** — Supabase Auth + middleware + proper RLS |

### Missing from the user's list — added for MVP:

| Missing Area | Why MVP Needs It |
|---|---|
| **Result entry RPC** | `submitResult()` is NOT transaction-safe. Real money demands atomic writes. |
| **match_team_player_shares table** | Settlement MUST reference share_bps (R17.6). Cannot assume 50/50. |
| **bet_requests pipeline (R12–R13)** | Members + bookkeeper both create bets. Need a proper pipeline with status tracking, not raw writes to bets table. Capacity evaluation, partial acceptance, LIFO invalidation all route through this. |
| **Capacity management + concurrency (R15, R27)** | Members self-serve on optional matches with capacity limits. System must enforce capacity and handle concurrent writes — can't rely on bookkeeper manually gatekeeping. |
| **Attribution fields (R26)** | Two channels (member + bookkeeper) means the system MUST distinguish who created each bet. Functional requirement, not audit metadata. |
| **Sporadic pools (R5)** | The club uses 加強版 matches. A real product handles ALL match types the club uses. |
| **Provider fee infrastructure (R20)** | Table + calculation exist even if rate = 0. Month 7 should just work without a migration. |
| **Audit log (R29)** | Real money product with 85 people's finances needs an audit trail from day one. |
| **Betting close enforcement** | Members need system-enforced deadlines, not bookkeeper-triggered manual close. |
| **Payout verification test suite** | 85 members see financial data. Zero tolerance for errors. |
| **Bookkeeper user guide** | Non-technical user. Can't launch without it. |
| **Dashboard** | Real landing page, not a redirect. |

### Deferred to Phase 2 (genuinely not needed for MVP):

| Feature | Why Defer |
|---|---|
| **Admin permission matrix (R29.8)** | Single bookkeeper + single maintainer for MVP. Multiple roles come later. |
| **Match query optimisation** | Premature optimisation. Fix when/if slowdown appears. |
| **介紹人 accountability system** | Settlement tracks the debt. Full accountability UI (profile view, reports) is Phase 2 polish. |
| **Monday auto-placement as scheduled job** | MVP has manual trigger (bookkeeper clicks button after deadline). Full cron automation is Phase 2. |
| **Match format variations (R5.14)** | 1v1, 1v2, 1v3 — pending future discussion, not blocking MVP. |
| **LINE Login (Option C auth)** | Upgrade path. MVP uses personal links. |

---

## Why This Order — Decision Rationale

> **Read this before reordering steps.** These sequencing decisions were made deliberately (Session 28). Don't change the order because something seems more interesting — the order exists to minimize risk and avoid rework.

### Why Step 3 is split into 3a and 3b:

The full bet pipeline combines capacity management, LIFO invalidation, concurrency locking, partial acceptance, and dual-channel routing — all interacting. But these complexities only matter when **multiple users write concurrently** (i.e., when the member interface is live).

For launch on May 11, only the bookkeeper enters bets (single-user workflow). The schema and routing logic must be correct from day one, but the concurrency hardening (row locks, race protection, LIFO under load) is a **Step 11 prerequisite, not a Step 4 prerequisite**.

Split:
- **3a (before Apr 7):** Tables, routing logic, attribution, sporadic pools. Schema identical to the full version — no rework when 3b is built.
- **3b (post-launch, before member interface):** Row-level locking (R27.2), serialized transactions (R27.1), LIFO invalidation under concurrent load (R15.7), race condition protection.

**Why not build it all now:** A 2–4 session risk step with hard-to-predict edge cases, under a hard deadline, when the complex parts aren't needed for launch = unnecessary risk. Build the schema right, defer the hardening to when it's needed.

### Why member read-only is in Step 9 (not deferred):

The original plan deferred ALL member access to post-launch. That was wrong — it conflated the full member interface (bet placement, concurrency, collision handling = high risk) with a read-only view (no writes, no concurrency, no pipeline interaction = low risk). A read-only view is a thin layer on top of auth infrastructure that's already being built. It makes the May 4 presentation dramatically stronger: "you'll see your data from day one" vs "you'll get access later."

### Why buffer goes to presentation prep (not Step 11):

Starting member *bet-placement* engineering (Step 11) before the blackout is tempting but dangerous. If a bug surfaces, you're juggling two incomplete workstreams when April 8 hits — the bookkeeper system might ship with known issues AND bet placement is half-built.

Presentation prep and bet-placement UX design (Step 10) are **thinking-heavy tasks** that benefit from time to sit with them. They don't require the system to be fully built, and they produce artifacts that are immediately useful for the May 4 pitch. Better use of buffer than risking a second incomplete workstream.

### Why auth (Step 9) comes late:

Retrofitting RLS onto a system built without it surfaces unexpected issues — queries that suddenly return empty, policies that are too permissive. This is **easier to debug when all features are built** and every data path is known. Building auth first means re-testing after every subsequent step.

**Mitigation:** Draft RLS policies as SQL comments during Steps 1–2 (doesn't take extra time, just thinking ahead). When Step 9 arrives, you're applying pre-thought policies, not designing under pressure.

---

## Phase A: Active Development (Mar 4 → Apr 7)

Core bookkeeper system + auth + member read-only view. **13–19 coding sessions estimated, ~20–25 available.**

### Step 1: Settlement Engine + Financial Foundation
**Scope:** Shared infrastructure
**Complexity:** Large (2–3 sessions)

What gets built:
- `match_team_player_shares` table with constraints per R17
- `club_billing_config` table with single row (provider_rate_bps = 0, free_period active)
- Auto-populate shares at match creation (default 50/50 per R17.4)
- Payout calculation: R16 (1:1, Flow 1 + Flow 2), R17 (share allocation with remainder distribution per R18.4), R18 (64-bit integer NTD arithmetic), R19 (per-winner rake, 四捨五入到百位)
- Provider fee calculation per R20 (returns 0 during free period, but formula is real)
- Pure TypeScript in `src/lib/settlement.ts` — testable, no UI dependency
- Payout verification test suite: Session 20 example + edge cases

**Approach:** Build test cases first, then write code to pass them. Test-driven here isn't dogma — it's the fastest path to confidence for financial math.

**Why first:** Mathematical core. Every report, every member balance, every settlement calls this. Build and prove it correct before anything else touches money.

**Design decisions needed:** None — R16–R20 fully specified.

**Done when:**
- [ ] Session 20 worked example passes exactly
- [ ] Edge cases pass: 1 winner, odd player splits, 3兩 small bets, remainder distribution
- [ ] Provider fee returns 0 during free period (but formula is real)
- [ ] `match_team_player_shares` auto-populates on match creation (default 50/50)
- [ ] `tsc --noEmit` clean

---

### Step 2: Result Entry RPC + Audit Log
**Scope:** Shared infrastructure
**Complexity:** Medium (1 session)

What gets built:
- `audit_log` table (append-only per R29.4–R29.5)
- `submit_match_result(match_id, winner)` RPC — atomically sets match result + updates all active bet results + writes audit log entry
- `correct_match_result(match_id, new_winner)` RPC — atomically flips + logs
- Replace current multi-write `submitResult()` with `.rpc()` calls

**Why here:** Settlement reads `bets.result` directly. Partial writes = wrong settlement. Fix before any financial UI.

**Done when:**
- [ ] `audit_log` table exists with append-only constraints
- [ ] `submit_match_result` RPC atomically updates match + all active bet results + audit entry
- [ ] `correct_match_result` RPC atomically flips results + logs
- [ ] Old `submitResult()` replaced with `.rpc()` calls
- [ ] Correction flow verified (flip all bet results correctly)
- [ ] `tsc --noEmit` clean

---

### Step 3a: Bet Pipeline — Schema + Basic Routing
**Scope:** Shared infrastructure
**Complexity:** Medium (1–2 sessions)

What gets built:
- `bet_requests` table per R13.1 (full schema with status, status_reason, requested_amount, accepted_amount)
- `sporadic_pools` table per R5.2 (match_id, opened_by_team, handicap, capacity, result)
- Attribution columns on `bets` and `bet_requests`: created_by_role, created_via, created_by_user_id, created_by_service per R26
- Pipeline routing logic per R12:
  - mandatory_self → direct to bets (R12.1)
  - All other bets → bet_requests first (R12.2)
  - No capacity (capacity_zhi IS NULL) → auto-accept immediately (R12.3)
  - Has capacity → evaluate capacity before accepting (R12.4) — basic check, no row-level locking yet
- Bet cancellation rules per R23.9 (allowed when status = scheduled, blocked when active)

**Not included (deferred to 3b):** Row-level locking (R27.2), serialized transactions (R27.1), LIFO invalidation under concurrent load (R15.7), partial acceptance under race conditions. These are needed when members self-serve, not for single-bookkeeper workflow.

**Schema is identical** to the full pipeline — no rework when 3b is built. Only the transaction isolation level and locking strategy change.

**Design decisions needed:** RPC vs Edge Function for pipeline transactions. Recommend RPC (simpler).

**Done when:**
- [ ] `bet_requests` + `sporadic_pools` tables created with correct schemas
- [ ] Attribution columns on `bets` and `bet_requests`
- [ ] mandatory_self routes directly to bets; all others route through bet_requests
- [ ] Capacity check works for basic single-user flow
- [ ] Bet cancellation enforced (allowed when scheduled, blocked when active)
- [ ] `tsc --noEmit` clean

---

### Step 4: Bookkeeper Bet Entry + Match Enhancements + Inbox Zero
**Scope:** Bookkeeper-side
**Complexity:** Large (2–3 sessions)

What gets built:
- Bet entry interface at `/bets` (default view): date-based, all matches for selected date
- Per-match panel: add/edit/delete voluntary bets (routes through bet_requests pipeline)
- Mandatory self-bet auto-generation at match creation (4 × 5兩 standard or 3兩 small per R7/R8.5)
- 小盤 option in match creation form (R8.5)
- Sporadic pool creation UI: bookkeeper adds pools to existing matches (R5)
- Monday auto-placement: manual trigger → R10 algorithm → bets route through pipeline
- Betting close (封盤): system-enforced transition. Manual trigger for now, but server-side deadline check prevents late member bets.
- Player change flow: void old mandatory self-bet + create new (R25.3)
- Bulk reduction (全額降注) per R23.3
- **Inbox zero pattern on matches page** (fully specified, Session 26) — merged here because it directly affects the match page workflow the bookkeeper uses daily

**Why here:** Depends on settlement engine (implied payouts), RPC (data integrity), and bet pipeline (routing). The bookkeeper's daily workflow. Inbox zero is match page UX — natural fit alongside match enhancements.

> **◆ Checkpoint:** After Step 4, the bookkeeper-side core is functional. Pause to assess actual velocity and re-estimate remaining steps.

**Design decisions needed BEFORE starting:**
- Bet entry UX: single-bet form vs batch entry
- 小盤 UX: how to present standard/small choice
- Auto-placement trigger: button placement, preview before committing
- Bulk reduction naming and UI
- Sporadic pool creation UX: inline on match card vs separate modal

**Done when:**
- [ ] `/bets` default view shows all matches for selected date
- [ ] Voluntary bets route through bet_requests pipeline
- [ ] Mandatory self-bets auto-generated at match creation (standard + small)
- [ ] Monday auto-placement works via manual trigger
- [ ] Betting close (封盤) transitions match status correctly
- [ ] Player change voids old self-bet + creates new
- [ ] Inbox zero pattern working on matches page
- [ ] `tsc --noEmit` clean

---

### Step 5: Per-Match Report Redesign
**Scope:** Bookkeeper-side (shared data — members see a simplified version later)
**Complexity:** Medium (1–2 sessions)

What gets built:
- Rewrite `MatchBetReport.tsx` with correct 1:1 payout model
- Per-person: bet amount, net gain/loss (Flow 1 + Flow 2 for players), rake, final net
- Both liang and NTD amounts
- Date-level routing for multi-match days (Monday = 7 matches)
- Sporadic pool report: each pool settles independently (R5.7)
- Resolve 4 open UX issues: badges, colors, row readability, multi-match day architecture

**Why here:** Settlement engine provides math, pipeline provides correct bet data. This is the bookkeeper's verification tool.

**Design decisions needed BEFORE starting:**
- Multi-match day view architecture
- Bet type badge redesign
- Color audit
- Row readability at 40+ rows

**Done when:**
- [ ] Report shows correct 1:1 payout amounts per person (兩 + NTD)
- [ ] Rake calculated correctly per R19 (四捨五入到百位)
- [ ] Multi-match day view works (Monday = 7 matches)
- [ ] Sporadic pool report shows independent settlement
- [ ] 85-bet stress test renders cleanly
- [ ] `tsc --noEmit` clean

---

### Step 6: Weekly Report (每週報表)
**Scope:** Bookkeeper-side
**Complexity:** Medium (1–2 sessions)

What gets built:
- `/reports` page — per-member weekly summary
- Screenshot-friendly for Line group (fixed-width, phone-optimized)
- Content per R22.5: matches, bets, running monthly balance
- Per-member view via `/reports?member=id`

**Why here:** Depends on settlement engine + bet data. Bookkeeper's weekly deliverable. Builds confidence before monthly settlement.

**Design decisions needed BEFORE starting:**
- Report layout (table recommended)
- Member selection UX

**Done when:**
- [ ] `/reports` page renders per-member weekly summary
- [ ] Screenshot-friendly layout (phone-width, fixed-width)
- [ ] `/reports?member=id` shows correct data for specific member
- [ ] Content matches R22.5 requirements
- [ ] `tsc --noEmit` clean

---

### Step 7: Monthly Settlement (月度結算)
**Scope:** Bookkeeper-side
**Complexity:** Large (2 sessions)

What gets built:
- `/settlement` page — auto-calculated per R21
- Mandatory double-check audit (R21.5)
- Per-member: gross, rake, provider fee (0), net, status
- Settlement lifecycle: pending → settled (R22)
- Inactive member debt → referrer (R21.6)
- Provider fee column present (always 0 for MVP, infrastructure ready for month 7)

**Why here:** Real money. All prior data pipelines must be correct first.

**Design decisions needed BEFORE starting:**
- Audit mismatch UX
- Settlement confirmation flow
- Inactive member debt display

**Done when:**
- [ ] `/settlement` page shows auto-calculated per-member breakdown
- [ ] Double-check audit runs and compares (R21.5)
- [ ] Settlement lifecycle works: pending → settled
- [ ] Inactive member debt transfers to referrer
- [ ] Provider fee column present (shows 0)
- [ ] `tsc --noEmit` clean

---

### Step 9: Auth + Member Read-Only View
**Scope:** Shared infrastructure + member-side
**Complexity:** Medium-Large (2–3 sessions)

What gets built:
- **Bookkeeper auth:** Supabase Auth, login page, middleware, auto-logout, proper RLS
- **Member auth:** `member_tokens` table, token validation middleware, personal link generation
- Route protection: `/` routes require bookkeeper auth, `/m/[token]` routes require valid member token
- RLS: bookkeeper = full access to own club data. Member = read matches, read own bets, read own settlement.
- **Member read-only view** at `/m/[token]/`:
  - Today's matches (with results if completed)
  - My bet history (all bets placed by bookkeeper on member's behalf)
  - My balance / record (running monthly totals)
  - Mobile-first layout (members are on phones)
  - No write operations — bookkeeper still enters all bets

**Why merged:** The member read-only view is the natural proof that auth works. Token validation, RLS policies, and route protection are built in this step anyway — the read-only pages are a thin layer on top of existing data. No new tables, no business logic, no write operations.

**Why at launch:** On May 4, you present "you'll see your matches, bets, and balance in real-time from day one" — not "the bookkeeper uses the system and you'll get access later." Members having real-time visibility into their own financial data is the minimum viable member experience.

> **⚠️ Security risk until this step is complete:** Steps 1–7 are built without auth or RLS. The database has permissive allow_all policies. **No real member data or real match/bet data may enter the system until Step 9 is complete.** If the bookkeeper wants to start using it early, resist — one security gap with real financial data is unacceptable.

**Mitigation:** Draft RLS policies as SQL comments during Steps 1–2 (thinking ahead, not extra work). Apply pre-thought policies here instead of designing under pressure.

**Design decisions needed BEFORE starting:**
- Auto-logout duration
- Token generation: auto for all members, or bookkeeper generates individually?
- Token expiry policy
- Member read-only layout: single page with tabs, or separate pages?

**Done when:**
- [ ] Bookkeeper login works (Supabase Auth)
- [ ] Auto-logout on idle
- [ ] Member personal links work (`/m/[token]` validates token)
- [ ] RLS policies applied: bookkeeper = full access, member = own data only
- [ ] Every existing Supabase query tested under RLS (no empty results, no over-exposure)
- [ ] Permissive allow_all policies removed
- [ ] `/m/[token]/` shows today's matches, member's bet history, and balance
- [ ] Member cannot see other members' data
- [ ] No write operations exposed to member routes
- [ ] Mobile-friendly layout verified
- [ ] `tsc --noEmit` clean

---

### Step 9b: Member Profile View on `/members`
**Scope:** Bookkeeper-side members page expansion
**Complexity:** Small-Medium (1 session)

What gets built:
- **Member profile/history view** on the existing `/members` page — click a member to see their full reference data
- Bet history (all matches, bets placed, win/loss results)
- Settlement history (monthly balances, settled/outstanding status)
- Running balance
- Referrer info, contact info (already on page, surfaced in profile context)
- Read-only reference — bookkeeper's tool for answering "what was my settlement?" type questions from members

**Why separate from Step 9:** Step 9 builds auth + member-facing read-only view. Step 9b expands the bookkeeper's members page. Independent scope, no auth dependency. Can be built in any order relative to Step 9.

**Why Phase 1:** The bookkeeper currently answers historical member questions via LINE screenshots of weekly reports. This works but is slow. The profile view gives instant lookup. Not blocking for launch — bookkeeper's existing workflow is the fallback.

**Architectural context (Session 55):** Historical member lookup lives on the members page, not the bets page. The bets page stays symmetrically present-focused (two tabs: match list + member lookup, both scoped to active matches). The members page is the "look up a person" page; the bets page is the "work on today's betting" page.

**Done when:**
- [ ] Member row click (or expand) shows profile with bet history, settlement history, balance
- [ ] Date range selector for historical lookups
- [ ] `tsc --noEmit` clean

---

### Pre-Blackout Checklist (complete before Apr 7)

Before the Apr 8–26 blackout, ensure these external dependencies are handled:

- [ ] **Request 85-member roster from bookkeeper** — names, phones, referrers in any format (Excel, list, etc.). This data is needed for production migration on Apr 27. Don't discover on Apr 27 that you're waiting on someone else.
- [ ] **Verify `club_billing_config` values** with the organizer — provider rate, free period dates
- [ ] **All code committed and pushed** — nothing lives only on your local machine during a 19-day gap
- [ ] **Run `reboot` codeword as a dry run** — confirm it works before you actually need it

---

### Buffer: Presentation Prep + Member Bet-Placement UX Design

**If sessions remain after Steps 1–7 and 9 are complete (before Apr 7), use buffer in this priority order:**

1. **Presentation deck + pitch strategy** — thinking-heavy, benefits from time to sit with it. 85 members need to trust a new financial system. Strategy: what to show, what to emphasize, how to handle skepticism. Not an afterthought. The live read-only member view (built in Step 9) makes the demo significantly stronger.
2. **Member bet-placement UX Design (Step 10)** — betting flow, collision handling, deadline enforcement. Design-only, no code. The read-only view is already live — this designs the write operations that get added post-launch.

**Do NOT start Step 11 (member bet-placement engineering) before the blackout.** If a bug surfaces, you're juggling two incomplete workstreams when April 8 hits. The bookkeeper system + member read-only view ships clean; bet placement is a focused post-launch sprint.

---

## Phase B: Polish Window (Apr 27–30)

Bug fixes, UX tweaks, final testing. **No new features.**

> **⚠️ Budget half a day for re-orientation.** After 19 days away, context switching back in takes real time. Don't plan productive work for the first morning. Use `reboot` codeword to rebuild your mental model.

### Day 0.5: Re-orientation (Apr 27 morning)
- Run `reboot` codeword — reads all memory, checks compilation, verifies app runs
- Read through last-wrap and execution plan
- Run the app, click through every page, spot-check key flows
- Review any notes you left yourself before the blackout
- Confirm the member roster data arrived from the bookkeeper

### Integration Testing (bookkeeper-side) — ~1 day
- Full pipeline end-to-end (bookkeeper channel)
- Correction flow through settlement
- Member balance accuracy
- Session 20 verified example through full pipeline
- Every Supabase query tested under RLS (bookkeeper role)

### Launch Prep + Production Data Migration — ~1 day
- Delete all test/seed data (`TEST%`, `STRESS%` members and cascading records)
- Initialize production member roster (85 members — data should already be in hand from pre-blackout request)
- Set up `club_billing_config` with production values
- Generate member tokens for all active members
- Verification queries confirming clean state: zero test rows, correct member count, no orphaned bets/settlements, all constraints passing
- Document the migration steps so it's repeatable
- Delete `seed-stress-test.mjs` from project root
- Final RLS audit

### Presentation Finalization — ~1 day
- Refine deck (if started in buffer) or build deck (if buffer was consumed by core steps)
- **Prepare demo fallback:** pre-recorded screen walkthrough (2–3 min, click-through of key flows) + screenshot deck covering the same flows. If the live demo works, use it. If wifi drops or Supabase is down, switch to the recording without breaking stride. For a financial system pitch to 85 people, "let me just refresh" is not an option.
- Rehearsal pass — refine messaging, timing
- Bookkeeper user guide (markdown, plain language)
- Member onboarding instructions (simple — "tap this link, place your bet")

---

## Phase C: Post-Launch (May 11+)

### Step 3b: Pipeline Concurrency Hardening
**Scope:** Shared infrastructure
**Complexity:** Medium (1–2 sessions)

What gets built:
- Row-level lock on match before capacity evaluation (R27.2)
- All acceptance operations in single serialized transaction (R27.1)
- LIFO invalidation for overflow under concurrent load (R15.7)
- Partial acceptance race protection (R15.6)
- Concurrent bet placement stress test

**Why post-launch:** These protections are needed when members self-serve (dual-channel writes). For bookkeeper-only launch, single-user workflow has no concurrency. Schema is already correct from 3a — this adds transaction isolation and locking, not structural changes.

**Must complete before Step 11 (member engineering).**

**Done when:**
- [ ] Row-level lock on match before capacity evaluation
- [ ] All acceptance operations in single serialized transaction
- [ ] LIFO invalidation works under simulated concurrent load
- [ ] Concurrent bet placement stress test passes

---

### Step 10: Member Bet-Placement — UX Design
**Scope:** Member-side (design only)
**Complexity:** Medium (1 session)

What gets designed:
- Betting flow: team selection → amount → confirmation → edit/cancel before close
- Dual-channel collision handling (member + bookkeeper both write via same pipeline)
- Sporadic pool betting UX for members
- How bet placement integrates into the existing read-only pages (built in Step 9)

**Note:** The read-only member view (matches, bets, balance) is already live from Step 9. This step designs the *write* operations that get added on top. May be partially or fully completed in buffer time before Apr 7.

**Done when:**
- [ ] Betting flow designed end-to-end (team select → amount → confirm → edit/cancel)
- [ ] Collision handling rules defined (member + bookkeeper on same bet)
- [ ] Integration plan with existing read-only pages

---

### Step 11: Member Bet-Placement — Engineering
**Scope:** Member-side
**Complexity:** Medium (2–3 sessions)

What gets built (on top of existing read-only view from Step 9):
- Bet placement UI: team selection → amount → confirmation (routes through bet_requests pipeline)
- Edit/cancel before betting close
- Deadline enforcement: server-side — reject bets when status ≥ betting_closed
- One bet per member per match (unique constraint + UI prevention)
- Collision handling: bookkeeper sees all bets regardless of source, can override
- Sporadic pool betting for members

**Why lighter than originally estimated:** Route group (`/m/[token]/`), token auth, RLS, layout, and read-only pages (matches, bets, balance) already exist from Step 9. This step adds write operations only.

**Prerequisite:** Step 3b must be complete first (concurrent writes from two channels).

**Done when:**
- [ ] Bet placement routes through pipeline with deadline enforcement
- [ ] Edit/cancel works before betting close
- [ ] One bet per member per match enforced
- [ ] Bookkeeper sees all bets regardless of source
- [ ] Concurrent dual-channel stress test passes
- [ ] `tsc --noEmit` clean

---

### Step 8: Dashboard
**Scope:** Bookkeeper-side
**Complexity:** Small (1 session)

What gets built:
- Dashboard at `/` — stats, quick links, pending actions

Floatable. Can happen anytime post-launch. `/` redirects to `/matches` until then.

**Done when:**
- [ ] Dashboard shows relevant stats and quick links
- [ ] Pending actions visible (overdue results, unsettled months)
- [ ] `tsc --noEmit` clean

---

## Presentation Strategy (May 4)

### What to show:
- **Live demo** of the working bookkeeper system (matches, bets, reports, settlement)
- **Member interface preview** — mockups or working prototype if Step 10/11 progress allows
- **Financial accuracy proof** — show a real settlement calculation, explain the double-check

### What to emphasize:
- "Your money is handled correctly, transparently, automatically"
- "No more Excel errors, no more group chat confusion"
- Audit trail — every action logged, every change traceable
- The system replaces the chaotic parts of the workflow, not the social parts

### How to handle skepticism:
- "Why should I trust a computer with my money?" → double-check audit, correction flow, human override
- "What if it breaks?" → bookkeeper can always fall back to manual, system doesn't lock anyone out
- "Do I have to use it?" → gradual adoption, bookkeeper enters your bets until you're ready

### Demo fallback plan:
Live demos fail. Have these ready in case Supabase is down, wifi drops, or something breaks:
- **Pre-recorded screen walkthrough** (2–3 min, no narration — just the click-through of key flows)
- **Screenshot deck** covering the same flows as the live demo
- If live demo works, use it. If it doesn't, switch to recording without breaking stride. For a financial system pitch to 85 people, "let me just refresh" is not an option.

### Deliverables:
- Presentation deck (Chinese, screenshot-heavy, minimal text)
- One-page member handout (how to access, how to bet, who to contact)
- Bookkeeper talking points / script
- Demo fallback: recorded walkthrough + screenshot deck

---

## Dependency Graph

```
                        PHASE A: Before Apr 7
                        ═══════════════════════

Step 1 (Settlement Engine)
    │
    v
Step 2 (Result RPC + Audit Log)
    │
    v
Step 3a (Bet Pipeline — schema + basic routing)
    │
    v
Step 4 (Bet Entry + Inbox Zero) ◆ CHECKPOINT — reassess velocity
    │
    v
Step 5 (Report Redesign)
    │
    v
Step 6 (Weekly Report)
    │
    v
Step 7 (Monthly Settlement)
    │
    v
Step 9 (Auth + Member Read-Only View) ⚠️ no real data before this
    │
    v
Buffer: Presentation Prep + Step 10 (Member Bet-Placement UX)

    ══════════════════════════════════════════════
    Apr 8–26: BLACKOUT
    ══════════════════════════════════════════════

                    PHASE B: Apr 27–30 (Polish)
                    ════════════════════════════

    Integration Testing + Launch Prep + Data Migration
    Presentation Finalization + Rehearsal
    User Guide

                    PHASE C: Post May 11 (Go Live)
                    ═══════════════════════════════

Step 3b (Pipeline Concurrency Hardening)
    │
    v
Step 11 (Member Engineering)

Step 8 (Dashboard) — floatable, anytime
```

**Critical path to launch:** 1 → 2 → 3a → 4 → 5 → 7 → 9 (incl. member read-only) → Polish → Launch
**Critical path to member bet-placement:** 3b → 11

---

## Session Estimates

### Phase A: Before Apr 7 (~20–25 sessions available)

| Step | Sessions | Cumulative | Notes |
|---|---|---|---|
| 1. Settlement Engine | 2–3 | 2–3 | Test-first approach |
| 2. Result RPC + Audit Log | 1 | 3–4 | |
| 3a. Bet Pipeline (schema + routing) | 1–2 | 4–6 | Concurrency deferred to 3b |
| 4. Bet Entry + Inbox Zero | 2–3 | 6–9 | ◆ CHECKPOINT |
| 5. Report Redesign | 1–2 | 7–11 | |
| 6. Weekly Report | 1–2 | 8–13 | |
| 7. Monthly Settlement | 2 | 10–15 | |
| 9. Auth + Member Read-Only View | 2–3 | 12–18 | ⚠️ no real data before this |
| 9b. Member Profile on /members | 1 | 13–19 | Not launch-blocking, Phase 1 |
| **Core subtotal** | **14–20** | | **3–8 sessions buffer** |
| Buffer: Presentation prep | 1 | 14–20 | If buffer allows |
| Buffer: Step 10 (Bet-placement UX) | 1 | 15–21 | If buffer allows |

### Phase B: Apr 27–30

| Item | Days |
|---|---|
| Integration testing | 1–2 |
| Launch prep + data migration | 1 |
| Presentation finalization + rehearsal | 1 |

### Phase C: Post-Launch (May 11+)

| Step | Sessions | Notes |
|---|---|---|
| 3b. Pipeline Concurrency Hardening | 1–2 | Before Step 11 |
| 11. Member Bet-Placement | 2–3 | Lighter — read-only pages already exist from Step 9 |
| 8. Dashboard | 1 | Floatable |
| **Post-launch subtotal** | **4–6** | Member bet placement live by ~late May |

---

## May 4 Presentation — Minimum State Required

By May 1, the system must have:
- ✅ Working bookkeeper backstage (matches, bets, reports, settlement)
- ✅ Auth in place (bookkeeper login, member tokens generated)
- ✅ Member read-only view live (`/m/[token]/` — matches, bets, balance)
- ✅ Production data loaded (85 real members, clean database)
- ✅ Presentation deck ready + demo fallback (recorded walkthrough + screenshots)
- ✅ Bookkeeper user guide complete
- ✅ Member onboarding handout

**May 11 launch:** Bookkeeper enters all bets + members see their data in real-time (read-only). Member bet-placement follows as a post-launch sprint (~4–6 sessions, targeting late May).

**May 4 pitch:** "You'll see your matches, bets, and balance in real-time from day one."

---

## Phase 2 Deferrals (post-launch, lower priority than member interface)

| Feature | Reason |
|---|---|
| Admin permission matrix | Single bookkeeper for MVP |
| Match query optimisation | Fix when slowdown appears |
| 介紹人 full accountability UI | Settlement tracks debt; full profile/report view is polish |
| Monday auto-placement cron | Manual trigger works; automate after patterns stabilize |
| Match format variations (1v1, 1v2) | Not yet specified |
| LINE Login | Upgrade path from personal links |
