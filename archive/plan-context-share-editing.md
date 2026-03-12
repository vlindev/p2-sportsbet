# Session 48 Implementation Plan

> **Self-contained specification.** Read this file, then implement in order. All decisions are finalized. No clarifying questions should be needed. If ambiguity is found, check the referenced files before asking.

## Context

Session 47 conducted a thorough gap analysis across Steps 1-6 of the execution plan. Five gaps were identified, analyzed, and all decisions confirmed. No code was written. This plan specifies the implementation for gaps 1-4 (gap 5 was a file update, already done).

The implementation is organized as #4 -> #5 -> #6, which completes execution plan Steps 4 and 5:
- **#4** (share ratio editing) + **#5** (sporadic pools) = Step 4 complete
- **#6** (per-match report rewrite) = Step 5 complete

## Design Reference Files

- `3-mockup-HTML/Mockup-Betting-Multi-Scenario.html` — finalized mockup (Session 46). Part 1 = share ratio editing (4 states). Part 2 = per-match report with base + pool + grand summary. All 16 design decisions locked.
- `3-mockup-HTML/Mockup-Sporadic-Pool.html` — sporadic pool mockup (Session 37). Matches page pool cards + bets entry pool sections.
- `3-mockup-HTML/Mockup-Betting-Completed.html` — approved report mockup v2 (Session 43). Examples 1-3 for base match reports.

## Key Files in the Codebase

| File | Purpose |
|------|---------|
| `src/lib/settlement.ts` | Settlement engine. Pure TypeScript, pool-agnostic. `calculateMatchPayout()`, `allocateByShares()`, `calculateRake()`, `generateDefaultShares()`. |
| `src/lib/bet-pipeline.ts` | Routing, validation, capacity. Already handles sporadic pool team restriction (R5.4). |
| `src/types.ts` | `Match`, `Bet`, `BetRequest`, `SporadicPool`, `CreatedByRole`, `CreatedVia`, constants. |
| `src/components/Bets/MatchBetEntry.tsx` | Bet entry view (match-first). Share editor will be added here. |
| `src/components/Bets/BettingActions.tsx` | 封盤/自動派注/全額降注. R17.11 validation hooks into 封盤 flow here. |
| `src/components/Bets/MatchHeader.tsx` | Shared header for entry + report views. |
| `src/components/Bets/ReportBetColumn.tsx` | Extracted report column. Win/loss styling. |
| `src/components/MatchBetReport.tsx` | Current report component (139 lines). Will be rewritten in #6. |
| `src/components/Bets/MatchTabBar.tsx` | Same-day match tab navigation. Already built. |
| `src/app/matches/page.tsx` | Matches page. Cancel match code at lines 616-618 (non-atomic, to be replaced). |
| `src/app/bets/page.tsx` | Bets page shell. Status-based routing. |

## Canonical Rules Reference

Load the relevant cluster file(s) from `memory/rules/` before implementing. Key rules per section:

- **#4:** R17 (shares), R18 (arithmetic), R17.9 (lock on active), R17.10 (editable after 封盤), R17.11 (min exposure — base only), R17.12 (no min for pools)
- **#5:** R5 (sporadic pools), R12-R15 (pipeline/capacity), R23 (match lifecycle), R24 (cancellation), R26 (attribution)
- **#6:** R16 (payout model), R17-R21 (settlement), R19 (rake), R5.7 (independent pool settlement)

---

## #4: Share Ratio Editing + R17.11 Validation

### 4.1 Schema Migration

**File:** `step4-share-editing.sql`

```sql
-- Add pre_adjustment_bps to track R17.11 auto-adjustments
ALTER TABLE match_team_player_shares
ADD COLUMN pre_adjustment_bps INTEGER;

-- Nullable. Semantics:
--   NULL = never auto-adjusted (default state, vast majority of rows)
--   Non-null = player's original share_bps before R17.11 auto-adjustment
--
-- Clears to NULL on ANY manual share edit (unconditional — not just "after auto-adjustment")
-- Only meaningful for context = 'base' rows. Pool rows (context = 'sporadic_pool') are
-- exempt from R17.11 per R17.12 and will always have pre_adjustment_bps = NULL.
-- No special handling needed — the column simply exists and is unused for pool rows.
```

Run in Supabase SQL Editor. Save to project root as `step4-share-editing.sql`. Open with VS Code (`open -a "Visual Studio Code"`).

### 4.2 Type Addition

In `src/types.ts`, add:

```typescript
export type MatchTeamPlayerShare = {
  id: string;
  match_id: string;
  match_side: "A" | "B";
  player_id: string;
  share_bps: number;
  context: "base" | "sporadic_pool";
  sporadic_pool_id: string | null;
  pre_adjustment_bps: number | null;
};
```

### 4.3 ShareRatioEditor Component

**New file:** `src/components/Bets/ShareRatioEditor.tsx`

**Props:**
```typescript
interface ShareRatioEditorProps {
  matchId: string;
  matchStatus: Match["status"];
  teamAPlayers: { id: string; name: string }[];
  teamBPlayers: { id: string; name: string }[];
  context: "base" | "sporadic_pool";
  sporadicPoolId?: string;
  teamATotalBetsLiang: number; // total active bets on Team A (= exposure for Team B players)
  teamBTotalBetsLiang: number; // total active bets on Team B (= exposure for Team A players)
  minExposureLiang?: number; // 20 for base (R17.11), undefined for pools (R17.12)
  onSharesChanged?: () => void; // callback after save
}
```

**4 states** (see Mockup-Betting-Multi-Scenario.html Part 1):

1. **Default compact (50/50):** Single line "分潤 50/50". Edit pencil icon.
2. **Edit mode:** Player name + editable input field for Player 1 (integer %). Player 2 auto-derives (100 - P1). Preset buttons: 50/50, 60/40, 70/30, 80/20. Swap button (↔). Estimation row below: "估算 [P1name] [X.X]兩 · [P2name] [Y.Y]兩" where amounts = opposing team total bets × share %.
3. **Custom saved (non-50/50):** Shows both player names + percentages. Edit pencil icon.
4. **Locked:** Read-only display when `matchStatus === 'active'` (R17.9). No edit icon.

**Estimation calculation:**
- For Team A players: estimated amount = teamBTotalBetsLiang × (share % / 100) — Team B's bets are Team A players' exposure
- For Team B players: estimated amount = teamATotalBetsLiang × (share % / 100) — Team A's bets are Team B players' exposure
- Display in 兩 with one decimal place
- Same magnitude whether team wins or loses (direction changes, amount doesn't)

**Save behavior:**
- On save: UPDATE `match_team_player_shares` rows for both players
- Set `pre_adjustment_bps = null` on save (unconditional clear)
- Instant save (matches bet entry pattern — no batch)
- Destructure `{ error }` from Supabase update

**Editable when:** `matchStatus` is `scheduled` or `betting_closed` (R17.9, R17.10). Locked when `active`, `completed`, or `cancelled`.

### 4.4 Integrate into MatchBetEntry

In `src/components/Bets/MatchBetEntry.tsx`, add `<ShareRatioEditor>` between `<MatchHeader>` and the bet columns. Fetch share data alongside bet data. Pass opposing team total bets (calculated from current bets).

For sporadic pools (built in #5): the same component will appear per pool section with `context="sporadic_pool"` and `minExposureLiang={undefined}`.

### 4.5 R17.11 Minimum Exposure Validation

**Trigger points:**
1. At 封盤 time (in `BettingActions.tsx` when bookkeeper clicks 封盤)
2. When shares are manually edited post-封盤 (in `ShareRatioEditor.tsx` on save, if `matchStatus === 'betting_closed'`)

**Scope:** `context = 'base'` ONLY. Never runs on `context = 'sporadic_pool'` rows (R17.12).

**Logic (per R17.11):**

```
For each team side (A, B):
  total_exposure_liang = SUM(amount_liang) of ALL active bets from the OPPOSING team
  For each player on this side:
    player_exposure_liang = floor(total_exposure_liang * share_bps / 10000)
    If player_exposure_liang < 20:
      → auto-adjust needed

If total_exposure_liang < 40:
  → force 50/50 (impossible to satisfy 20 minimum for both players)

Auto-adjust algorithm:
  min_share_pct = ceil(20 / total_exposure_liang * 100)
  If low player's share % < min_share_pct:
    Set low player to min_share_pct, high player to (100 - min_share_pct).
  This is the "nearest" valid ratio — minimum adjustment from the original.
  Allocated amounts must be integer liang (floor division).
```

**On auto-adjustment:**
1. Store original `share_bps` in `pre_adjustment_bps` for each adjusted player
2. Update `share_bps` to the adjusted value
3. Display warning (see 4.6)

### 4.6 Notification — Two Layers

**Layer 1: Toast on matches page** (when 封盤 triggers auto-adjustment)
- Text: "第X組 分潤比例已自動調整"
- One toast per affected match
- Standard toast pattern (same as undo toast for auto-transition)

**Layer 2: Inline warning on bets page** (persistent in ShareRatioEditor)
- Condition: `pre_adjustment_bps IS NOT NULL` on any base share row for this match
- Text: "分潤已調整：原 {original}% / {100-original}% → 現 {current}% / {100-current}%（最低曝險 20兩）"
- Yellow/amber inline banner below the share section
- **Ephemeral acknowledgement:** warning reappears on page reload if `pre_adjustment_bps` is still non-null
- Dismisses naturally when bookkeeper manually edits shares (which clears `pre_adjustment_bps` to NULL)

### 4.7 Build Sequence

1. Run `step4-share-editing.sql` in Supabase
2. Add `MatchTeamPlayerShare` type to `src/types.ts`
3. Build `ShareRatioEditor.tsx` (all 4 states)
4. Integrate into `MatchBetEntry.tsx`
5. Add R17.11 validation to 封盤 flow in `BettingActions.tsx`
6. Add toast notification to matches page
7. Run `npx tsc --noEmit` — verify clean
8. Test: manual share editing (50/50 → 60/40 → custom), R17.11 trigger at 封盤, auto-adjustment warning display, warning persistence across page reload, warning clear on manual edit

