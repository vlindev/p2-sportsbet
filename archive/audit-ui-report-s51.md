# UI Discrepancy Report — Per-Match Report Page (Session 51)

**Audited against:** `3-mockup-HTML/Mockup-Betting-Multi-Scenario.html` Part 2, `memory/design-bets-report-issues.md`, `memory/plan-report-rewrite.md`, MEMORY.md resolved decisions

## Gap List

| # | Severity | Area | Component | Gap | Reference |
|---|----------|------|-----------|-----|-----------|
| 1 | Critical | Bet columns | `ReportBetColumn.tsx` | Bets not sorted by type: should be `mandatory_self` first, then `voluntary` by amount desc, then `mandatory_monday` last. Currently ordered by `created_at`. | Mockup lines 477-500 |
| 2 | Critical | Bet columns | `ReportBetColumn.tsx` | Badge rule: show "補" badge only on auto-placed bets (`mandatory_monday`), positioned LEFT of the amount. Remove 自/願 badges entirely. **Decision confirmed S51.** | MEMORY.md S36 decision, confirmed S51 |
| 3 | Minor | Bet columns | `ReportBetColumn.tsx` | Auto-placed bet rows not greyed out. Should have muted text (`text-slate-400`) regardless of win/loss side. | MEMORY.md S36 + mockup lines 483-484, 499-500 |
| 4 | Minor | Report | `MatchSettlementReport.tsx` | ShareRatioEditor shows "已鎖定" text in report view. Mockup shows minimal locked state — muted compact display, no "已鎖定" badge, no edit button. | Mockup lines 452-458 |
| 5 | Note | Summary | `SettlementSummary.tsx` | Export buttons missing emojis (📄 📷) that mockup has. | Mockup lines 756-757 |
| 6 | Note | Report | Not implemented | Error state (red triangle banner, `--` amounts, `請聯繫系統管理員`) not built. | Plan §6.6 |

## Fix Plan (approved priorities)

### Phase 1 — Fix with backend audit findings (unified plan)
1. Sort bet rows in `ReportBetColumn.tsx`: `mandatory_self` → `voluntary` (by amount desc) → `mandatory_monday`
2. Remove 自/願 badges, keep only 補 badge positioned LEFT of amount
3. Grey out auto-placed (`mandatory_monday`) rows regardless of win/loss
4. Remove "已鎖定" from ShareRatioEditor when in report view (completed match)

### Phase 2 — Deferred
5. Export button emojis — cosmetic
6. Error state — add before launch

## Session 51 Code Fixes (already applied)
- `MatchSettlementReport.tsx:51` — added `billingRes.error` check
- `PoolBetSection.tsx:33` — added bets fetch `{ error }` destructure
- `settlement-helpers.ts:18` — positive guard (`=== "win" || === "loss"` instead of `!== "pending"`)
