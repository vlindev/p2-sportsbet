### 5.7 Pool Share Auto-Creation

When a sporadic pool is created (INSERT into `sporadic_pools`), immediately INSERT share rows into `match_team_player_shares`:

```typescript
// After pool INSERT succeeds:
const poolShares = [
  ...generateDefaultShares(matchId, "A", [match.team_a_player1_id, match.team_a_player2_id]),
  ...generateDefaultShares(matchId, "B", [match.team_b_player1_id, match.team_b_player2_id]),
];

// INSERT with context = 'sporadic_pool' and sporadic_pool_id = newPool.id
const shareRows = poolShares.map(s => ({
  match_id: matchId,
  match_side: s.matchSide,
  player_id: s.playerId,
  share_bps: s.shareBps,
  context: 'sporadic_pool' as const,
  sporadic_pool_id: newPool.id,
}));

const { error: shareError } = await supabase
  .from('match_team_player_shares')
  .insert(shareRows);
```

`generateDefaultShares()` from `src/lib/settlement.ts` is already pool-agnostic — it returns `PlayerShare[]` with `matchSide` and `shareBps`. The caller adds `context` and `sporadic_pool_id`.

### 5.8 Pool Creation UI (Matches Page)

Reference: `3-mockup-HTML/Mockup-Sporadic-Pool.html`

- `+ 加強盤` button on match card footer (visible when `status` is `scheduled` or `betting_closed`)
- Opens modal with fields: opened_by_team (A/B radio), handicap_type, handicap_value, handicap_team, capacity_zhi (>= 20)
- On save: INSERT `sporadic_pools` row + auto-create share rows (5.7)
- Child cards appear below parent with fuchsia left border + `[加強]` tag
- Pool naming: `{matchName}-{poolNumber}` (e.g., "第12組-1")

### 5.9 Pool Bet Entry (Bets Page)

Reference: `3-mockup-HTML/Mockup-Sporadic-Pool.html` + `3-mockup-HTML/Mockup-Betting-Multi-Scenario.html`

- On bets entry page (`/bets?match=id`), pool sections appear below base match bet columns
- Each pool section includes:
  - Pool header (pool number, opening team, handicap, capacity)
  - Capacity bar (visual fill indicator)
  - Two columns: opening team (restricted — "開盤方 · 僅限選手投注") + opposing team
  - Bet amounts in 支 (1支 = 3兩). Validation per R11.2: amount_liang % 3 = 0, min 3兩 (1支), max 150兩 (50支)
  - R5.4: external bettors CANNOT bet on `opened_by_team`. Only players on that team can.
- Share ratio editor per pool (reuse `ShareRatioEditor` with `context="sporadic_pool"`, no `minExposureLiang`)
- Bets route through `bet-pipeline.ts` (already handles sporadic pool routing)

### 5.10 Pool Result Entry (Matches Page)

- Completed match cards with pools show pool result entry per pool
- Same pattern as base match result entry: click → select winner (Team A / Team B)
- Calls `submit_pool_result` RPC
- Correction via pencil icon → calls `correct_pool_result` RPC
- Each pool entered separately (R5.8)
- Pool result entry allowed when `matches.status IN ('active', 'completed')` — no dependency on base match result ordering

### 5.11 Pool Voiding (R24.4 Weather Ruling)

**NOT built in this session.** The `voided` enum value exists in the schema but no UI or RPC mechanism for independent pool voiding is implemented. For Phase 1, if a weather ruling requires voiding a pool independently, the system maintainer (Veronica) handles it via direct DB update per R29. This is documented in the migration SQL file as a future gap.

### 5.12 Build Sequence

1. Run `step5-sporadic-pools.sql` in Supabase (enum ALTER + backfill + RPCs)
2. Update `SporadicPool` type in `src/types.ts`
3. Replace cancellation code in `matches/page.tsx` with `cancel_match` RPC call
4. Test cancellation: verify atomic behavior (bets voided, requests expired, pools cancelled)
5. Build pool creation modal on matches page
6. Implement pool share auto-creation on pool save
7. Build pool bet entry sections on bets page
8. Build pool result entry on matches page (submit + correct)
9. Add pool share editing (reuse `ShareRatioEditor` per pool, `minExposureLiang` = undefined)
10. Run `npx tsc --noEmit` — verify clean
11. Test: pool creation → pool betting → pool result → pool correction → match cancellation with pools

---
