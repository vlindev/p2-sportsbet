# Bets Page (投注登錄) — Design Notes

## Status
All UX issues resolved. Per-match report view, bet entry (match-first + member-first), and Monday automation built (Sessions 33-34). Report redesign finalized in unified mockup (Session 46, `3-mockup-HTML/Mockup-Betting-Multi-Scenario.html`). Implementation next.

## Architecture Decisions (confirmed)
- **Navigation**: Click completed match card → `/bets?match=id&from=completed` (Option B, not inline)
- **Back button**: Context-aware via `from` URL param → `/matches?tab=completed`
- **Bets model & payout logic**: See canonical-rules.md for current rules. This document focuses on UI/UX considerations, not rule definitions.
- **Component**: `MatchSettlementReport.tsx` (replaced `MatchBetReport.tsx` in Session 50) — full settlement report with expandable detail per member

## Resolved UX Issues

### 1. Bet type badges — resolved (Session 36)
"補" badge only on auto-placed bets, placed BEFORE the amount. Grey text on auto-placed rows. Self-bets and voluntary bets need no label. No legend section.

### 2. Competing colors — resolved (Session 46, unified mockup)
Stripped to functional minimum in report redesign. Win/loss distinction earns color; settlement detail uses neutral hover (`#e2e8f0`). Fuchsia accent for sporadic pools only.

### 3. Row readability — resolved (Session 46, unified mockup)
Clickable settlement rows with hover states. Expandable detail replaces dense static rows. Visual anchoring via alternating structure (summary row → expandable detail).

### 4. Multi-match day view — resolved (Session 41/42)
`MatchTabBar.tsx` — fixed-width pill tabs for same-day matches. Click to switch. Self-contained data fetching per tab. No 7 round-trips.

### 5. NTD amounts — resolved (earlier)
總投注 and 抽水 show both 兩 and NTD: e.g. "110兩 ($110,000)"

## Files
- `src/app/bets/page.tsx` — page shell, Suspense-wrapped, URL param routing
- `src/components/Bets/MatchSettlementReport.tsx` — per-match settlement report (main container)
- `src/components/Bets/SettlementSection.tsx` — one section (base or pool) with bet columns + settlement
- `src/components/Bets/SettlementRow.tsx` — clickable row with expandable detail
- `src/components/Bets/SettlementSummary.tsx` — grand summary across base + pools
- `src/components/Bets/PoolReportHeader.tsx` — fuchsia pool header card
- `src/components/Bets/settlement-helpers.ts` — DB-to-engine type converters
- `stress-test-bets.sql` — 85 bets stress test (raw SQL version)
- `seed-stress-test.mjs` — JS seed script (temporary, delete before launch)

## Stress Test Data (keep in Supabase until launch)
- 85 STRESS members + 1 completed Monday match + 85 bets (82 valid, 3 LIFO-dropped)
- ⚠️ Stress test counts may be based on legacy rules; verify against canonical-rules.md before using as expected outputs.
- Needed for testing across all pages (bets, reports, settlement) — do NOT clean until launch
- Match ID: `bbbbbbbb-0000-0000-0000-000000000001`
- Launch cleanup: `DELETE FROM members WHERE name LIKE 'STRESS%';`
