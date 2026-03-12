# Implementation Plan — Track for Step 3b

Items blocked on transaction/concurrency infrastructure. Step 3b (Pipeline Concurrency Hardening)
provides: serialized transactions (R27.1), row-level locking (R27.2), single-transaction bet
acceptance (R12.3/R27.4). Must complete before Step 11 (member bet-placement).

Source: Backend audit (S52). See `audit-backend-report-s52.md` for full context.

---

## 🔴-4 | Bet entry dual-write non-atomic

**What:** `MatchBetEntry.tsx` and `PoolBetSection.tsx` write to `bet_requests` then `bets` as two separate Supabase calls. R12.3 requires same-transaction acceptance.

**What 3b provides:** Single serialized transaction wrapping capacity check + bet_requests insert + bets insert + status update. Row-level lock on match (R27.2) prevents concurrent acceptances from exceeding capacity.

**Fix when 3b is built:**
Create a Supabase RPC `accept_bet(p_match_id, p_member_id, p_team_bet_on, p_amount, p_bet_type, p_sporadic_pool_id, p_created_by_role, p_created_via)` that:
1. `SELECT * FROM matches WHERE id = p_match_id FOR UPDATE`
2. Evaluate capacity (R15) if `capacity_zhi IS NOT NULL`
3. Insert into `bet_requests` with appropriate status
4. Insert into `bets` if accepted
5. Return result (accepted/pending/rejected)

Replace all dual-write patterns in `MatchBetEntry.tsx`, `PoolBetSection.tsx`, and `BettingActions.tsx` (auto-placement) with a single `.rpc('accept_bet', {...})` call.

**Phase 1 mitigation:** Single bookkeeper = no concurrent risk. Dual-write is acceptable.

---

## 🟡-2 | No backend capacity enforcement on pool bet entry

**What:** `PoolBetSection.tsx` inserts pool bets without checking `capacity_zhi`. Visual capacity bar exists but no backend validation.

**What 3b provides:** The `accept_bet` RPC (above) includes capacity evaluation under lock. Pool bets route through the same pipeline.

**Fix when 3b is built:**
The `accept_bet` RPC handles this automatically — when `sporadic_pool_id IS NOT NULL`, it checks the pool's `capacity_zhi` per R15 before accepting. For over-capacity requests, set `status = 'pending'` and surface to the bookkeeper.

For Step 11 (member self-serve): members see "容量已滿" when capacity is reached. Pending requests visible to bookkeeper for manual resolution.

**Phase 1 mitigation:** Visual capacity bar is sufficient for single bookkeeper.

---

## 🟠-1 | Share update needs atomic RPC (proper fix)

**What:** `ShareRatioEditor.tsx` updates two share rows in two separate calls. If the second fails, `SUM(share_bps) ≠ 10,000` → wrong settlement math.

**What 3b provides:** Transaction infrastructure for multi-row atomic updates.

**Fix when 3b is built:**
Create a Supabase RPC `update_share_ratio(p_match_id, p_side, p_context, p_sporadic_pool_id, p_player1_id, p_player1_bps, p_player2_id, p_player2_bps)` that:
1. Validate `p_player1_bps + p_player2_bps = 10,000`
2. Update both rows in a single transaction
3. If `context = 'base'` and match is `betting_closed`: run R17.11 min exposure check within the same transaction
4. Return success/failure + any auto-adjustment info

Replace the two separate `.update()` calls in `ShareRatioEditor.tsx:saveEdit()` with a single `.rpc('update_share_ratio', {...})` call.

**Phase 1 mitigation:** Post-write verification (implemented in plan-fix-now.md 🟠-1).

---

## 🟠-5 | Full atomic bet entry + duplicate prevention

**What:** If `bets` INSERT fails after `bet_requests` INSERT succeeds, an orphaned accepted request exists. Retry creates a duplicate request.

**What 3b provides:** The `accept_bet` RPC (🔴-4 above) wraps both inserts in one transaction. If any part fails, the entire transaction rolls back — no orphans possible.

**Fix when 3b is built:**
Handled by the `accept_bet` RPC from 🔴-4. No additional work needed beyond that RPC.

**Phase 1 mitigation:** Pre-check for existing accepted `bet_request` before creating a new one (implemented in plan-fix-now.md 🟠-5).
