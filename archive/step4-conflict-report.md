# Step 4 — Conflict Report
**Generated:** 2026-03-04 | **Against:** canonical-rules.md R1–R29

---

## #1
[Category: A]

File: src/types.ts
Lines: 8

Conflict:
`match_type` includes `"sporadic"` as a union value. Sporadic is not a match type — it's a modifier (sporadic_pools table) or boolean overlay. Only `monday` and `optional` are valid match types.

Violates:
R2.1 — match_type MUST be one of: monday, optional.

Resolution:
Remove `"sporadic"` from the union. Sporadic pools are tracked via a separate table, not match_type.

---

## #2
[Category: A]

File: src/types.ts
Lines: 18

Conflict:
`status` uses `"upcoming"` instead of `"scheduled"`, and is missing `"betting_closed"`.

Violates:
R23.1 — status MUST be one of: scheduled, betting_closed, active, cancelled, completed.

Resolution:
Replace `"upcoming"` with `"scheduled"`, add `"betting_closed"`.

---

## #3
[Category: A]

File: src/types.ts
Lines: 27

Conflict:
`bet_type` uses `"auto_placed"` instead of `"mandatory_monday"`.

Violates:
R8.1 — bet_type MUST be one of: mandatory_self, mandatory_monday, voluntary.

Resolution:
Replace `"auto_placed"` with `"mandatory_monday"`.

---

## #4
[Category: A]

File: src/types.ts
Lines: 29

Conflict:
Bet type uses `is_valid: boolean` field. Canonical rules define `status: active|voided` with `void_reason` instead.

Violates:
R14.1–R14.4 — bets.status ENUM(active, voided) with void_reason.

Resolution:
Replace `is_valid: boolean` with `status: "active" | "voided"` and add `void_reason: string | null`.

---

## #5
[Category: A]

File: src/types.ts
Lines: 33–43

Conflict:
`MATCH_TYPE_LABEL` and `MATCH_TYPE_STYLE` include `sporadic` key. These are typed as `Record<Match["match_type"], string>` — when match_type changes, these must change too. Sporadic pool display will need different UI treatment (per-pool, not per-match-type).

Violates:
R2.1 — sporadic is not a match_type.

Resolution:
Remove `sporadic` entries. Add sporadic pool display logic separately when pools feature is built.

---

## #6
[Category: A]

File: src/app/matches/page.tsx
Lines: 16

Conflict:
`MatchForm.match_type` includes `"sporadic"`.

Violates:
R2.1

Resolution:
Remove `"sporadic"` from form type.

---

## #7
[Category: A]

File: src/app/matches/page.tsx
Lines: 27–31

Conflict:
`MATCH_TYPE_SELECTED` includes `sporadic` key.

Violates:
R2.1

Resolution:
Remove `sporadic` entry.

---

## #8
[Category: A]

File: src/app/matches/page.tsx
Lines: 33–38

Conflict:
`STATUS_LABEL` uses `upcoming` instead of `scheduled`, missing `betting_closed`.

Violates:
R23.1

Resolution:
Replace `upcoming` with `scheduled`, add `betting_closed: "封盤"`.

---

## #9
[Category: A]

File: src/app/matches/page.tsx
Lines: 40–45

Conflict:
`STATUS_STYLE` uses `upcoming` instead of `scheduled`, missing `betting_closed`.

Violates:
R23.1

Resolution:
Replace `upcoming` key with `scheduled`, add `betting_closed` style.

---

## #10
[Category: A]

File: src/app/matches/page.tsx
Lines: 47–68

Conflict:
`MATCH_TYPE_INFO` includes a `sporadic` entry describing 加強版 as a match type with its own badge, tooltip, and creation flow. Sporadic is not a match type — it's a pool overlay.

Violates:
R2.1, R5.12

Resolution:
Remove `sporadic` entry. Sporadic pools will need different UI (per-match pool management, not match-type selection).

---

## #11
[Category: A]

File: src/app/matches/page.tsx
Lines: 246, 251, 389, 596, 612, 618–621, 678–681, 711

Conflict:
All references to `"upcoming"` status throughout the page — auto-transition check (246), status write (251, 389), sort order (596), undo (612), filter (618–621, 678–681), UI condition (711).

Violates:
R23.1

Resolution:
Replace all `"upcoming"` references with `"scheduled"`. Also add handling for `"betting_closed"` status where relevant (display, transitions, filtering).

---

## #12
[Category: A]

File: src/app/matches/page.tsx
Lines: 564–577

Conflict:
Cancel logic sets `is_valid: false` on bets. Should set `bets.status = voided, void_reason = match_cancelled`.

Violates:
R24.1 — cancellation must set bets.status = voided AND void_reason = match_cancelled.

Resolution:
Replace `.update({ is_valid: false })` with `.update({ status: "voided", void_reason: "match_cancelled" })`. Add filter `.eq("status", "active")` to only void active bets.

---

## #13
[Category: A]

File: src/app/matches/page.tsx
Lines: 440–554

Conflict:
`submitResult()` updates ALL bets for the match without filtering by `is_valid`/`status`. After migration, voided bets must not have their result updated.

Violates:
R23.10 — "Set bets.result = win for all ACTIVE bets on the winning side."

Resolution:
Add `.eq("status", "active")` filter to all bet update queries in submitResult(). Also applies to correction path (lines 456–457).

---

## #14
[Category: A]

File: src/app/matches/page.tsx
Lines: 812

Conflict:
`match.match_type === "sporadic"` check in capacity display logic.

Violates:
R2.1

Resolution:
Remove sporadic match_type check. Sporadic pool capacity is per-pool, not per-match.

---

## #15
[Category: A]

File: src/components/MatchBetReport.tsx
Lines: 14–18

Conflict:
`BET_TYPE_LABEL` uses `auto_placed: "補"`. Should be `mandatory_monday`.

Violates:
R8.1

Resolution:
Replace `auto_placed` key with `mandatory_monday`.

---

## #16
[Category: A]

File: src/components/MatchBetReport.tsx
Lines: 20–24

Conflict:
`BET_TYPE_STYLE` uses `auto_placed` key.

Violates:
R8.1

Resolution:
Replace `auto_placed` key with `mandatory_monday`.

---

## #17
[Category: B1]

File: src/components/MatchBetReport.tsx
Lines: 38

Conflict:
Rake calculated as `winningTotal * 0.05` (5% of winning side total). Correct model: rake is per-winner on each winner's individual net gain, with 四捨五入到百位 rounding. This formula produces wrong monetary output.

Violates:
R19.1–R19.4 — Rake per winner, rounded to nearest 100 NTD.

Resolution:
Replace single-total rake with per-winner rake calculation using R19 formula. Requires knowing which members won and their net gain — significant logic change. Minimum fix: disable/guard the calculation with a warning that it's not implemented.

---

## #18
[Category: B1]

File: src/components/MatchBetReport.tsx
Lines: 97

Conflict:
Payout display: winners get `sideTotal * 0.95`, losers lose `sideTotal`. This is the old pool model. Correct model: 1:1 payouts — winning bettors win their bet amount, losing bettors lose their bet amount. Players act as house (absorb external flow via R16 Flow 1 and Flow 2).

Violates:
R16.1–R16.6 — 1:1 payout model with players as house.

Resolution:
Replace pool-based payout display with 1:1 model. For external bettors: +amount (win) or -amount (loss). For players: include Flow 1/Flow 2 calculations. Minimum fix: remove payout numbers entirely and display a "settlement calculation pending" message.

---

## #19
[Category: B1]

File: src/components/MatchBetReport.tsx
Lines: 184–192

Conflict:
Summary section shows "抽水 (5%)" as a single total figure derived from `winningTotal * 0.05`. This is not how rake works — it's per-winner with rounding. The displayed number is wrong.

Violates:
R19.1–R19.4

Resolution:
Same as #17 — either implement correct per-winner rake or remove the figure.

---

## #20
[Category: A]

File: src/app/bets/page.tsx
Lines: 34

Conflict:
Query filters by `.eq("is_valid", true)`. After migration, should filter by `.eq("status", "active")`.

Violates:
R14.2 — active bets are settlement-eligible.

Resolution:
Replace `is_valid` filter with `status = active`.

---

## #21
[Category: A]

File: test-data.sql
Lines: 35

Conflict:
Match 3 uses `status: 'upcoming'`.

Violates:
R23.1 — should be `'scheduled'`.

Resolution:
Replace `'upcoming'` with `'scheduled'`.

---

## #22
[Category: A]

File: test-data.sql
Lines: 37

Conflict:
Match 4 uses `match_type: 'sporadic'`.

Violates:
R2.1 — sporadic is not a valid match_type.

Resolution:
Change to `'monday'` or `'optional'` and add sporadic pool record separately (when table exists).

---

## #23
[Category: A]

File: test-data.sql
Lines: 51, 53, 72

Conflict:
Uses `bet_type: 'auto_placed'`.

Violates:
R8.1 — should be `'mandatory_monday'`.

Resolution:
Replace `'auto_placed'` with `'mandatory_monday'`.

---

## #24
[Category: B2]

File: test-data.sql
Lines: 49, 61–63, 71, 79–81

Conflict:
Voluntary bet amounts of 3, 6, 9 liang on base matches. After rules normalization, base match voluntary bets must be exactly 1 or 2 liang (standard config). Sporadic amounts must be multiples of 3 via pools.

Violates:
R8.4, R11.1 — voluntary base match bets: 1 or 2 liang only.

Resolution:
Update test data amounts to 1 or 2. Sporadic pool bets go in a separate test when sporadic_pools table exists. Defer to test data rewrite.

---

## #25
[Category: A]

File: stress-test-bets.sql
Lines: 104, 186–193

Conflict:
Uses `bet_type: 'auto_placed'`.

Violates:
R8.1 — should be `'mandatory_monday'`.

Resolution:
Replace `'auto_placed'` with `'mandatory_monday'`.

---

## #26
[Category: A]

File: stress-test-bets.sql
Lines: 195–198

Conflict:
LIFO-dropped bets use `is_valid = false`. After migration: should be `status = 'voided', void_reason = ...`. Also, LIFO is not used for Monday matches.

Violates:
R14.3–R14.4 (is_valid → status/void_reason), R10/R12 (Monday uses count/amount balancing, not LIFO).

Resolution:
Replace `is_valid = false` with `status = 'voided'`. Reconsider whether LIFO-dropped bets should exist in a Monday stress test at all (they shouldn't per R10). Defer to test data rewrite.

---

## #27
[Category: A]

File: seed-stress-test.mjs
Lines: 80

Conflict:
Uses `bet_type: "auto_placed"`.

Violates:
R8.1

Resolution:
Replace with `"mandatory_monday"`.

---

## #28
[Category: A]

File: seed-stress-test.mjs
Lines: 83–86

Conflict:
LIFO-dropped bets use `is_valid: false`.

Violates:
R14.3–R14.4

Resolution:
Replace with `status: "voided"` and add `void_reason`. Reconsider LIFO scenario for Monday (see #26).

---

## #29
[Category: C]

File: 0-memory.md (project root)
Lines: 41

Conflict:
Data model lists `match_type (monday/optional/sporadic)` and `status (upcoming/active/completed/cancelled)`.

Violates:
R2.1 (sporadic not a match_type), R23.1 (scheduled not upcoming, missing betting_closed).

Resolution:
Already has migration pending note. Update after Step 5 completes.

---

## #30
[Category: C]

File: 0-memory.md (project root)
Lines: 42

Conflict:
Data model lists `bet_type (mandatory_self/auto_placed/voluntary)` and `is_valid` field.

Violates:
R8.1 (mandatory_monday not auto_placed), R14.1 (status/void_reason not is_valid).

Resolution:
Already has migration pending note. Update after Step 5 completes.

---

## #31
[Category: C]

File: stress-test-bets.sql
Lines: 104, 201–207

Conflict:
Comments reference "LIFO-dropped" for a Monday match. LIFO is not used for Monday.

Violates:
R10 — Monday uses count/amount balancing, not LIFO.

Resolution:
Update comments when test data is rewritten.

---

## #32
[Category: B2]

File: stress-test-bets.sql
Lines: 113–148

Conflict:
Voluntary bet amounts include 3, 4, 5 liang. After rules normalization, base match voluntary bets must be exactly 1 or 2 liang.

Violates:
R8.4, R11.1

Resolution:
Defer to test data rewrite. These amounts will fail against new bet validity rules when bet entry is built.

---

## #33
[Category: B2]

File: seed-stress-test.mjs
Lines: 60, 70, 75

Conflict:
Voluntary bet amounts generated from `[1, 2, 3, 4, 5]` array. Only 1 and 2 are valid for base match voluntary bets.

Violates:
R8.4, R11.1

Resolution:
Defer to test data rewrite. Change amounts array to `[1, 2]` when stress test is regenerated.

---

# Summary

| Category | Count | Description |
|----------|-------|-------------|
| **A** | 23 | Blocks Step 5 — must fix before/during migration |
| **B1** | 3 | Wrong money/output logic — fix or block before 5c |
| **B2** | 4 | Stale but harmless — defer to feature rewrite |
| **C** | 3 | Documentation only — fix after Step 4 |
| **Total** | **33** | |

### A items by root cause (for efficient fixing)

| Root cause | Conflict #s | Files affected |
|-----------|-------------|----------------|
| `"sporadic"` as match_type | 1, 5, 6, 7, 10, 14, 22 | types.ts, matches/page.tsx, test-data.sql |
| `"upcoming"` instead of `"scheduled"` | 2, 8, 9, 11, 21 | types.ts, matches/page.tsx, test-data.sql |
| `"auto_placed"` instead of `"mandatory_monday"` | 3, 15, 16, 23, 25, 27 | types.ts, MatchBetReport.tsx, test-data.sql, stress-test-bets.sql, seed-stress-test.mjs |
| `is_valid` instead of `status`/`void_reason` | 4, 12, 13, 20, 26, 28 | types.ts, matches/page.tsx, bets/page.tsx, stress-test-bets.sql, seed-stress-test.mjs |
| Missing `betting_closed` status | 2, 8, 9 | types.ts, matches/page.tsx |

---

# Grep Gate — Denylist & Commands

## Layer 1 — Hard Blockers (must be zero before Step 5c)

### GREP_DENY_SCHEMA (dropped/renamed columns)
- `is_valid` (replaced by status/void_reason on bets)

### GREP_DENY_ENUMS (deprecated enum literals)
- `"upcoming"` (replaced by "scheduled")
- `'upcoming'` (SQL variant)
- `"auto_placed"` (replaced by "mandatory_monday")
- `'auto_placed'` (SQL variant)
- `"sporadic"` as match_type value (context-dependent — still valid in labels/comments referring to the concept)

### GREP_DENY_JSON (deprecated JSON keys)
- None identified.

## Exact rg commands

```bash
# LAYER 1 — Hard blockers (must be zero)
# Run from project root: ~/Desktop/projects/p2.sportsbet/

# 1. is_valid references in code + SQL
rg --hidden -n 'is_valid' \
  --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.sql' --glob '*.mjs' \
  --glob '!node_modules/**' --glob '!.next/**' --glob '!dist/**' --glob '!build/**' \
  --glob '!coverage/**' --glob '!.git/**' --glob '!supabase/migrations/**'

# 2. "upcoming" as status value (exclude comments/docs mentioning the concept)
rg --hidden -n '"upcoming"|'"'"'upcoming'"'"'' \
  --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.sql' --glob '*.mjs' \
  --glob '!node_modules/**' --glob '!.next/**' --glob '!dist/**' --glob '!build/**' \
  --glob '!coverage/**' --glob '!.git/**' --glob '!supabase/migrations/**'

# 3. "auto_placed" as bet_type value
rg --hidden -n '"auto_placed"|'"'"'auto_placed'"'"'' \
  --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.sql' --glob '*.mjs' \
  --glob '!node_modules/**' --glob '!.next/**' --glob '!dist/**' --glob '!build/**' \
  --glob '!coverage/**' --glob '!.git/**' --glob '!supabase/migrations/**'

# 4. "sporadic" as match_type value in code (NOT in strings like "加強版")
# NOTE: This needs manual review — "sporadic" appears in labels/styles that reference
# the concept (valid) vs as a match_type enum value (invalid). Automated grep will
# catch both. Manual verification required.
rg --hidden -n '"sporadic"|'"'"'sporadic'"'"'' \
  --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.sql' --glob '*.mjs' \
  --glob '!node_modules/**' --glob '!.next/**' --glob '!dist/**' --glob '!build/**' \
  --glob '!coverage/**' --glob '!.git/**' --glob '!supabase/migrations/**'
```

### Expected false positives

| Term | Location | Why it's safe |
|------|----------|---------------|
| `"sporadic"` | Display labels in future sporadic pool UI | Concept is valid — only the match_type enum value is deprecated. After migration, sporadic labels will reference pool data, not match_type. Flag for manual review. |

### Search scope
- Include: `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.sql`, `**/*.mjs`
- Exclude: `node_modules`, `.next`, `dist`, `build`, `coverage`, `.git`, `supabase/migrations`
- `--hidden` flag: enabled (catches `.env` and similar dotfiles)

### Gate condition
- **Layer 1: 0 matches** in code + SQL for all four denylist terms (after expected false positive exclusion)
- Layer 2 (informational, not blocking): stale references in `*.md` files — tracked as C items in this report

---

# End of Step 4 Conflict Report
