# Last Wrap — Session 84 (2026-05-06)

## Duration: 1h 46m

## Type
Documentation / orientation. No source code changes.

## What Was Done

### 1. Technical product summary for external advisor (two passes)
Goal: a 1-page doc to give a professor / experienced engineer enough context in 10–15 minutes to identify launch-blocking risks before real-money bookkeeping.

**Pass 1** — full draft with sections: Product Purpose, Stack, Scale, What's Built, What's Not Built, Known Gaps, Questions for the Advisor. Concrete file/RPC references included.

**Pass 2 (revision)** — user asked for advisor-decision orientation, not code inventory. Restructured to:
- "My Ask" — explicit scope (NOT a full code review)
- "Current Intended Milestone" — Phase 1 bookkeeper-only beta vs later member-facing access
- "Risk Priority Snapshot" table — three tiers (blocking before bookkeeper beta / blocking before member access / can wait)
- Each gap labeled **Confirmed** / **Needs verification** / **Future scope**
- Removed line counts and inventory padding
- Top risks called out: permissive `allow_all` RLS, no PITR/backup confirmed, settlement source-of-truth not enforced end-to-end, no automated tests, raw Postgres errors, no auth, no audit UI, paired non-atomic inserts (PoolCreationModal, auto-placement)

**Reversal:** code-inventory framing → advisor-decision framing. Final doc locks the latter for any future advisor-facing material.

### 2. Project orientation walkthroughs
- Listed 8 SQL RPCs in `memory/rpcs/`.
- Listed all 46 source files under `src/`, grouped by directory.
- Walked bets page stack: `app/bets/page.tsx` (router) → `BetsLandingPage.tsx` (orchestrator) → `MatchListTab.tsx` + `MemberLookupTab.tsx`.

### 3. Localhost
- `npm run dev` failed (lock conflict). Detected an existing instance on **port 3001** (PID 25105).
- Confirmed 3001 alive (HTTP 307); opened http://localhost:3001 in default browser.

### 4. Write-path file inventory
Grepped `.insert/.update/.upsert/.delete/.rpc` across `src/`. **8 write-path files** identified, split by safety:

| Through atomic RPCs | Direct table writes |
|---|---|
| `src/lib/betting-actions.ts` (place_bet, edit_bet) | `src/app/matches/page.tsx` (matches.update) |
| `src/app/matches/page.tsx` (6 result/lifecycle RPCs) | `src/app/members/page.tsx` (members CRUD) |
| | `src/components/Bets/BettingActions.tsx` (bets bulk update + audit_log insert) |
| | `src/components/Bets/PoolBetSection.tsx` (bets/bet_requests delete) |
| | `src/components/Matches/PoolCreationModal.tsx` (sporadic_pools + match_team_player_shares — 2 inserts, NOT atomic) |
| | `src/lib/betting-actions.ts` (auto-placement: bet_requests + bets — 2 inserts) |
| | `src/lib/settlement-actions.ts` (match_settlements / settlements) |

Risk surfaced for advisor: PoolCreationModal and auto-placement do paired non-atomic inserts; under failure these can leave partial state.

### 5. "Bet result" lineage map
Walked `bets.result` end-to-end:
- **Sources:** `matches.result` + `sporadic_pools.result`
- **Write RPCs (atomic, FOR UPDATE, audit-logged):** submit_match_result, correct_match_result, submit_pool_result, correct_pool_result; cancel_match for voiding
- **Audit:** `audit_log` entries (`bet_result_set`, `bet_result_corrected`, `match_result_submitted`, `match_result_corrected`)
- **Downstream:** `settlement.ts` → `match_settlements` → `settlements` → report UI
- **Flagged:** consistency holds within each RPC, but `match_settlements`/`settlements` cross transactions — silent drift possible if anything writes outside the intended path

### 6. Mockup inventory
- 18 mockups in `3-mockup-HTML/`. No traditional low-fi wireframes; flow-style references are `Mockup-Dual-Betting-Flow.html`, `Mockup-Matches-Bets-Page-Flow.html`, `Mockup-Execution-Roadmap.html`.
- Opened `Mockup-Matches-Bets-Page-Flow.html` in VS Code, then in browser, then opened `3-mockup-HTML/` folder in Finder.

## Feedback Captured

### `feedback_open_command_usage.md` (NEW, consolidated)
Replaces and merges two prior files:
- ~~`feedback_open_files_for_supabase.md`~~ — proactive case (open SQL files for Supabase paste)
- ~~`feedback_open_means_launch.md`~~ — responsive case (when user says "open", use OS `open`, never Read+summary)

**Trigger:** Mid-session I read+summarized BetsLandingPage.tsx, MatchListTab.tsx, MemberLookupTab.tsx after "open" requests. User escalated to all-caps: "YOU JUST READ IT YOU DIDNT OPEN IT, OPEN IT IN MY DEFAULT MARKDOWN APP". Distinct from the global "Show me means show" rule — "show" allows paste OR open; "open" specifically means launch.

### `feedback_memory_granularity.md` (NEW)
Scale memory-file granularity to content size. Don't create a new feedback file for one-line content; merge into a related existing file.

**Trigger:** I created `feedback_open_means_launch.md` for what was effectively one short rule. User pushed back: "does this single line of feedback need its own file? that's crazy!". Captured as a meta-rule and applied immediately by consolidating the two open-related files into one.

## Files Touched

**Created:**
- `~/.claude/projects/-Users-veronicalin-Desktop-projects-p2-sportsbet/memory/feedback_open_command_usage.md`
- `~/.claude/projects/-Users-veronicalin-Desktop-projects-p2-sportsbet/memory/feedback_memory_granularity.md`

**Deleted (consolidated):**
- `~/.claude/projects/-Users-veronicalin-Desktop-projects-p2-sportsbet/memory/feedback_open_files_for_supabase.md`
- `~/.claude/projects/-Users-veronicalin-Desktop-projects-p2-sportsbet/memory/feedback_open_means_launch.md`

**Updated:**
- `~/.claude/projects/-Users-veronicalin-Desktop-projects-p2-sportsbet/memory/MEMORY.md` — index lines (net 0 change in count)

**No source code modified.**

## Proposed 0-memory.md Updates
None. This was a documentation/orientation session. No build state changed. Roadmap unchanged: **Step 6 (Weekly Report) remains `← NEXT`.**

## Open Questions / Next Session Candidates
- **Advisor doc not yet sent.** No feedback yet from professor.
- "Needs verification" items from the doc that should be checked before sending or before launch:
  - Whether automated tests exist for settlement/RPC fan-out
  - Supabase plan: PITR / backup retention
  - Whether a staging Supabase project exists
  - Whether anon key vs service role key separation is clean (no service key client-side)
  - Which tables still accept direct client writes vs RPC-only
- Possible follow-up: pick one "blocking before bookkeeper-only beta" item (e.g., settlement source-of-truth, or paired non-atomic inserts) and walk it into a concrete fix plan.

## Session-log Entry
| 84 | 2026-05-06 | 1h 46m | Documentation session. Two-pass external advisor product summary (code-inventory → advisor-decision framing with risk-priority table + Confirmed/Needs verification/Future scope labels). Project orientation walkthroughs: bets page stack, 46 source files, 8 write-path files (split by RPC vs direct table — flagged paired non-atomic inserts in PoolCreationModal + auto-placement), bet-result lineage end-to-end. 18 mockups inventoried. Feedback captured: `feedback_open_command_usage.md` (consolidates 2 prior files — "open" means OS launch, never Read+summary; also covers proactive Supabase case), `feedback_memory_granularity.md` (don't fragment one-liners into new files). No source code changes. |
