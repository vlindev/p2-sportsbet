
## Step 7 Note (Future — NOT Built Now)

During Step 7 (Monthly Settlement), the settlement confirmation flow must include this guard:

```sql
-- Block settlement confirmation if any completed match has pools with pending results
SELECT COUNT(*) FROM sporadic_pools sp
JOIN matches m ON sp.match_id = m.id
WHERE m.status = 'completed'
  AND EXTRACT(YEAR FROM m.date) = settlement_year
  AND EXTRACT(MONTH FROM m.date) = settlement_month
  AND sp.result = 'pending';
-- If count > 0: block confirmation, show which pools need results
```

**Guard condition uses `result = 'pending'` (positive match), NOT `result NOT IN ('team_a', 'team_b')` (negative match).** The positive form is future-safe — adding a new enum value won't silently break the guard. Pools with `voided` or `cancelled` results are resolved and should NOT block settlement.

---

## Independent Pool Voiding (R24.4) — Deferred

The `voided` enum value exists in the schema but no UI or RPC for independent pool voiding is built. This handles the R24.4 weather ruling scenario where a base match gets a result but a pool is voided by the bookkeeper.

For Phase 1: handled via direct DB update (R29 maintainer override). Build a `void_pool` RPC and UI when the club requests it or when weather cancellations become frequent enough to warrant it.

---

## Step 3b Tracking — Backend Audit Items (S52)

The following items have Phase 1 mitigations but need proper fixes in Step 3b when transactions and concurrency are built:

1. **Bet entry dual-write atomicity** (🔴-4) — `bet_requests` + `bets` as two separate Supabase calls. R12.3 requires same-transaction. Phase 1: single bookkeeper, no concurrent risk.
2. **Pool capacity backend enforcement** (🟡-2) — `PoolBetSection.tsx` inserts without checking `capacity_zhi`. Phase 1: visual capacity bar sufficient for bookkeeper. Step 11: needed for member self-serve.
3. **Share update atomic RPC** (🟠-1) — `ShareRatioEditor.tsx` updates two share rows in two calls. If second fails, sum ≠ 10,000. Phase 1: post-write verification (query + rollback). 3b: single RPC.
4. **Full atomic bet entry + duplicate prevention** (🟠-5) — Second write failure leaves orphaned `bet_request`. Retry creates duplicate. Phase 1: pre-check for existing accepted request. 3b: single transaction.

---

## Pre-Implementation Checklist

Before starting:
1. Read `3-mockup-HTML/Mockup-Betting-Multi-Scenario.html` for visual reference
2. Read `3-mockup-HTML/Mockup-Sporadic-Pool.html` for pool creation + bet entry visuals
3. Load relevant canonical rule clusters (`memory/rules/R05-sporadic-pools.md`, `memory/rules/R16-R22-settlement.md`, `memory/rules/R12-R15-bet-pipeline.md`)
4. Verify `calculateMatchPayout()` in `src/lib/settlement.ts` takes generic inputs (confirmed Session 47 — no retrofit needed)
5. Run `npx tsc --noEmit` to confirm codebase compiles before starting
