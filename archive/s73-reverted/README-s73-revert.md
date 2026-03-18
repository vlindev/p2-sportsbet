# Session 73 — Code Revert Documentation

## What happened

Session 73 started with a blastcheck on sporadic pool issues. The check found 8 "needs update" items, 3 "needs discussion" items, and 1 "source needs revision" item. We began fixing issues and discovered additional problems during testing. The fixes became increasingly reactive — each one exposed or created a new edge case, and the grouping logic was patched three times without a holistic design. All code changes are being reverted to the session 72 clean state.

## Fixes applied and why they're being reverted

### Fix 1 — Pool result entry gating (independent, correct, verified by user)
- **Problem:** `poolCanEnterResult` checked `match.status === "active"`. When base match result is entered, status becomes `completed`, and pool result entry buttons disappear — pools on completed matches can't have results entered.
- **Fix:** changed to `(match.status === "active" || match.status === "completed") && !poolResolved`
- **User verified:** "2-3 no problem"
- **Reverted because:** bundled with other changes in the same file, clean revert is safer than surgical extraction

### Fix 2 — Tab placement for pending pools (coupled with fix 8, incomplete)
- **Problem:** when base match result + first pool result are entered, `fetchAll()` runs, match is `completed`, card moves to 已完成 — but second pool still needs a result
- **Fix:** added `hasUnresolvedPools()` check. Completed matches with unresolved pools stay in `currentMatches` (當前 tab)
- **Reverted because:** this fix adds matches to `currentMatches` but the existing grouping logic (overdue/today/thisWeek/etc.) doesn't know about them. They get counted in the tab but render in no group — invisible. Fix 2 REQUIRES a corresponding grouping change (fix 8), and fix 8 was done incorrectly three times. These two must be designed as a unit.

### Fix 3 — Pool creation on active matches (independent, correct, user-refined)
- **Problem:** "新增加強盤" only showed on scheduled/betting_closed matches. Active matches (game in progress) couldn't add sporadic pools — but sporadic pools are side bets proposed during the round.
- **Fix:** added `match.status === "active" && !isOverdue` to the condition. Three-item footer on active cards: 管理投注 | 新增加強盤 | 輸入結果
- **User refinement:** exclude overdue matches (past active matches shouldn't allow pool creation). User also specified 新增加強盤 should be in the middle of the footer.
- **Reverted because:** bundled with other changes

### Fix 4 — Pool creation modal labels (independent, correct, trivial)
- **Problem:** modal used hardcoded "讓分數值" label and "（強隊）" suffix. Match creation form uses dynamic "讓點數"/"讓洞數" labels.
- **Fix:** dynamic label matching the match creation form, removed "（強隊）"
- **Reverted because:** bundled with other changes in PoolCreationModal.tsx

### Fix 5 — Pool child card pencil cleanup (independent, correct)
- **Problem:** resolved pool cards had two pencil icons (top right + inside emerald band). Unresolved pool cards had a pencil that opened the parent match editor instead of pool-specific editing.
- **Fix:** resolved pools → one pencil at top right (opens result correction), removed from emerald band. Unresolved pools → pencil at top right.
- **Reverted because:** bundled with other changes

### Fix 6 — Pool edit modal (independent, correct, untested)
- **Problem:** unresolved pool pencil had nothing to open — pool editing didn't exist
- **Fix:** extended PoolCreationModal with optional `editPool` prop. Edit mode pre-fills values, uses `.update()` instead of `.insert()`, skips share row creation. Added `poolEditTarget` state in matches page, wired pencil to it.
- **Reverted because:** bundled with other changes

### Fix 7 — Match status reset on date edit (independent, correct in principle, untested)
- **Problem:** auto-transition sets match to `active` when start_time arrives. If bookkeeper then edits the match date to a future date, status stays `active` — creating an invalid state (active match with future date).
- **Fix:** in `handleSave`, if match is `active` and new datetime is in the future, reset status to `scheduled`
- **Reverted because:** untested, and the downstream display issue (fix 8) was never resolved

### Fix 8 — Grouping logic (coupled with fix 2, broken, three failed attempts)
- **Problem:** the original grouping uses `activeMatches` for overdue/today and `scheduledMatches` for week groups. Fix 2 added `completedWithPendingPools` to `currentMatches`, but those matches don't match any existing group — they're invisible.
- **Attempt 1:** changed `nonOverdueActive` from `date >= todayStr` to `date === todayStr` — this made future active matches invisible instead of misplaced
- **Attempt 2:** created `futureActive` array and merged into `upcomingPool` — patching a gap with another special case
- **Attempt 3:** rewrote grouping from `currentMatches` as single source — conceptually correct but introduced `date <= todayStr` for today which the user questioned, then changed to `date === todayStr` but past scheduled matches had nowhere to go
- **Reverted because:** three attempts, each creating new edge cases. The grouping needs holistic design, not incremental patching.

## The underlying design problem

The grouping logic for the 當前 tab uses different source arrays for different sections:
- `activeMatches` → overdue + today
- `scheduledMatches` → thisWeek + nextWeek + future

This means ANY match added to `currentMatches` that isn't `active` or `scheduled`/`betting_closed` falls through all groups and becomes invisible. Fix 2 (completedWithPendingPools) and fix 7 (active match with future date after edit) both create matches that don't fit the existing groups.

The correct approach (reached conceptually but never cleanly implemented): group from `currentMatches` as a single source. Every match in `currentMatches` must appear in exactly one group. Overdue = past dates needing action. Today = today's date only. Future = by week. No status-based filtering for group assignment — status determines what the card LOOKS like, date determines WHERE it appears.

Additional design questions surfaced but not resolved:
- Should "今日" use `date === today` or `date <= today`? Past scheduled matches (auto-transition never fired) need to show somewhere. Recommendation reached: overdue section catches all past-date matches needing action, today is strictly today.
- Should the overdue label change from "請輸入獲勝隊伍" to something broader? If overdue includes past scheduled matches (not just active), the current label is misleading.
- Completed matches with pending pools showing in 當前 need visual treatment — the card currently renders without the emerald result band, making it look like a scheduled match.

## Blastcheck findings still open (from the S73 report)

All 8 "needs update" items from the blastcheck remain unaddressed:
1. ShareRatioEditor render context in PoolBetSection (user said looks fine)
2. Pool entry form position (below bet columns, should be above per E1)
3. Pool header visual parity with MatchHeader
4. Pool bet column styling parity (text-sm vs text-base, no hover, no alternating rows)
5. Pool edit mode (no edit capability — fix 6 addressed this but was reverted)
6. Pool result entry gating (fix 1 addressed this but was reverted)
7. Pool card tab placement with pending pools (fix 2 addressed this but was reverted)
8. Pool capacity enforcement honesty (visual bar but no backend validation)
Plus: PoolReportHeader typography (text-[13px] below 14px floor)

## Backup files in this directory

- `matches-page-s73.tsx` — matches/page.tsx with all 8 fixes applied (reference for fixes 1-7 code)
- `PoolCreationModal-s73.tsx` — PoolCreationModal with edit mode (reference for fixes 4+6 code)
