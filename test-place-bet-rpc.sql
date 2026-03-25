-- ═══════════════════════════════════════════════════════════════
-- Phase 5: place_bet RPC verification
-- Run in Supabase SQL Editor — section by section
--
-- Test data IDs:
--   Match 003 = scheduled, monday, no capacity
--   Match 004 = active, optional, capacity 20
--   Match 001 = completed
--   Members 008, 009, 010 = no bets on match 003 (008/010 active, 009 inactive)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- SETUP: Create temp sporadic pool on match 003
-- (opened by team A, capacity 20支 = 60兩)
-- ───────────────────────────────────────────
INSERT INTO sporadic_pools (id, match_id, opened_by_team, handicap_type, handicap_value, handicap_team, capacity_zhi, result)
VALUES ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'A', '讓點', 1, 'A', 20, 'pending');

INSERT INTO match_team_player_shares (match_id, match_side, player_id, share_bps, context, sporadic_pool_id) VALUES
  ('22222222-0000-0000-0000-000000000003', 'A', '11111111-0000-0000-0000-000000000001', 5000, 'sporadic_pool', '33333333-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000003', 'A', '11111111-0000-0000-0000-000000000003', 5000, 'sporadic_pool', '33333333-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000003', 'B', '11111111-0000-0000-0000-000000000005', 5000, 'sporadic_pool', '33333333-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000003', 'B', '11111111-0000-0000-0000-000000000007', 5000, 'sporadic_pool', '33333333-0000-0000-0000-000000000001');


-- ═══════════════════════════════════════════════════════════════
-- RUN TOGETHER: Tests A1–A3, P1, R1–R5 (no exceptions, no status changes)
-- ═══════════════════════════════════════════════════════════════

-- A1: Accepted — base bet on scheduled match
-- Member 008, match 003, team B, 1兩, voluntary, bookkeeper
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000008'::uuid,
  'B', 1, 'voluntary',
  NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": true, "status": "accepted", "bet_id": <uuid>, "request_id": <uuid>}

-- A2: Accepted — pool bet on opposing team
-- Member 010, pool (opened by A), team B, 3兩 (1支), voluntary, bookkeeper
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000010'::uuid,
  'B', 3, 'voluntary',
  '33333333-0000-0000-0000-000000000001'::uuid,
  'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": true, "status": "accepted", "bet_id": <uuid>, "request_id": <uuid>}

-- P1: Pending — non-bookkeeper over-capacity on pool
-- Pool capacity = 20支 = 60兩. Current B exposure = 3 (from A2). Available = 57.
-- Member 006, pool, B, 63兩 (21支), member role → 63 > 57 → pending
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000006'::uuid,
  'B', 63, 'voluntary',
  '33333333-0000-0000-0000-000000000001'::uuid,
  'member', 'manual', 'test'
);
-- Expected: {"success": true, "status": "pending", "bet_id": null, "request_id": <uuid>}

-- A3: Accepted — bookkeeper over-capacity (Phase 1 override)
-- Member 008, pool, B, 150兩 (50支), bookkeeper → auto-accept despite over-capacity
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000008'::uuid,
  'B', 150, 'voluntary',
  '33333333-0000-0000-0000-000000000001'::uuid,
  'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": true, "status": "accepted", "bet_id": <uuid>, "request_id": <uuid>}

-- R1: Rejected — duplicate base bet
-- Member 008 already has base voluntary bet from A1
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000008'::uuid,
  'B', 1, 'voluntary',
  NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": false, "status": "rejected", "reject_reason": "duplicate_bet"}

-- R2: Rejected — R5.4 pool opening team restriction
-- Pool opened by A. Betting on A = violation. Universal, no player exception.
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000009'::uuid,
  'A', 3, 'voluntary',
  '33333333-0000-0000-0000-000000000001'::uuid,
  'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": false, "status": "rejected", "reject_reason": "bet_on_opening_team"}

-- R3: Rejected — invalid base amount (3兩 on standard config)
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000009'::uuid,
  'B', 3, 'voluntary',
  NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": false, "status": "rejected", "reject_reason": "invalid_base_amount"}

-- R4: Rejected — match status = active
SELECT place_bet(
  '22222222-0000-0000-0000-000000000004'::uuid,
  '11111111-0000-0000-0000-000000000010'::uuid,
  'B', 1, 'voluntary',
  NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": false, "status": "rejected", "reject_reason": "match_status_active"}

-- R5: Rejected — match status = completed
SELECT place_bet(
  '22222222-0000-0000-0000-000000000001'::uuid,
  '11111111-0000-0000-0000-000000000010'::uuid,
  'B', 1, 'voluntary',
  NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": false, "status": "rejected", "reject_reason": "match_status_completed"}


-- ═══════════════════════════════════════════════════════════════
-- VERIFY: Check rows created by A1, A2, A3, P1
-- ═══════════════════════════════════════════════════════════════

-- A1 verification: base bet + request for member 008
SELECT 'A1-request' AS test, id, status, accepted_amount, requested_amount
FROM bet_requests
WHERE match_id = '22222222-0000-0000-0000-000000000003'
  AND member_id = '11111111-0000-0000-0000-000000000008'
  AND sporadic_pool_id IS NULL
ORDER BY created_at DESC LIMIT 1;

SELECT 'A1-bet' AS test, id, status, result, amount_liang, bet_type
FROM bets
WHERE match_id = '22222222-0000-0000-0000-000000000003'
  AND member_id = '11111111-0000-0000-0000-000000000008'
  AND bet_type = 'voluntary'
  AND sporadic_pool_id IS NULL
  AND created_by_role = 'bookkeeper'
ORDER BY created_at DESC LIMIT 1;

-- A2 verification: pool bet + request for member 010
SELECT 'A2-request' AS test, id, status, accepted_amount
FROM bet_requests
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001'
  AND member_id = '11111111-0000-0000-0000-000000000010';

SELECT 'A2-bet' AS test, id, status, amount_liang
FROM bets
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001'
  AND member_id = '11111111-0000-0000-0000-000000000010';

-- P1 verification: pending request for member 006, NO bet row
SELECT 'P1-request' AS test, id, status, accepted_amount, requested_amount
FROM bet_requests
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001'
  AND member_id = '11111111-0000-0000-0000-000000000006';
-- Expected: status=pending, accepted_amount=0, requested_amount=63

SELECT 'P1-bet (should be empty)' AS test, COUNT(*) AS count
FROM bets
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001'
  AND member_id = '11111111-0000-0000-0000-000000000006';
-- Expected: count = 0

-- A3 verification: pool bet for member 008 (bookkeeper over-capacity)
SELECT 'A3-request' AS test, id, status, accepted_amount
FROM bet_requests
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001'
  AND member_id = '11111111-0000-0000-0000-000000000008';

SELECT 'A3-bet' AS test, id, status, amount_liang
FROM bets
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001'
  AND member_id = '11111111-0000-0000-0000-000000000008';
-- Expected: status=active, amount_liang=150

-- R1-R5: No rows should have been created for rejected calls
SELECT 'R-check (should be 0)' AS test, COUNT(*) AS orphaned_requests
FROM bet_requests
WHERE member_id = '11111111-0000-0000-0000-000000000009'
  AND match_id = '22222222-0000-0000-0000-000000000003';
-- Expected: 0


-- ═══════════════════════════════════════════════════════════════
-- RUN SEPARATELY: Betting closed tests (requires status change + revert)
-- ═══════════════════════════════════════════════════════════════

-- Temp: set match 003 to betting_closed
UPDATE matches SET status = 'betting_closed' WHERE id = '22222222-0000-0000-0000-000000000003';

-- R6: Rejected — betting_closed + non-bookkeeper
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000009'::uuid,
  'B', 1, 'voluntary',
  NULL, 'member', 'manual', 'test'
);
-- Expected: {"success": false, "status": "rejected", "reject_reason": "betting_closed"}

-- A4: Accepted — betting_closed + bookkeeper (R23.3)
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000009'::uuid,
  'B', 1, 'voluntary',
  NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: {"success": true, "status": "accepted"}

-- Revert match 003 to scheduled
UPDATE matches SET status = 'scheduled' WHERE id = '22222222-0000-0000-0000-000000000003';


-- ═══════════════════════════════════════════════════════════════
-- RUN ONE AT A TIME: Exception tests (each rolls back on error)
-- ═══════════════════════════════════════════════════════════════

-- I1: Invalid — nonexistent match
SELECT place_bet(
  '99999999-9999-9999-9999-999999999999'::uuid,
  '11111111-0000-0000-0000-000000000008'::uuid,
  'B', 1, 'voluntary', NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: EXCEPTION 'Match not found'

-- I2: Invalid — mandatory_self
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000008'::uuid,
  'B', 5, 'mandatory_self', NULL, 'bookkeeper', 'manual', 'test'
);
-- Expected: EXCEPTION 'mandatory_self not supported via place_bet'

-- I3: Invalid — nonexistent pool
SELECT place_bet(
  '22222222-0000-0000-0000-000000000003'::uuid,
  '11111111-0000-0000-0000-000000000008'::uuid,
  'B', 3, 'voluntary',
  '99999999-9999-9999-9999-999999999999'::uuid,
  'bookkeeper', 'manual', 'test'
);
-- Expected: EXCEPTION 'Sporadic pool not found'


-- ═══════════════════════════════════════════════════════════════
-- CLEANUP: Remove all test-created rows
-- ═══════════════════════════════════════════════════════════════

-- Delete test bets created by RPC (created_by_role in bookkeeper/member, on pool or specific combos)
DELETE FROM bets
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001';

DELETE FROM bets
WHERE match_id = '22222222-0000-0000-0000-000000000003'
  AND member_id IN ('11111111-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000009')
  AND bet_type = 'voluntary'
  AND sporadic_pool_id IS NULL
  AND created_by_role IN ('bookkeeper', 'member');

-- Delete test bet_requests
DELETE FROM bet_requests
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001';

DELETE FROM bet_requests
WHERE match_id = '22222222-0000-0000-0000-000000000003'
  AND member_id IN ('11111111-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000009')
  AND sporadic_pool_id IS NULL
  AND created_by_role IN ('bookkeeper', 'member');

-- Delete temp pool shares + pool
DELETE FROM match_team_player_shares
WHERE sporadic_pool_id = '33333333-0000-0000-0000-000000000001';

DELETE FROM sporadic_pools
WHERE id = '33333333-0000-0000-0000-000000000001';

-- Verify match 003 is back to scheduled
SELECT id, status FROM matches WHERE id = '22222222-0000-0000-0000-000000000003';
