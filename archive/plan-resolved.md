# Implementation Plan — Resolved (Non-Issues)

Items confirmed as non-issues during the S52 backend audit discussion.
Kept for reference so future audits don't re-investigate.

---

## 🟠-4 | Partial RPC fan-out

**Original finding:** If `submit_match_result` partially fails (match = completed but some bets still have `result='pending'`), `toActiveBets` silently excludes those bets. Settlement would run with fewer bets than expected.

**Resolution:** The RPCs (`submit_match_result`, `correct_match_result`, `submit_pool_result`, `correct_pool_result`) are PL/pgSQL functions executing as single PostgreSQL transactions. The CTE chain (old_bets → updated_bets → bet_audit) is one atomic statement. If any part fails, PostgreSQL rolls back the entire transaction — match result and bet results either all commit or none do. Partial success is architecturally impossible.

**Confirmed by:** User (S52). The atomic RPC design is the mitigation that the architecture brief's "Correction Path Asymmetry" analysis motivated.

---

## 🔵-5 | Pool settlement uses parent match date for provider fee

**Original finding:** `MatchSettlementReport.tsx:115` passes `match.date` (the parent match's date) as `settlementDate` to `calculateMatchPayout()` for pool settlement. Question: should this be the match date or the date the result is entered?

**Resolution:** Using the match date is correct. Pools happen on the same day as the parent match. R20.4's "settlement_date" logically refers to when the match occurred, not when the data was entered. The date the result is entered is irrelevant to the billing period calculation.

**Confirmed by:** User (S52). No action needed.
