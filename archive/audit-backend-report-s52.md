# Backend Audit Report — Bets Report Data Flow (Session 52)

**Audited:** Full data path from write → processing → display for per-match settlement report. Cross-referenced against canonical rules R1–R29, all RPCs, settlement engine, and all Bets/ components.

## Fix Now (S52 unified plan)

| # | Cat | Finding | Component | Fix |
|---|-----|---------|-----------|-----|
| 🔴-1 | Rule | Auto-placement includes pool bets in "has bet" check. Members with only pool bets skipped from Monday mandatory placement. Violates R9.1, R9.6. | `BettingActions.tsx:66-68` | Add `.is("sporadic_pool_id", null)` to fetch query |
| 🔴-2 | Rule | Bulk reduction mutates `requested_amount` on bet_requests. R13.1: immutable. | `BettingActions.tsx:119-125` | Stop mutating `requested_amount`. Update only `accepted_amount` or leave bet_requests untouched. |
| 🔴-3 | Rule | Pool RPCs hardcode `'bookkeeper'` as `performed_by`. Match RPCs take parameter. | `step5-sporadic-pools.sql:77,127` | Add `p_performed_by` parameter to both pool RPCs |
| 🟡-1 | Gap | Orphaned bet_requests after bet deletion — accepted request, no bet row | `MatchBetEntry.tsx:100-106`, `PoolBetSection.tsx:86-92` | Delete matching bet_request when deleting bet |
| 🟡-3 | Gap | No duplicate bet validation — DB unique index rejects, user sees generic "儲存失敗" | `MatchBetEntry.tsx:81-97`, `PoolBetSection.tsx:56-83` | Pre-check for existing active bet, show "此會員已有此場投注" |
| 🟡-4 | Gap | No report refresh — data loads once, stale after correction | `MatchSettlementReport.tsx` | Add manual refresh button |
| 🟡-5 | Gap | Active match report: bets shown, no indication settlement is pending | `MatchSettlementReport.tsx` | Add "比賽進行中，結算待結果輸入後計算" message |
| 🟠-1 | Silent | Share row partial write can break sum=10,000 invariant → wrong settlement | `ShareRatioEditor.tsx:84-89` | Post-write verify: query shares, confirm sum=10,000. Restore old values + error if not. Proper atomic RPC in 3b. |
| 🟠-2 | Silent | Billing config not found → settlement silently omitted, no error | `MatchSettlementReport.tsx:65,97` | Show "無法載入費率設定，結算無法計算" |
| 🟠-3 | Silent | Shares missing → settlement has $0 player flows (wrong but renders) | `MatchSettlementReport.tsx` | Show error when shares missing or don't sum to 10,000 |
| 🟠-5 | Silent | Second write failure leaves orphaned bet_request. Retry creates duplicate. | `MatchBetEntry.tsx:84-97` | Check for existing accepted bet_request before creating new one. Full atomic fix in 3b. |
| 🟠-6 | Silent | JS Date `setMonth()` month-end overflow differs from PostgreSQL R20.3 semantics | `settlement-helpers.ts:8-9` | Fix date arithmetic to match PostgreSQL |
| 🔵-3 | Edge | Pool with `result='voided'` renders in report with no visual state | `MatchSettlementReport.tsx:72` | Add 'voided' to exclusion filter or show "已作廢" state |

## Track for Step 3b

| # | Finding | Phase 1 mitigation |
|---|---------|-------------------|
| 🔴-4 | Bet entry dual-write non-atomic (bet_requests + bets as separate calls) | Single bookkeeper = no concurrent risk |
| 🟡-2 | No backend capacity enforcement on pool bet entry | Visual capacity bar sufficient for single bookkeeper |
| 🟠-1 | Share update needs atomic RPC (proper fix) | Post-write verification is Phase 1 mitigation |
| 🟠-5 | Full atomic bet entry (proper fix) | Duplicate check is Phase 1 mitigation |

## Defer to Phase 2+

| # | Finding | Reason |
|---|---------|--------|
| 🔵-1 | Player betting on opposing team → invisible in settlement display | Display-layer redesign, not quick. Rare. |
| 🔵-2 | Hardcoded "抽水 (5%)" label | Rake rate fixed for MVP |
| 🔵-4 | Zero bets on one side display | Math correct, unlikely scenario |

## Removed (not real risks)

| # | Original finding | Why removed |
|---|-----------------|-------------|
| 🟠-4 | Partial RPC fan-out | RPCs are atomic PostgreSQL transactions — partial success is impossible. Confirmed S52. |
| 🔵-5 | Pool settlement date | Match date is correct per R20.4 semantics |
