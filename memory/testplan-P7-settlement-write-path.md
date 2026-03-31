# Functional Test Plan — P7 Settlement Write Path

**Feature:** After a match/pool result RPC succeeds, the app auto-persists settlement data to `match_settlements` (per-member per-match) and re-aggregates `settlements` (monthly totals). The report page reads from DB instead of calculating client-side. A correction preview modal shows affected members before re-persisting.

**Status key:** ✅ pass | ❌ fail | ⬜ not tested

---

## Setup

**Preconditions:**
- Dev server running (`npx next dev`)
- Supabase has test data: TEST members (10), TEST matches (4), TEST bets (30)
- `match_settlements` table exists with constraint `match_settlements_upsert_key` (UNIQUE NULLS NOT DISTINCT)
- `club_billing_config` has 1 row (100 BPS, free period from 2026-05-11)
- Browser dev tools Console tab open to catch logged errors

**Navigation:** `/matches` page → 當前 tab for active/scheduled matches, 已完成 tab for completed matches

---

## Happy Path

### #1 ✅ Submit base match result
**Action:** Find a TEST match in scheduled or betting_closed status that has bets. Click 輸入結果 > on the match card. Select A隊 or B隊. Confirm.
**Expected:** Result saves successfully. Card transforms (emerald/completed).
**Check:** No errors in console.

### #2 ✅ Verify match_settlements rows created
**Action:** Go to Supabase Table Editor → match_settlements. Filter by the match_id you just submitted.
**Expected:** One row per member who had active base bets on this match. settlement_context = 'base', sporadic_pool_id = NULL. All rows have settlement_date = the match's date.
**Check:**
- gross_liang, rake_liang, net_liang are non-zero numerics
- provider_fee_liang = 0 (free period active until 2026-11-11)
- detail_jsonb is populated (not null) — contains a JSON object with memberId, matchId, betGainNtd, rakeNtd, finalNetNtd, etc.
- updated_at timestamp is approximately now

**Bugs found & fixed during this test:**
- Bug 1: Supabase JS `.upsert()` can't reference partial unique indexes → added `UNIQUE NULLS NOT DISTINCT` constraint (007b)
- Bug 2: INTEGER columns rejecting decimal liang (9.5) → ALTERed to NUMERIC (007c)

### #3 ✅ Verify monthly settlements updated
**Action:** In Supabase → settlements table. Filter by a member_id from #2 and the year/month of the match date.
**Expected:** A row exists (upserted). gross_liang, rake_liang, net_liang reflect the sum of all that member's match_settlements in that month. provider_fee_liang = 0.
**Check:** If this member had no prior match_settlements this month, the monthly row should exactly equal the single match_settlements row values.

### #4 ✅ Report page reads from DB
**Action:** Navigate to /bets?match={same match_id}&from=completed (click 查看投注 on the completed card that has settlement rows, or navigate directly).
**Expected:** Report page loads. Shows the match header with result banner (A隊勝 or B隊勝). 結算明細 section renders with member names, amounts, and net totals. NO "結算資料尚未生成" amber banner.
**Check:** Values displayed match the match_settlements rows from #2. Net amounts show correct sign (positive = emerald, negative = red).

**Note:** Must use the match that was submitted AFTER the bug fixes (has `match_settlements` rows). The match from test #1 (before fixes) has no rows and will correctly show the amber banner.

---

## Input Variations

### #5 ✅ Submit result for opposite team
**Action:** Find another TEST match with bets. Submit result for the OTHER team (B隊 if you chose A隊 in #1).
**Expected:** Same success flow as #1. New match_settlements rows created.
**Check:** Members who bet on the winning team have positive net_liang. Members who bet on the losing team have negative net_liang. Winners and losers net to approximately zero (±rake).

### #6 ⏭️ Match with only 1-sided bets (all on same team) — SKIPPED (no test data, low risk)
**Action:** If a TEST match exists where all bets are on one team, submit its result. (If none exists, note as "skipped — no test data".)
**Expected:** Settlement rows created. All non-player bets show 0 gross (no opposing money to win/lose). Player shares still calculated.
**Check:** match_settlements rows exist for all betting members. Values are consistent.

### #7 ✅ Monthly aggregation with multiple matches in same month
**Action:** After #1 and #5, check if both matches have the same year/month in their date.
**Expected:** If same month — the settlements row for any member with bets in both matches should show the SUM of their match_settlements across both matches.
**Check:** In Supabase → settlements, pick a member who bet on both matches. Verify: settlements.gross_liang = sum of their match_settlements.gross_liang for all rows in that month.

---

## Edge Cases

### #8 ✅ Report page for match with result but NO settlement rows
**Action:** Manually delete the match_settlements rows for a completed match (Supabase Table Editor → select rows → delete). Then reload the report page for that match.
**Expected:** Amber banner appears: "結算資料尚未生成". A "預覽計算結果" link appears below it.
**Check:** Click "預覽計算結果" — a diagnostic settlement renders with "未確認預覽 — 僅供診斷參考，非正式結算" label above it. Click "隱藏預覽" — diagnostic disappears. Banner remains visible throughout.

### #9 ✅ Report page for match with NO result (active/scheduled)
**UI note (not a bug):** User feedback — "比賽進行中" message should be near top of page so bookkeeper can quickly navigate away. Log for Step 10 polish.
**Action:** Navigate to /bets?match={a match with status active or scheduled}&from=bets
**Expected:** Page loads but shows "比賽進行中，結算待結果輸入後計算" placeholder. No settlement section. No amber banner.
**Check:** No errors in console.

### #10 ✅ detail_jsonb fallback
**Action:** In Supabase, find a match_settlements row from #2. Edit it: set detail_jsonb to NULL (clear the cell). Reload the report page for that match.
**Expected:** Report still renders. That member's settlement row shows amounts derived from the canonical columns (gross_liang, rake_liang, net_liang).
**Check:** The row renders without errors. Some intermediate fields (betGainNtd, etc.) may show 0 since the fallback can't reconstruct them — that's expected. Restore the JSONB value after checking.

---

## Error States

### #11 ⬜ Console errors on settlement persist failure
**Action:** Observe the browser console during #1 (result submission).
**Expected:** No errors logged. No "Settlement persist failed" or "Settlement data fetch failed" messages.
**Check:** If any such messages appear, note the full error text.

### #12 ⬜ Billing config missing
**Action:** In Supabase → club_billing_config, temporarily delete the single row. Submit a match result on a match with bets.
**Expected:** Result RPC succeeds (match gets its result). Settlement does NOT persist. Console shows: "Settlement data fetch failed — settlement not persisted". Report page shows the amber "結算資料尚未生成" banner.
**Check:** Restore the billing config row after testing. Verify match still has its result (the RPC is independent of settlement persistence).

---

## Correction Flow

### #13 ⬜ Correct a base match result (with existing settlement)
**Action:** Go to 已完成 tab. Find a match that has match_settlements rows. Click the pencil (correct result). Select the opposite team. A correction preview modal should appear.
**Expected:** Modal title: "更正結果確認". Shows old winner crossed out → new winner. Amber warning: "此場次已有確認結算。修改勝負將重新計算所有相關結算資料。" List of affected members with their current net_liang values.
**Check:** Member count matches the number of match_settlements rows for this match. Members sorted by absolute net_liang (largest impact first).

### #14 ⬜ Confirm correction — settlement re-persisted
**Action:** Click "確認修改" in the modal from #13.
**Expected:** Modal closes. Card updates to show new winner.
**Check:** In Supabase → match_settlements, filter by this match_id. Rows now reflect the NEW result (winners/losers flipped). updated_at timestamps are fresh (just now). detail_jsonb reflects the new calculation. Monthly settlements table also re-aggregated.

### #15 ⬜ Correct a result when NO settlement rows exist
**Action:** Delete the match_settlements rows for a completed match (Supabase). Then attempt to correct that match's result via pencil icon.
**Expected:** CorrectionPreviewModal auto-skips (no modal appears). Correction proceeds directly — RPC runs, new settlement rows created.
**Check:** match_settlements rows now exist with the corrected result. No console errors.

---

## Pool Settlement

### #16 ⬜ Submit sporadic pool result
**Action:** Find a TEST match that has a sporadic pool with bets. On the matches page, click the pool's result entry. Select a winner. Confirm.
**Expected:** Pool result saves. Settlement rows created in match_settlements.
**Check:** In Supabase → match_settlements, filter by match_id + settlement_context = 'sporadic_pool'. sporadic_pool_id matches the pool's UUID. settlement_date = parent match's date. detail_jsonb populated. Values non-zero. Monthly settlements re-aggregated (member totals now include pool settlement).

### #17 ⬜ Pool correction with existing settlement
**Action:** Correct the pool result from #16 to the opposite team.
**Expected:** CorrectionPreviewModal appears with pool context (settlement_context = 'sporadic_pool', shows pool's affected members). After confirming, match_settlements rows overwritten with new calculation.
**Check:** Same verifications as #14 but for pool rows. Monthly settlements re-aggregated.

### #18 ⬜ Report shows pool settlements from DB
**Action:** Navigate to the report page for the match with the settled pool.
**Expected:** Base settlement section renders (from DB). Pool section renders below it (from DB). Each has its own settlement data.
**Check:** Pool section header visible. Pool settlement values match match_settlements rows for that sporadic_pool_id.

---

## End-to-End Workflow

### #19 ⬜ Complete bookkeeper workflow: result → report → correction → verify
**Action:**
(a) Find a TEST match with bets (scheduled or betting_closed). Submit result (A隊勝).
(b) Navigate to the report page for that match. Verify settlement renders.
(c) Go back to 已完成 tab. Click pencil to correct result to B隊勝.
(d) Correction preview modal appears — review affected members, confirm.
(e) Navigate to report page again. Verify settlement reflects B隊勝.
(f) Check Supabase: match_settlements has correct rows, settlements monthly total correct.
**Expected:** Entire flow completes without errors. Data consistent at every step.
**Check:**
- Console clean throughout (no red errors, no "failed" warnings)
- match_settlements updated_at reflects the correction timestamp
- Monthly settlements row aggregates correctly across all matches in that month
- Report page shows B隊勝 result and matching settlement numbers
