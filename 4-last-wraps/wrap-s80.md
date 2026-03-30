# Last Wrap — Session 80 (2026-03-30)

## Duration: 4h 31m

## What Was Done

**Session theme: Settlement persistence layer — P6 schema migration + P7 write path implementation.**

### 1. Reprioritization & Design Discussion
- Ranked settlement views by bookkeeper/member importance: per-match #1, monthly #2, weekly #3, daily #4, per-member #5.
- Corrected a gap in canonical sources: ALL settlement views are LINE-shared via screenshots (not just weekly report).
- Audited `club_billing_config`: 1 row, Casino Golf, 100 BPS (1%), 6 months free from 2026-05-11.
- Resolved 3 P7 design questions: write timing (automatic app-layer), correction cascade (upsert overwrites), report source (DB reads — safety over scope).
- Resolved detail column gap: Option D — JSONB hybrid. Typed columns for aggregation (liang), `detail_jsonb` for full MemberMatchDetail display (NTD).

### 2. P6 — Schema Migration
- Created `match_settlements` table (13 columns) with partial unique indexes, CHECK constraints, RLS.
- Fixed critical bug in user's plan: inline UNIQUE constraint replaced with partial unique indexes (same pattern as bets table) — prevents multi-pool settlement conflicts.
- Added `provider_fee_liang` to existing `settlements` table.
- All constraints verified live (4/4 tests pass, test data cleaned).

### 3. P7 — Settlement Write Path (7 steps, all verified)
- Step 1: `detail_jsonb` JSONB column added to `match_settlements`.
- Step 2: Moved `settlement-helpers.ts` from `src/components/Bets/` to `src/lib/`.
- Step 3: Created `src/lib/settlement-actions.ts` — `persistMatchSettlement` + `persistPoolSettlement`. Upsert to `match_settlements`, then re-aggregate monthly `settlements`.
- Step 4: Wired into `matches/page.tsx` — settlement auto-persists after result RPCs (non-blocking).
- Step 5: Created `CorrectionPreviewModal.tsx` — shows affected members before correction. Auto-skips if no settlement exists. Restructured correction flow in both match and pool paths.
- Step 6: Migrated `MatchSettlementReport.tsx` to read from `match_settlements`. `calculateMatchPayout` now only used in diagnostic preview ("未確認預覽"). Failure state shows when rows missing.
- Step 7: Final verification — `tsc` clean, blastcheck: 10 consistent, 0 code issues.

### 4. Documentation Updates (5 blastcheck items)
- `schema-columns.csv` — added match_settlements (13 rows)
- `schema-check-constraints.csv` — added 2 business-logic CHECKs
- `MEMORY.md` — match_settlements in data model, provider_fee_liang on settlements
- `test-data.sql` — provider_fee_liang column added to all 10 seed rows
- `inventory-list-of-files.md` — full regeneration

## Decisions Made

1. **Safety over scope — always** — consistency wins over limiting scope in every tradeoff.
2. **All settlement views are LINE-shared** — per-match/day/week/month/member, not just weekly.
3. **JSONB hybrid** — typed columns for aggregation, JSONB for display. Columns = liang, JSONB = NTD.
4. **Partial unique indexes** — base: `(member_id, match_id) WHERE context = 'base'`; pool: `(member_id, match_id, sporadic_pool_id) WHERE context = 'sporadic_pool'`.
5. **settlement_date = match date** — denormalized, immutable, enables direct date aggregation.
6. **Upsert for corrections** — idempotent, no delete+rewrite needed.
7. **Correction preview modal** — shows affected members, auto-skips if no settlement exists.
8. **Diagnostic preview only** — calculateMatchPayout in report is troubleshooting tool, not primary path.

## Files Changed

### New files
- `src/lib/settlement-actions.ts` — settlement write path
- `src/components/CorrectionPreviewModal.tsx` — correction preview UI
- `memory/migrations/006_match_settlements.sql` — P6 table creation
- `memory/migrations/007_settlement_detail.sql` — P7 detail_jsonb column

### Modified
- `src/app/matches/page.tsx` — settlement wiring + correction modal flow
- `src/components/Bets/MatchSettlementReport.tsx` — DB read path + failure state + diagnostic preview
- `test-data.sql` — provider_fee_liang column
- `memory/schema/schema-columns.csv` — match_settlements + settlements.provider_fee_liang
- `memory/schema/schema-check-constraints.csv` — match_settlements constraints
- `memory/inventory-list-of-files.md` — full regeneration

### Moved
- `src/components/Bets/settlement-helpers.ts` → `src/lib/settlement-helpers.ts`

### Supabase
- `match_settlements` table created + RLS allow_all
- `detail_jsonb` column added
- `provider_fee_liang` column added to `settlements`

## Next Session

1. **Functional testing** — enter a match result in dev, verify match_settlements rows appear, verify report reads from DB, verify monthly settlements aggregate
2. **S73 sporadic pool grouping redesign** — still pending (CLAUDE.md directive)
3. **Step 3b-lite** — capacity check + pending bet UI
4. **Step 6** — weekly report (`/reports` page) — now unblocked by settlement write path
5. **Steps 7, 9** — monthly settlement, auth
6. **Auto-placement Path 3** — last direct-insert path
