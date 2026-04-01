# P7 Bug Fix Plan — Settlement Write Path

## What this document is

This is the implementation plan for fixing 5 bugs discovered during Priority 7 (settlement write path) functional testing in Session 81. P7 added `match_settlements` persistence — after a match result is submitted or corrected, settlement data is written to the DB and the report page reads from it.

Session 81 ran a 19-scenario testplan (`memory/testplan-P7-settlement-write-path.md`). Results: 14 passed, 3 blocked by bug #1, 2 bugs fixed during testing. Five additional bugs were discovered and logged without fixing. This plan addresses those 5 bugs.

### The 5 bugs

| # | Severity | Summary | Root cause |
|---|----------|---------|------------|
| 1 | Critical | Pool result entry impossible on completed matches | Client checks `match.status === "active"` but server allows `active \| completed`. Client/server contract drift. |
| 2 | Medium | Stale state after base match result correction | `executeMatchCorrection` writes to `justCompleted` instead of calling `fetchAll()`. Local match data never refreshes. |
| 3 | Medium | Correction preview shows unlabeled values | `CorrectionPreviewModal` displays current `net_liang` per member with no label — bookkeeper may misread as projected post-correction values. |
| 4 | Low | C/D vs A/B team label mismatch across pages | Matches page uses dynamic `teamLabel()` (A/B, C/D, E/F by same-day index). Report page hardcodes A/B everywhere. Same match, different labels. |
| 5 | Low | "比賽進行中" placeholder positioned too low on report | Appears after settlement section instead of immediately after match header. |

### Key architectural decisions in this plan

- **Fixes 3 and 4 are deferred — not in this plan's execution scope.** Both are logged in `0-memory.md` Parked Discussions with scope estimates and design requirements. They remain in this document as reference (analysis, blast radius inventory) but are excluded from the execution order.
- **Fix 3 deferred (S82 decision):** User wants projected post-correction values, not a label on the old values. Labeling is throwaway code. Option A (client-side settlement calculation with before/after/delta) is the only path. ~1 session scope. See Fix 3 section.
- **Fix 4 deferred (S82 decision):** Touches 13+ locations across 10 files, requires a design decision (canonical sort order) that hasn't been made, and partial application would create worse inconsistency than the current state. ~1–2 session scope. See Fix 4 section for full blast radius inventory.
- **Fix 2 does NOT use a shared handler for base/pool corrections.** They use entirely different state variables (`setSubmittingResult` vs `setSubmittingPoolResult`, `closeResultModal()` vs pool-specific cleanup). A shared function would require parameterizing every setter.

### Source files involved

- `src/app/matches/page.tsx` — Fixes 1, 2 (main match page, ~1950 lines)
- `src/components/CorrectionPreviewModal.tsx` — Fix 3 (correction confirmation modal)
- `src/components/Bets/MatchSettlementReport.tsx` — Fix 5 (per-match settlement report)
- `src/lib/match-domain.ts` — Fix 1 (new shared domain module)
- `memory/rpcs/submit_pool_result.sql` — Fix 1 reference (server-side allowed statuses, line 26)
- `memory/rpcs/correct_pool_result.sql` — Fix 1 reference (no match status check)

### How to use this plan

Read this document fully before writing any code. Execute in the order specified in the Execution Order section. After all fixes, run every item in the Post-Fix Validation table. If any validation fails, stop and diagnose before continuing.

### Prior context

- S80 wrap: P6 (schema) + P7 (write path) implementation
- S81 wrap: `memory/last-wrap.md` — functional testing, 2 bugs fixed, 5 logged
- S81 testplan: `memory/testplan-P7-settlement-write-path.md` — 19 scenarios with pass/fail results
- Settlement write path code: `src/lib/settlement-actions.ts`
- Migrations: `memory/migrations/006_match_settlements.sql`, `007_settlement_detail.sql`, `007b_...`, `007c_...`

---

## Fix 1 — Pool result entry on completed matches

### Problem

Client-side eligibility check at `matches/page.tsx:1008–1009` encodes:
```ts
const poolIsActive = match.status === "active";
const poolCanEnterResult = poolIsActive && !poolResolved;
```

Server-side `submit_pool_result.sql:26` encodes:
```sql
IF v_match.status NOT IN ('active', 'completed') THEN
```

Client rejects `completed`. Server accepts it. A pending pool on a completed match has no "輸入結果" button despite the RPC accepting the request. This blocks test scenarios #16–18.

Note: `correct_pool_result.sql` has **no match status check at all** — it only validates `v_pool.result NOT IN ('team_a', 'team_b')` (lines 12–15). Corrections are gated by the pool having a result, not by match status. The function created here covers new result entry only.

### Step 1 — Create `src/lib/match-domain.ts`

```ts
/**
 * Canonical client-side eligibility: can a NEW pool result be entered?
 * Mirrors submit_pool_result.sql line 26: status IN ('active', 'completed').
 * Does NOT cover corrections — correct_pool_result.sql has no match status gate.
 */
export const POOL_RESULT_ALLOWED_MATCH_STATUSES = ['active', 'completed'] as const;

export function canEnterPoolResult(
  matchStatus: string,
  poolResult: string | null
): boolean {
  const poolResolved = poolResult === 'team_a' || poolResult === 'team_b';
  return (POOL_RESULT_ALLOWED_MATCH_STATUSES as readonly string[]).includes(matchStatus)
    && !poolResolved;
}
```

### Step 2 — Update `matches/page.tsx` lines 1007–1009

Replace the three lines:
```ts
const poolResolved = pool.result === "team_a" || pool.result === "team_b";
const poolIsActive = match.status === "active";
const poolCanEnterResult = poolIsActive && !poolResolved;
```
With:
```ts
import { canEnterPoolResult } from "@/lib/match-domain";
// (import at file top)
const poolCanEnterResult = canEnterPoolResult(match.status, pool.result);
```

No other call sites. The pool correction pencil button (line 1074–1079) is inside the `poolResolved` branch and is always visible on resolved pools regardless of match status — this is correct because `correct_pool_result` has no match status gate.

### Step 3 — Tests in `src/lib/__tests__/match-domain.test.ts`

```
canEnterPoolResult('active', null)          → true
canEnterPoolResult('active', 'pending')     → true
canEnterPoolResult('completed', null)       → true
canEnterPoolResult('completed', 'pending')  → true
canEnterPoolResult('scheduled', null)       → false
canEnterPoolResult('betting_closed', null)  → false
canEnterPoolResult('cancelled', null)       → false
canEnterPoolResult('active', 'team_a')      → false  (already resolved)
canEnterPoolResult('completed', 'team_b')   → false  (already resolved)
```

Comment in test file: `"Allowed statuses sourced from submit_pool_result.sql line 26. If RPC changes, update POOL_RESULT_ALLOWED_MATCH_STATUSES and these tests."`

### Verification

- Pool with `result = null` on a `status = completed` match: "輸入結果" button visible
- Pool with `result = team_a` on a `status = completed` match: pencil visible, no "輸入結果"
- All existing pool cards on active matches: behavior unchanged

---

## Fix 2 — Correction path: remove `justCompleted`, call `fetchAll()`

### Problem

`executeMatchCorrection` (line 611) writes to `justCompleted` on success instead of calling `fetchAll()`. This leaves local match data stale: card displays correctly via `justCompleted` override, but modal reads stale `match.result`, `查看投注` disappears on `isCompleted && !isJustCompleted` check (line 964). `executePoolCorrection` (line 714) correctly calls `fetchAll()`.

### Why no shared handler

Base match and pool correction use entirely different state variables:

| Concern | Base match | Pool |
|---------|-----------|------|
| Submitting flag | `setSubmittingResult` | `setSubmittingPoolResult` |
| Modal close | `closeResultModal()` (clears `resultTarget`, `resultWinner`, `resultStep`, `isCorrection`, `resultError`) | `setShowPoolCorrectionPreview(false)` |
| Target cleanup | (handled by `closeResultModal`) | `setPoolResultTarget(null)`, `setPoolResultMatch(null)`, `setPoolResultWinner(null)` |

Source: `closeResultModal` definition at lines 511–517, pool cleanup at lines 710–713. Extracting a shared function would require parameterizing every setter, which is more complex than the duplication it removes.

### Step 1 — Modify `executeMatchCorrection` (lines 586–614)

Replace lines 611–613:
```ts
// REMOVE:
setJustCompleted((prev) => new Map(prev).set(completedId, resultWinner!));
closeResultModal();
setSubmittingResult(false);

// REPLACE WITH:
closeResultModal();
setSubmittingResult(false);
await fetchAll();
```

The `completedId` variable (line 591) is now unused. Before removing, search for all uses of `completedId` in the file to confirm no other read sites exist.

### Step 2 — Verify `openCorrectionModal` (line 505)

Current:
```ts
const currentResult = justCompleted.get(match.id) || match.result;
```

After Fix 2, corrections always go through `fetchAll()` first, so `match.result` is canonical. But `justCompleted` could still be populated from a prior new-result-entry in the same Inbox Zero batch. Scenario: bookkeeper enters result for match A (sets `justCompleted`), then immediately clicks pencil on match A to correct. At this point, `match.result` is still `pending` in local state (no `fetchAll` ran), but `justCompleted.get(match.id)` has the correct value.

**This line must stay as-is.** The `justCompleted` fallback is still needed for the correction-during-Inbox-Zero edge case. The fix is only about what happens AFTER the correction RPC succeeds.

### Step 3 — Confirm `executePoolCorrection` is already correct

Lines 692–715: already calls `fetchAll()` at line 714, does not write to `justCompleted`. No changes needed.

### `justCompleted` audit — final state after fix

| Line | Usage | Action |
|------|-------|--------|
| 119 | Declaration | Keep |
| 261 | Guard: skip auto-transitions during batch | Keep |
| 279 | useEffect dependency | Keep |
| 505 | `openCorrectionModal` reads for Inbox Zero edge case | Keep |
| 581 | Written after new result entry (Inbox Zero) | Keep |
| 611 | Written after match correction | **Remove** |
| 851 | MatchCard reads for visual override | Keep |
| 960 | Winner label rendering | Keep |
| 1141 | Overdue pending count | Keep |
| 1168–1170 | Tab switch clears + `fetchAll()` | Keep |

### Verification

- Enter a match result → card shows winner immediately (Inbox Zero intact)
- Correct that result via pencil → card shows NEW winner after fetchAll, `查看投注` visible, no stale state
- During Inbox Zero batch: click pencil on a just-completed match → modal shows correct current result (from `justCompleted`)
- Pool correction → same behavior as current (already working)

---

## Fix 3 — Correction preview modal: add clarifying labels

### Problem

`CorrectionPreviewModal.tsx` displays current `net_liang` per member (lines 99–107) with positive/negative color formatting but no label explaining what the numbers represent. The bookkeeper may interpret these as projected post-correction values. They are pre-correction current settlements fetched from `match_settlements` (lines 27–37).

### What the modal actually contains (verified)

- Title: `更正結果確認` (line 82) — accurate, keep
- Warning: `此場次已有確認結算。修改勝負將重新計算所有相關結算資料。` (line 93) — accurate, keep
- Heading: `受影響會員 ({members.length} 人)` (line 97) — accurate, describes who
- Member rows: `{m.name}` + `{m.net_liang}兩` with color (lines 100–104) — **no label on what the number means**

No "preview" or "預覽" text exists in this component. The diagnostic preview language (`預覽計算結果`, `未確認預覽`) is in `MatchSettlementReport.tsx` and is unrelated.

### Changes to `CorrectionPreviewModal.tsx`

**Line 97** — Change heading from:
```tsx
<p className="text-sm font-medium text-slate-600 mb-2">受影響會員 ({members.length} 人)</p>
```
To:
```tsx
<p className="text-sm font-medium text-slate-600 mb-1">受影響會員 ({members.length} 人)</p>
<p className="text-xs text-slate-400 mb-2">以下為更正前的結算淨額，送出後系統將自動重新計算</p>
```

This adds a one-line subtext clarifying the numbers are pre-correction values. The heading `受影響會員` is preserved because it correctly describes the list's purpose (who is affected). The subtext describes the numbers (what the values mean).

No other changes to this component. The title, warning banner, and button labels are all accurate.

### Debt tracking

Before this session closes, add to 0-memory.md Parked Discussions:

> **Fix 3 Option A — Correction preview RPC:** Server-side RPC accepting `p_match_id` and `p_proposed_winner`, returning per-member `current_net_liang`, `projected_net_liang`, and `delta_liang` without committing changes. `CorrectionPreviewModal` calls this to show before/after comparison. Requires own design session.

### Verification

- Open correction modal on a completed match with settlement → heading says `受影響會員`, subtext says `以下為更正前的結算淨額，送出後系統將自動重新計算`
- No instance of "preview" or "預覽" anywhere in the modal

---

## Fix 4 — Team labels: DEFERRED (own session)

### Why deferral is correct

**1. The two existing consumers use incompatible sort orders.**

Matches page (`matches/page.tsx:734–738`):
```ts
const statusOrder = { active: 0, scheduled: 1, betting_closed: 1, completed: 2, cancelled: 3 };
byDate[date].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  .forEach((m, i) => { matchIndexMap[m.id] = i; });
```
Labels are assigned by **status priority**, not time. Active matches always come first.

Report page (`MatchSettlementReport.tsx:111`):
```ts
supabase.from("matches").select("*").eq("date", m.date).neq("status", "cancelled").order("start_time")
```
Labels would be assigned by **start_time ascending**, excluding cancelled. (Currently labels aren't derived from siblings — they're hardcoded A/B — but this is the sibling data available.)

A canonical sort rule must be chosen. Status-based means labels shift when a match transitions (scheduled → active changes its index). Time-based means labels are stable. This is a design decision, not a code decision.

**2. The blast radius is 13+ locations across 10 files.**

Full inventory of hardcoded A/B team label rendering:

| File | Line(s) | Text |
|------|---------|------|
| `MatchSettlementReport.tsx` | 214 | `"A 隊勝"` / `"B 隊勝"` |
| `MatchHeader.tsx` | 63, 67 | `"A 隊"` / `"B 隊"` |
| `SettlementSection.tsx` | 39 | `${bet.team_bet_on}隊` |
| `SettlementSection.tsx` | 145 | `{side} 隊` |
| `SettlementSummary.tsx` | 56, 57 | `"A 隊"` / `"B 隊"` |
| `SettlementSummary.tsx` | 83, 84 | `"A 隊"` / `"B 隊"` |
| `ReportBetColumn.tsx` | 30 | `` `${side} 隊` `` |
| `PoolReportHeader.tsx` | 9 | `"A 隊勝"` / `"B 隊勝"` |
| `PoolReportHeader.tsx` | 17 | `{pool.opened_by_team}隊開盤` |
| `MatchBetEntry.tsx` | 362, 366, 401, 405, 462 | `"A 隊"` / `"B 隊"` / `{side} 隊` |
| `ShareRatioEditor.tsx` | 176, 190 | `"A隊"` / `"B隊"` |
| `PoolBetSection.tsx` | 109 | `{side} 隊` |
| `CorrectionPreviewModal.tsx` | 76, 77 | `"A 隊"` / `"B 隊"` |
| Pool result modal (`matches/page.tsx`) | 1919 | `"A 隊勝"` / `"B 隊勝"` |

Note: pool child cards on the matches page (lines 1037, 1055, 1065) already use dynamic `labelA`/`labelB` from the parent `MatchCard` scope — these are the only locations that are already correct.

**3. Partial application creates worse inconsistency.** If top-level pages are fixed but child components aren't, a single page would show "C 隊勝" in the header and "A 隊" / "B 隊" in settlement columns. Currently, each page is at least internally consistent (matches page: dynamic everywhere, report page: A/B everywhere). Half-migrated is the worst state.

**4. This is cosmetic, not functional.** The bug only manifests when 2+ matches exist on the same day. The bookkeeper sees "C/D" on the matches page and "A/B" on the report page for the same match. This is confusing but doesn't affect data correctness, settlement calculations, or any write operation.

**Recommended approach for the dedicated session:** Design decision on canonical sort (recommendation: `start_time` ascending, `created_at` tiebreaker — stable, predictable, time-based). Create a `getMatchDisplayLabels()` in `match-domain.ts`. Pass label pair as props through the full component tree via the top-level page. Blastcheck after implementation. Estimated scope: ~10 files changed with prop threading.

---

## Fix 5 — Placeholder position in report

### Problem

`MatchSettlementReport.tsx` renders "比賽進行中，結算待結果輸入後計算" at lines 266–270, after the `SettlementSection` block. For quick bookkeeper navigation, it should appear immediately after the match header.

### Change

Move the `!hasResult` block (lines 266–270) to immediately after the `MatchHeader` closing tag (after line 223), before the billing error warnings.

Current render order:
```
MatchHeader → ShareRatioEditor (inside MatchHeader children)
→ billingError warning → sharesOk warning
→ baseSettlementMissing warning → diagnostic preview → SettlementSection
→ !hasResult placeholder     ← currently here
→ pools → SettlementSummary
```

New render order:
```
MatchHeader → ShareRatioEditor (inside MatchHeader children)
→ !hasResult placeholder     ← moved here
→ billingError warning → sharesOk warning
→ baseSettlementMissing warning → diagnostic preview → SettlementSection
→ pools → SettlementSummary
```

No other files touched.

### Verification

- Active match report: placeholder visible immediately below match header
- Completed match report: placeholder absent, settlement renders normally

---

## Execution order

Fixes 3 and 4 are excluded — deferred to their own sessions (see sections above for analysis).

1. Create `src/lib/match-domain.ts` with `canEnterPoolResult` + constants + tests
2. **Fix 1** — Update `matches/page.tsx` line 1007–1009 to use `canEnterPoolResult`
3. **Fix 2** — Remove `justCompleted` write from `executeMatchCorrection`, add `fetchAll()`, remove unused `completedId`
4. **Fix 5** — Move placeholder block in `MatchSettlementReport.tsx`
5. `tsc --noEmit`

---

## Post-fix validation

| # | Check | What to verify |
|---|-------|----------------|
| 1 | **Pool eligibility parity** | `canEnterPoolResult` allowed statuses match `submit_pool_result.sql` line 26 exactly. Test file cites SQL source. |
| 2 | **Pool on completed match** | Pending pool on completed match shows "輸入結果" button. Clicking it calls `submit_pool_result` successfully. |
| 3 | **Pool correction unaffected** | Pencil on resolved pool (completed match) opens correction modal. `correct_pool_result` has no match status gate — this should work regardless of match status. |
| 4 | **New result entry (Inbox Zero)** | Enter result on overdue match → card transforms immediately, no fetch. Tab switch clears `justCompleted` and refetches. (Regression check for Fix 2.) |
| 5 | **Match correction re-render** | Correct a completed match → card shows NEW winner without manual refresh. `查看投注` remains visible. `justCompleted` not written. |
| 6 | **Correction during Inbox Zero** | Enter result via Inbox Zero, then immediately click pencil to correct → modal pre-selects the correct current result from `justCompleted`. After correction, `fetchAll()` runs. |
| 7 | **Placeholder position** | Active match: placeholder visible immediately below header. Completed match: placeholder absent. |
| 8 | **Re-run tests #16, 17, 18** | Pool settlement tests, unblocked by Fix 1. |
| 9 | **Re-run tests #1–5, #7–15, #19** | Regression check — Fix 2 modifies the result entry code path. #19 is the end-to-end workflow that exercises the correction path directly. |
| 10 | `tsc --noEmit` clean | — |
| 11 | Blastcheck | Scope: `matches/page.tsx`, `MatchSettlementReport.tsx`, `match-domain.ts` |

---

## Deferred items (tracked in `0-memory.md` Parked Discussions)

1. **Fix 3 — Correction preview with projected values.** Client-side: run `calculateMatchPayout` with both old and new winner, display before/after/delta per member. No server RPC needed. ~1 session. Needs design discussion for delta display format. **Scoping question for that session:** `calculateMatchPayout` needs bets and shares as inputs. When the correction modal opens, does the page already have those in scope, or does the modal need its own fetch? Currently `CorrectionPreviewModal` only fetches `match_settlements` rows — it has no access to bets, shares, or billing config. The design session should start here.
2. **Fix 4 — Team label consistency.** Canonical sort rule decision + prop threading through 10 files (13+ locations). ~1–2 sessions. Full blast radius inventory in Fix 4 section above.
