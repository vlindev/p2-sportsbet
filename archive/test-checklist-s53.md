# Functional Test Checklist — S53 Fix-Now Items

All 17 fix-now items implemented. This checklist covers manual browser + DB verification.
Created end of S53 for execution next session.

**Test data reference:**
- Match 001: `22222222-...-000000000001` — Monday, completed, Team B won, has mandatory_monday bets
- Match 002: `22222222-...-000000000002` — Optional, completed, Team A won, capacity 15
- Match 003: `22222222-...-000000000003` — Monday, scheduled, pending
- Match 004: `22222222-...-000000000004` — Optional, active, pending
- Stress match: `bbbbbbbb-...-000000000001` — Monday, completed, 85 bets

**Pre-test:** Confirm dev server running on localhost:3000. Confirm SQL migration `s53-fix-pool-rpcs.sql` has been applied (done S53).

---

## Group 1: 🔴-3 — Pool RPCs `performed_by` parameter

**Requires:** A sporadic pool with a result to submit or correct. No pool test data exists yet — must create a pool first (see Test Setup below).

### Test 1.1 — Pool result submission audit trail
- **Setup:** Create a sporadic pool on Match 003 via the matches page (+ 加強盤 button)
- **Page:** `/matches` → scheduled match card → enter pool result
- **Action:** Submit pool result (pick a winner)
- **Verify in Supabase:** `SELECT * FROM audit_log WHERE action_type = 'pool_result_submitted' ORDER BY performed_at DESC LIMIT 1;`
- **Expected:** `performed_by = 'bookkeeper'` (from client parameter, not hardcoded)

### Test 1.2 — Pool result correction audit trail
- **Page:** Same pool as 1.1 → correction pencil
- **Action:** Correct the pool result (flip winner)
- **Verify in Supabase:** `SELECT * FROM audit_log WHERE action_type = 'pool_result_corrected' ORDER BY performed_at DESC LIMIT 1;`
- **Expected:** `performed_by = 'bookkeeper'`

### Test 1.3 — Match cancellation audit trail
- **Setup:** Create a throwaway scheduled match (or use an existing one you're willing to cancel)
- **Page:** `/matches` → match card → cancel
- **Verify in Supabase:** `SELECT * FROM audit_log WHERE action_type = 'match_cancelled' ORDER BY performed_at DESC LIMIT 1;`
- **Expected:** `performed_by = 'bookkeeper'`

---

## Group 2: 🔴-1 — Auto-placement excludes pool bets

**Requires:** A Monday match in `betting_closed` status with a member who has ONLY a pool bet (no base bet). No pool test data exists — must create through the UI.

### Test 2.1 — Auto-placement with pool-only member
- **Setup:**
  1. Use Match 003 (Monday, scheduled)
  2. Create a sporadic pool on it
  3. Enter a pool bet for member TEST 王志偉 (member 005, not a player in this match)
  4. Do NOT enter a base bet for this member
  5. 封盤 the match
- **Page:** `/bets?match=22222222-0000-0000-0000-000000000003&from=current`
- **Action:** Click 自動派注
- **Expected:** TEST 王志偉 SHOULD receive an auto-placed base bet (1兩 mandatory_monday). Before the fix, the pool bet would have made the system think they already had a bet.
- **Verify in Supabase:** `SELECT * FROM bets WHERE match_id = '22222222-0000-0000-0000-000000000003' AND member_id = '11111111-0000-0000-0000-000000000005' AND bet_type = 'mandatory_monday';`

---

## Group 2: 🔴-2 — Bulk reduction doesn't mutate `requested_amount`

### Test 2.2 — Bulk reduction preserves requested_amount
- **Setup:** Match 003 needs at least one 2兩 voluntary bet. Enter one if none exists.
- **Page:** `/bets?match=22222222-0000-0000-0000-000000000003&from=current`
- **Action:**
  1. Note the member_id of a 2兩 voluntary bet
  2. Click 全額降注 → confirm
- **Verify in Supabase:** `SELECT requested_amount, accepted_amount FROM bet_requests WHERE match_id = '22222222-0000-0000-0000-000000000003' AND bet_type = 'voluntary' AND status = 'accepted';`
- **Expected:** `requested_amount = 2` (unchanged), `accepted_amount = 1` (reduced). Before the fix, both were set to 1.

---

## Group 3: UI-1, UI-2, UI-3 — Report bet column fixes

### Test 3.1 — Bet sort order, badges, and grey auto-placed
- **Page:** `http://localhost:3000/bets?match=22222222-0000-0000-0000-000000000001&from=completed`
- **Verify:**
  1. **Sort order (UI-1):** In each A/B column, bets appear in this order: mandatory_self bets first, then voluntary bets (higher amount before lower), then mandatory_monday last
  2. **Badge rule (UI-2):** ONLY mandatory_monday bets have a grey "補" badge. The badge is positioned LEFT of the amount (amount is rightmost). No "自" or "願" badges anywhere.
  3. **Grey auto-placed (UI-3):** mandatory_monday bet rows have muted grey text (name AND amount) regardless of whether they're on the winning or losing side

### Test 3.2 — Stress test report (85 bets)
- **Page:** `http://localhost:3000/bets?match=bbbbbbbb-0000-0000-0000-000000000001&from=completed`
- **Verify:** Same 3 checks as 3.1 but with 85 bets. Confirm no visual breakage at scale.

---

## Group 4: UI-4 — No "已鎖定" in report view

### Test 4.1 — Share display on completed match
- **Page:** `http://localhost:3000/bets?match=22222222-0000-0000-0000-000000000001&from=completed`
- **Verify:**
  1. Share ratio section shows "分潤 50/50" (compact display)
  2. No "已鎖定" text or badge visible
  3. No edit pencil icon visible (locked because match is completed)

---

## Group 4: 🟠-1 — Share post-write verification

### Test 4.2 — Share save works correctly
- **Page:** `/bets?match=22222222-0000-0000-0000-000000000003&from=current` (Match 003, scheduled)
- **Action:**
  1. Click the pencil icon on the share ratio
  2. Change to 60/40
  3. Click 儲存
- **Verify:**
  1. Save succeeds, ratio updates to 60/40
  2. In Supabase: `SELECT match_side, player_id, share_bps FROM match_team_player_shares WHERE match_id = '22222222-0000-0000-0000-000000000003' AND context = 'base';`
  3. Each side's shares sum to exactly 10,000
- **Note:** The post-write verification is invisible when it passes. It only fires visibly if the DB gets corrupted (unlikely in normal use). The test here confirms normal save still works.

---

## Group 5: 🟠-2 — Billing config error banner

### Test 5.1 — Billing config missing
- **This is hard to test without breaking the DB.** The billing config exists and is correct.
- **Code verification only:** The `billingError` state is set when `billingRes.error` fires. The banner renders when `hasResult && billingError`. Verified via code review — no manual test needed unless you want to temporarily delete the `club_billing_config` row (NOT recommended).
- **Skip or defer.**

---

## Group 5: 🟠-3 — Shares validation error banner

### Test 5.2 — Shares validation
- **Same situation as 5.1** — shares are auto-populated correctly at match creation. To trigger this error you'd need corrupted share data.
- **Code verification only.** The `sharesValid()` function was unit-verified via the settlement test suite (all 143 tests pass with correct shares). The error banner is a safety net for data corruption.
- **Skip or defer.**

---

## Group 5: 🟡-4 — Refresh button

### Test 5.3 — Refresh button visible and functional
- **Page:** `http://localhost:3000/bets?match=22222222-0000-0000-0000-000000000001&from=completed`
- **Verify:**
  1. Small refresh icon (↻) appears next to "返回賽事" in the top-left
  2. Clicking it reloads the report data (page briefly shows loading state, then returns)

---

## Group 5: 🟡-5 — Active match pending indicator

### Test 5.4 — Pending indicator on active match
- **Page:** `http://localhost:3000/bets?match=22222222-0000-0000-0000-000000000004&from=current`
- **Verify:**
  1. Match 004 is active with no result
  2. Below the bet columns, a grey box reads: "比賽進行中，結算待結果輸入後計算"
  3. No settlement calculations or settlement rows appear

---

## Group 5: 🔵-3 — Voided pool excluded from report

### Test 5.5 — Voided pool not rendered
- **Requires:** A pool with `result = 'voided'`. No test data exists.
- **Setup (if testing):** Create a pool, then manually set its result to 'voided' in Supabase:
  `UPDATE sporadic_pools SET result = 'voided' WHERE id = '[pool_id]';`
- **Page:** The report page for that match
- **Verify:** The voided pool does NOT appear in the report. Only non-cancelled, non-voided pools render.
- **Alternative:** Defer — the filter logic is straightforward (`p.result !== "cancelled" && p.result !== "voided"`). Code review sufficient.

---

## Group 6: 🟡-3 — Duplicate bet pre-check

### Test 6.1 — Duplicate voluntary bet blocked
- **Page:** `http://localhost:3000/bets?match=22222222-0000-0000-0000-000000000003&from=current`
- **Action:**
  1. Enter a voluntary bet for any member (e.g. TEST 林美玲, member 006, B隊, 1兩)
  2. After it saves, try entering ANOTHER voluntary bet for the same member on the same match
- **Expected:** Red error text: "此會員已有此場投注". The second bet is NOT created.

### Test 6.2 — Duplicate pool bet blocked (requires pool)
- **Setup:** Create a sporadic pool on Match 003 if not already done
- **Page:** `/bets?match=22222222-0000-0000-0000-000000000003&from=current` → pool section
- **Action:** Enter a pool bet, then try entering another for the same member on the same pool
- **Expected:** Red error text: "此會員已有此盤投注"

---

## Group 6: 🟠-5 — Existing request check (no orphaned duplicates)

### Test 6.3 — No duplicate bet_request on re-entry
- **Page:** `/bets?match=22222222-0000-0000-0000-000000000003&from=current`
- **Action:**
  1. Enter a bet for a member
  2. Delete that bet (hover X)
  3. Re-enter a bet for the same member
- **Verify in Supabase:** `SELECT * FROM bet_requests WHERE match_id = '22222222-0000-0000-0000-000000000003' AND member_id = '[member_id]' AND status = 'accepted';`
- **Expected:** Exactly ONE accepted bet_request for that member (not two). The second entry reuses the existing accepted request.

---

## Group 6: 🟡-1 — Cleanup bet_request on bet deletion

### Test 6.4 — bet_request deleted with bet
- **Page:** `/bets?match=22222222-0000-0000-0000-000000000003&from=current`
- **Action:**
  1. Enter a voluntary bet for a member (note member_id)
  2. Verify bet_request exists: `SELECT * FROM bet_requests WHERE match_id = '22222222-0000-0000-0000-000000000003' AND member_id = '[member_id]';`
  3. Delete the bet (hover X)
- **Verify in Supabase:** Same query as step 2
- **Expected:** The bet_request row is also deleted. No orphaned request remains.

---

## Group 7: 🟠-6 — Date overflow fix

### Already verified programmatically (S53)
- Casino Golf case: `2026-05-11 + 6 months = 2026-11-11` ✓
- Month-end overflow: `2026-01-31 + 1 month = 2026-02-28` ✓
- Year boundary: `2026-11-15 + 3 months = 2027-02-15` ✓
- **No manual test needed.**

---

## Test Setup — Sporadic Pool Creation

Multiple tests above require sporadic pool data that doesn't exist. Before running those tests:

1. Go to `/matches` → find Match 003 (Monday, scheduled)
2. Click `+ 加強盤` on the match card
3. Set: A隊開盤, 平盤, capacity 20支
4. This creates the pool + auto-creates 50/50 share rows

This enables: Tests 1.1, 1.2, 2.1, 5.5, 6.2

---

## Recommended Test Order

1. **Setup:** Create sporadic pool on Match 003
2. **Visual checks (no DB needed):** 3.1, 3.2, 4.1, 5.3, 5.4
3. **Bet entry + deletion flow:** 6.1, 6.4, 6.3 (in that order — they build on each other)
4. **Pool bet entry:** 6.2
5. **Share editing:** 4.2
6. **Auto-placement + bulk reduction:** 2.1, 2.2 (requires 封盤)
7. **Pool result + audit:** 1.1, 1.2
8. **Match cancellation audit:** 1.3 (only if a throwaway match is available)
9. **Skip:** 5.1, 5.2, 5.5 (error states — code review sufficient)

---

## Post-Test Cleanup

After all tests, clean up any test-generated data:
```sql
-- Delete test audit_log entries (append-only, but test data is noise)
DELETE FROM audit_log WHERE performed_at > '2026-03-08';

-- Delete any sporadic pools created during testing
DELETE FROM sporadic_pools WHERE match_id = '22222222-0000-0000-0000-000000000003';

-- Reset Match 003 to clean state if modified
UPDATE matches SET status = 'scheduled' WHERE id = '22222222-0000-0000-0000-000000000003';

-- Delete any test bet_requests
DELETE FROM bet_requests WHERE match_id = '22222222-0000-0000-0000-000000000003' AND created_by_role = 'bookkeeper';

-- Delete any voluntary test bets added during testing
DELETE FROM bets WHERE match_id = '22222222-0000-0000-0000-000000000003' AND bet_type = 'voluntary';
```
