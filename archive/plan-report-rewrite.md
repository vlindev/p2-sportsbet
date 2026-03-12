
## #6: Per-Match Report Rewrite

### 6.1 Overview

Rewrite `src/components/MatchBetReport.tsx` to show full settlement calculations. This is a significant expansion — the current 139-line component becomes a multi-component report system.

Reference: `3-mockup-HTML/Mockup-Betting-Multi-Scenario.html` Part 2.

### 6.2 Settlement Data Computation

The report needs to compute settlement for the match being viewed. The settlement engine (`src/lib/settlement.ts`) provides `calculateMatchPayout()`.

**Data sources:**
- `billingConfig`: fetch from `club_billing_config` table (single row). Map to `BillingConfig` interface: `{ providerRateBps, freePeriodEndDate, billingEnabled }`.
- `settlementDate`: use the match date (`match.date`) — this determines whether free period applies per R20.3.

**For base match:**
```typescript
import { calculateMatchPayout, CompletedMatch, ActiveBet, PlayerShare } from '@/lib/settlement';

// Fetch active base bets
const baseBets = await supabase.from('bets').select('*')
  .eq('match_id', matchId).eq('status', 'active').is('sporadic_pool_id', null);

// Fetch base shares
const baseShares = await supabase.from('match_team_player_shares').select('*')
  .eq('match_id', matchId).eq('context', 'base');

// Construct CompletedMatch from match data
const completedMatch: CompletedMatch = {
  matchId: match.id,
  result: match.result as "team_a" | "team_b",
  teamAPlayer1Id: match.team_a_player1_id,
  teamAPlayer2Id: match.team_a_player2_id,
  teamBPlayer1Id: match.team_b_player1_id,
  teamBPlayer2Id: match.team_b_player2_id,
};

const baseDetails = calculateMatchPayout(completedMatch, baseBets, baseShares, billingConfig, settlementDate);
```

**For each sporadic pool — CRITICAL PATTERN:**

```typescript
// For each pool on this match:
for (const pool of pools) {
  if (pool.result === 'pending' || pool.result === 'cancelled' || pool.result === 'voided') continue;

  // Fetch pool-specific bets
  const poolBets = await supabase.from('bets').select('*')
    .eq('sporadic_pool_id', pool.id).eq('status', 'active');

  // Fetch pool-specific shares
  const poolShares = await supabase.from('match_team_player_shares').select('*')
    .eq('match_id', matchId).eq('context', 'sporadic_pool').eq('sporadic_pool_id', pool.id);

  // IMPORTANT: Construct CompletedMatch using POOL data + PARENT MATCH player IDs
  // The settlement engine is pool-agnostic — it takes any CompletedMatch.
  // For a pool, we use:
  //   - pool.id as matchId (not match.id — intentional)
  //   - pool.result as result (pool's own independent result per R5.7)
  //   - Parent match's player IDs (players are the same for base and pools)
  //
  // This means MemberMatchDetail.matchId in the output will contain pool.id,
  // not match.id. The report layer must be aware of this when grouping results.
  const poolAsMatch: CompletedMatch = {
    matchId: pool.id,
    result: pool.result as "team_a" | "team_b",
    teamAPlayer1Id: match.team_a_player1_id,
    teamAPlayer2Id: match.team_a_player2_id,
    teamBPlayer1Id: match.team_b_player1_id,
    teamBPlayer2Id: match.team_b_player2_id,
  };

  const poolDetails = calculateMatchPayout(poolAsMatch, poolBets, poolShares, billingConfig, settlementDate);
}
```

### 6.3 Component Structure

The 190-line limit applies. Split into focused components:

| Component | Responsibility |
|-----------|---------------|
| `MatchSettlementReport.tsx` | Main container. Replaces `MatchBetReport.tsx`. Fetches data, computes settlement, orchestrates sections. |
| `SettlementSection.tsx` | One section (base match or one pool). Bet columns + settlement rows. |
| `SettlementRow.tsx` | Clickable row with expandable detail (flows, rake, net). |
| `SettlementSummary.tsx` | Grand summary across base + pools. |
| `PoolReportHeader.tsx` | Pool header card (pool number, opening team, handicap, capacity, result). Fuchsia accent. |

Keep existing: `ReportBetColumn.tsx` (already extracted), `MatchHeader.tsx` (shared), `MatchTabBar.tsx` (same-day navigation).

### 6.4 Report Layout (from mockup)

**When match has NO pools:**
- MatchHeader
- Two-column bet layout (Team A / Team B) with subtotals
- Settlement rows (per member, clickable → expandable detail)
- Summary section (total bets, total rake, zero-sum verification)

**When match HAS pools:**
- MatchHeader (with `[加強盤 ×N]` fuchsia badge)
- **基本盤** label on base match section
- Base match bet layout + settlement
- For each pool (inline below, no tabs):
  - PoolReportHeader (fuchsia accent — pool number, opening team, handicap, capacity, independent result)
  - Pool bet layout (opening team column marked "開盤方 · 僅限選手投注", amounts in 兩 + 支)
  - Pool settlement rows (independent calculation per R5.7)
  - Players appear in pool settlement even if they have no pool bets (they receive/pay player flows)
- **Grand summary:**
  - Itemizes base + each pool separately
  - Combined totals across all
  - Settlement: clickable rows, hover `#e2e8f0`, expanded detail shows flows/rake
  - Rake shown in expanded detail + summary only

### 6.5 Settlement Row Detail (expanded)

When a settlement row is clicked, it expands to show:
- Pass 1: bet gain/loss (amount won or lost from own bets)
- Pass 2: Flow 1 income (winning player's share of losing bets) or Flow 2 liability (losing player's share of winning bets)
- Rake (if net gain > 0): amount and formula
- Net: final amount after all flows and rake

All amounts shown in both 兩 and NTD.

### 6.6 Error State

If settlement calculation produces an error (e.g., shares don't sum to 10000, data inconsistency):
- Red triangle banner at top of report
- All settlement amounts replaced with `--`
- Text: "請聯繫系統管理員"
- Error details logged to console (not shown to user per security rules)

### 6.7 Export

Two buttons in report header area:
- **匯出 Excel** — export settlement data as downloadable file
- **快速截圖** — screenshot-friendly view (to be designed — may be deferred)

### 6.8 Build Sequence

1. Create `MatchSettlementReport.tsx` (main container, data fetching, settlement computation)
2. Create `SettlementRow.tsx` (clickable/expandable)
3. Create `SettlementSection.tsx` (one section — base or pool)
4. Create `PoolReportHeader.tsx` (fuchsia pool header)
5. Create `SettlementSummary.tsx` (grand summary)
6. Wire up: completed match routing → new report (replace `MatchBetReport.tsx` import)
7. Add pool sections with poolAsMatch pattern (add code comment explaining matchId)
8. Add error state handling
9. Add export buttons (Excel at minimum)
10. Run `npx tsc --noEmit` — verify clean
11. Test: base match report, match with 1 pool, match with 2 pools, multi-match Monday (7 tabs), stress test (85 bets)

---
