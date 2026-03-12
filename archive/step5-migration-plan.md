# Step 5 — Schema + Code Normalization (Approved Plan)
**Created:** Session 24, 2026-03-04 | **Status:** Fully executed (5a ✓ 5b ✓ 5c ✓ — Session 25–26)

## Context
Sessions 21-23 created canonical rules (R1-R29) and found 33 conflicts between current code/DB and those rules. 5 root causes: `"sporadic"` as match_type, `"upcoming"` instead of `"scheduled"`, `"auto_placed"` instead of `"mandatory_monday"`, `is_valid` instead of `status`/`void_reason`, missing `"betting_closed"` status. This migration aligns everything.

## Execution Order

```
5a  Additive DB migrations only (Supabase SQL — user runs manually)
5b  Code updates (7 files, tsc after each)
    → Grep gate (Layer 1 = zero)
    → Smoke test
5c  Breaking DB removals (after gate passes)
    → Final smoke test
C   Documentation updates
```

**Rule: 5a may only add/widen. All tightening/removals reserved for 5c.**

---

## Phase 5a — Additive DB (SQL for user to run in Supabase)

One SQL script. User reviews and runs. Steps:

### 5a-1: Add `status` + `void_reason` columns to `bets`

```sql
ALTER TABLE bets
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN void_reason TEXT;

ALTER TABLE bets
  ADD CONSTRAINT bets_status_check CHECK (status IN ('active', 'voided'));

ALTER TABLE bets
  ADD CONSTRAINT bets_void_reason_check CHECK (void_reason IN ('player_changed', 'match_cancelled', 'legacy_invalidated'));

ALTER TABLE bets
  ADD CONSTRAINT bets_void_reason_consistency CHECK (
    (status = 'active' AND void_reason IS NULL) OR
    (status = 'voided' AND void_reason IS NOT NULL)
  );
```

DB defaults: `status` defaults to `'active'`; `void_reason` defaults to `NULL`.

### 5a-2: Backfill `status`/`void_reason` from `is_valid`

```sql
-- Record before-count
SELECT count(*) FROM bets WHERE is_valid = false;

-- Backfill: legacy rows get 'legacy_invalidated', NOT 'match_cancelled'
UPDATE bets
  SET status = 'voided', void_reason = 'legacy_invalidated'
  WHERE is_valid = false;

-- Verify: no null status rows
SELECT count(*) FROM bets WHERE status IS NULL;  -- must return 0

-- Verify: all is_valid=false rows are now voided
SELECT count(*) FROM bets WHERE is_valid = false AND status != 'voided';  -- must return 0
```

`void_reason = 'match_cancelled'` is used ONLY by the actual cancellation code path (`confirmCancel` in matches/page.tsx) going forward. Legacy rows get `'legacy_invalidated'` to preserve audit trail integrity.

### 5a-3: Widen `matches.status` CHECK (add scheduled + betting_closed, keep upcoming)

```sql
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches
  ADD CONSTRAINT matches_status_check CHECK (
    status IN ('upcoming', 'scheduled', 'betting_closed', 'active', 'completed', 'cancelled')
  );
```

### 5a-4: Widen `bets.bet_type` CHECK (add mandatory_monday, keep auto_placed)

```sql
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_bet_type_check;
ALTER TABLE bets
  ADD CONSTRAINT bets_bet_type_check CHECK (
    bet_type IN ('mandatory_self', 'auto_placed', 'mandatory_monday', 'voluntary')
  );
```

### 5a-5: Data migration — explicit SQL with row counts

Each migration: count before → UPDATE → count after → confirm match.

```sql
-- 5a-5a: auto_placed → mandatory_monday
SELECT count(*) FROM bets WHERE bet_type = 'auto_placed';  -- record count
UPDATE bets SET bet_type = 'mandatory_monday' WHERE bet_type = 'auto_placed';
SELECT count(*) FROM bets WHERE bet_type = 'auto_placed';  -- must return 0

-- 5a-5b: upcoming → scheduled
SELECT count(*) FROM matches WHERE status = 'upcoming';  -- record count
UPDATE matches SET status = 'scheduled' WHERE status = 'upcoming';
SELECT count(*) FROM matches WHERE status = 'upcoming';  -- must return 0

-- 5a-5c: sporadic → optional (semantic mapping: sporadic test matches become optional)
-- NOTE: This is a deliberate semantic choice, not just a rename. "Sporadic" as a match_type
-- is being retired. Existing test rows are re-classified as optional matches. No real
-- production data uses match_type='sporadic'. Sporadic betting will be modeled as a
-- boolean modifier (is_sporadic) on matches in a future feature.
SELECT count(*) FROM matches WHERE match_type = 'sporadic';  -- record count
UPDATE matches SET match_type = 'optional' WHERE match_type = 'sporadic';
SELECT count(*) FROM matches WHERE match_type = 'sporadic';  -- must return 0 (record for 5c gate)
```

**match_type CHECK is NOT tightened here** — `'sporadic'` stays in the constraint until 5c.

### 5a Verification

```sql
SELECT count(*) FROM bets WHERE status IS NULL;             -- 0
SELECT count(*) FROM bets WHERE is_valid = false AND status != 'voided';  -- 0
SELECT count(*) FROM bets WHERE bet_type = 'auto_placed';   -- 0
SELECT count(*) FROM matches WHERE status = 'upcoming';     -- 0
SELECT count(*) FROM matches WHERE match_type = 'sporadic'; -- 0

-- Spot check: show voided rows
SELECT id, status, void_reason, is_valid FROM bets WHERE status = 'voided' LIMIT 5;
```

---

## Phase 5b — Code Updates (7 files)

### 5b-1: `src/types.ts` (44 lines → ~46 lines)
- Line 8: remove `"sporadic"` from match_type union
- Line 18: `"upcoming"` → `"scheduled"`, add `"betting_closed"`
- Line 27: `"auto_placed"` → `"mandatory_monday"`
- Line 29: `is_valid: boolean` → `status: "active" | "voided"` + add `void_reason: string | null`
- Lines 33-43: remove `sporadic` entries from MATCH_TYPE_LABEL and MATCH_TYPE_STYLE
→ tsc --noEmit

### 5b-2: `src/app/matches/page.tsx` (1587 lines, heaviest file)

**Constants (lines 16-69):**
- Line 16: remove `"sporadic"` from MatchForm type
- Lines 27-31: remove `sporadic` from MATCH_TYPE_SELECTED
- Lines 33-38: `upcoming` → `scheduled`, add `betting_closed: "封盤"`
- Lines 40-45: `upcoming` → `scheduled`, add `betting_closed` style (amber)
- Lines 47-69: remove sporadic entry from MATCH_TYPE_INFO array

**Auto-transition (line 246):** `"upcoming"` → `"scheduled"`

**New match insert (line 389):** `status: "upcoming"` → `status: "scheduled"`

**Status ordering (line 596):** `upcoming: 1` → `scheduled: 1, betting_closed: 1`

**Undo activate (line 612):** `status: "upcoming"` → `status: "scheduled"`

**Filter variables (lines 618-689):**
- Rename `upcomingMatches` → `scheduledMatches` (filter includes both `"scheduled"` and `"betting_closed"`)
- Rename `upcomingGroups` → `scheduledGroups`
- Update all references: `todayUpcoming` → `todayScheduled`, `thisWeekUpcoming` → `thisWeekScheduled`, etc.

**isFutureUpcoming (line 711):** `match.status === "upcoming"` → `(match.status === "scheduled" || match.status === "betting_closed")`

**confirmCancel (line 570):**
- `.update({ is_valid: false }).eq("match_id", matchId).eq("result", "pending")`
- → `.update({ status: "voided", void_reason: "match_cancelled" }).eq("match_id", matchId).eq("status", "active")`

**submitResult (lines 440-554) — add `.eq("status", "active")` to ALL bet queries:**
- Line 456: correction flip-to-loss
- Line 457: correction flip-to-win
- Line 480: normal set-winners
- Line 481: normal set-losers
- Lines 503-506: verification SELECT (CRITICAL — without this, voided bets with `result="pending"` appear as false mismatches)
- Lines 527-530: retry verification SELECT

**Sporadic UI references:**
- Line 812: remove sporadic conditional → always `"兩"`
- Line 1156: remove sporadic conditional → always `"限注（兩）"`
- Line 1233: `["monday", "optional", "sporadic"]` → `["monday", "optional"]`
- Line 1356: remove sporadic conditional → always `"限注（兩）"`
→ tsc --noEmit

### 5b-3: `src/components/MatchBetReport.tsx` (196 lines)

**Enum rename (lines 14-24):** `auto_placed` → `mandatory_monday` in BET_TYPE_LABEL and BET_TYPE_STYLE

**B1 guard — remove wrong money logic:**
- Line 38: delete `rake` calculation (`winningTotal * 0.05` is wrong per R19)
- Line 97: remove payout span (`sideTotal * 0.95` is wrong per R16)
- Lines 184-192: replace "抽水 (5%)" section with muted note: `"結算金額待報表頁計算 (1:1 派彩模式)"`

Why guard: correct 1:1 payout requires Flow 1/Flow 2 + player share ratios + per-winner rake with rounding. Component flagged for full redesign (TODO #1). Wrong numbers worse than no numbers.
→ tsc --noEmit

### 5b-4: `src/app/bets/page.tsx` (107 lines)
- Line 34: `.eq("is_valid", true)` → `.eq("status", "active")`
→ tsc --noEmit

### 5b-5: `test-data.sql` (104 lines)
- Line 35: `'upcoming'` → `'scheduled'`
- Line 37: `'sporadic'` → `'optional'`
- Line 43: remove `is_valid` from INSERT column list, remove all `true` values
- Lines 51, 72: `'auto_placed'` → `'mandatory_monday'`

### 5b-6: `stress-test-bets.sql` (213 lines)
- Remove `is_valid` from INSERT column list, remove `true` from all rows
- Lines 104, 186-193: `'auto_placed'` → `'mandatory_monday'`
- Lines 195-198: voided rows → `status='voided', void_reason='legacy_invalidated'`
- Update summary comments

### 5b-7: `seed-stress-test.mjs` (108 lines)
- Lines 63-66, 70, 75: remove `is_valid: true`
- Line 80: `"auto_placed"` → `"mandatory_monday"`
- Lines 84-85: `is_valid: false` → `status: "voided", void_reason: "legacy_invalidated"`
- Line 101: update summary log
→ Final tsc --noEmit

---

## 5b Verification Gate

**tsc:** 0 errors

**Grep gate** — denylist derived from 5c removals:
- `is_valid`, `"upcoming"`/`'upcoming'`, `"auto_placed"`/`'auto_placed'`, `"sporadic"`/`'sporadic'`
- Scope: `*.ts *.tsx *.js *.mjs *.sql`
- Flags: `--hidden`, excludes: node_modules, .next, dist, build, coverage, .git, supabase/migrations
- All 4 must return zero matches

**Smoke test:**
1. Load /matches — renders correctly
2. Create match — saves as "scheduled"
3. Cancel match — bets → voided/match_cancelled
4. Submit result — bet results set correctly
5. View bet report — no payout numbers, muted note visible
6. Void → confirm exclusion from report
7. Verify status='active' filtering excludes voided bets

---

## Phase 5c — Breaking DB Removals

Pre-condition: grep gate = 0, smoke test passed, `SELECT count(*) FROM matches WHERE match_type = 'sporadic'` = 0.

```sql
ALTER TABLE bets DROP COLUMN is_valid;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('scheduled','betting_closed','active','completed','cancelled'));

ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_bet_type_check;
ALTER TABLE bets ADD CONSTRAINT bets_bet_type_check
  CHECK (bet_type IN ('mandatory_self','mandatory_monday','voluntary'));

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_match_type_check;
ALTER TABLE matches ADD CONSTRAINT matches_match_type_check
  CHECK (match_type IN ('monday','optional'));
```

→ Final smoke test (repeat 1-7)

---

## Phase C — Docs
- Update data model in 0-memory.md and MEMORY.md
- Mark TODO Step 5 complete

---

## Deferred — Confirmed Safe
- Attribution fields (created_by_role, created_via, etc.) — no code creates bets programmatically
- B2: wrong test data amounts — fix at bet entry build
- Correct payout math — settlement page (TODO #3)
- is_sporadic column — sporadic pool feature
- betting_closed implementation — status value available, no feature yet

## Key Review Decisions (Session 24)
1. **`legacy_invalidated`** not `match_cancelled` for backfill — cannot fabricate reasons for legacy data
2. **Sporadic CHECK tightening in 5c** not 5a — removing an enum value is breaking, not additive
3. **Denylist = 5c removal list** — systematic derivation, not hand-picked
4. **B1 = guard** — remove wrong numbers, show muted note, defer correct math to settlement engine
