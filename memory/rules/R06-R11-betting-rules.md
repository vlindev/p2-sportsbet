R6. MONETARY UNITS

R6.1   1 liang = 1,000 NTD exactly.
R6.2   1 zhi = 3 liang = 3,000 NTD exactly.
R6.3   All bet amount_liang values MUST be positive integers. Non-integer liang amounts are NOT valid as bet inputs.
R6.4   All settlement arithmetic MUST be performed in integer NTD using 64-bit integers. See R18.
R6.5   Conversion liang to NTD: ntd = liang × 1,000. This conversion is always exact.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R7. MANDATORY SELF-BET

R7.1   At match creation, the system MUST auto-generate exactly one mandatory self-bet for each of the 4 players.
R7.2   Mandatory self-bet properties: amount_liang per bet configuration (standard = 5, small = 3; see R8.5), bet_type = mandatory_self, team_bet_on = player's own team side, created_by_role = system, created_via = rule_engine, status = active.
R7.3   Mandatory self-bets MUST NOT be modified, reduced, or deleted by any user or process.
R7.4   Mandatory self-bets MUST be included in all settlement and payout calculations.
R7.5   Mandatory self-bets MUST NOT count toward capacity_zhi.
R7.6   Mandatory self-bets MUST NOT enter bet_requests. They are written DIRECTLY to bets.
R7.7   When a player is replaced pre-start (R25.3), the outgoing player's mandatory self-bet MUST be voided and a new mandatory self-bet MUST be generated for the incoming player in the same transaction.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R8. BET TYPES

R8.1   bets.bet_type MUST be one of: mandatory_self, mandatory_monday, voluntary. No other values are valid.
R8.2   mandatory_self: System-generated self-bet for a player. Auto-created at match creation. See R7.
       Amount depends on match bet configuration: standard = 5 liang, small = 3 liang. See R8.5.
R8.3   mandatory_monday: System-generated bet for an active member who missed the Monday deadline. Amount: 1 liang. See R10.
R8.4   voluntary: Bet placed by a member of their own choice, whether player or external bettor.
       For base match bets (non-sporadic): amount depends on bet configuration. Standard: 1兩 or 2兩. Small: 1兩 only. For sporadic pool bets: see R5.6.
R8.5   BET CONFIGURATION (per match):
       Two configurations exist. No other combinations are valid.
       STANDARD (標準盤): mandatory_self = 5兩, voluntary = 1兩 or 2兩.
       SMALL (小盤): mandatory_self = 3兩, voluntary = 1兩 only.
       Monday matches: MUST use standard. No choice.
       Optional matches: default standard, bookkeeper MAY select small. UX for selection TBD.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R9. MONDAY MANDATORY BETTING

R9.1   Every active member MUST have exactly one bet on every Monday match.
R9.2   Players fulfill R9.1 via their mandatory self-bet (R7).
R9.3   Active members who are not players and do not submit a voluntary bet by Sunday 7:00 PM are auto-placed per R10.
R9.4   The Sunday 7:00 PM deadline applies year-round. This deadline applies to Monday matches ONLY.
R9.5   Monday base match capacity_zhi MUST be null (no capacity limit on base match betting).
R9.6   Monday mandatory betting applies ONLY to the base match. Sporadic pools on a Monday match are entirely voluntary — no member is forced to bet on any sporadic pool. [OQ-4: RESOLVED]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R10. MONDAY AUTO-PLACEMENT ALGORITHM

R10.1  Trigger: Sunday 7:00 PM deadline passes for a Monday match. A 2-minute grace period applies: bets received by 7:02 PM are accepted. After 7:02 PM, auto-placement begins.
R10.2  For each Monday match, identify all active members with no bet of any type on that match.
R10.3  For each such member, generate one bet: amount_liang = 1, bet_type = mandatory_monday, created_by_role = system, created_via = scheduled_job, result = pending, status = active.
R10.4  The algorithm below determines which side each auto-placed bet is assigned to. The algorithm MUST be applied per match, per member, recalculating counts and amounts after each placement.

STEP 1 — BALANCE BY COUNT:
  count_a = number of bettors on Team A side (all active bets)
  count_b = number of bettors on Team B side (all active bets)
  If count_a < count_b: assign to Team A. Stop.
  If count_b < count_a: assign to Team B. Stop.
  If count_a = count_b: proceed to Step 2.

STEP 2 — BALANCE BY AMOUNT:
  amount_a = SUM(amount_liang) of all active bets on Team A
  amount_b = SUM(amount_liang) of all active bets on Team B
  If amount_a < amount_b: assign to Team A. Stop.
  If amount_b < amount_a: assign to Team B. Stop.
  If amount_a = amount_b: proceed to Step 3.

STEP 3 — TIEBREAKER:
  Compare Team A name and Team B name using Unicode lexicographic order, character by character.
  Assign to the team whose name sorts EARLIER alphabetically.

R10.5  Auto-placed bets MUST enter bet_requests and are immediately auto-accepted (Monday has no capacity). See R12.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R11. BET VALIDITY RULES

R11.1  BASE MATCH voluntary bet amounts: determined by bet configuration (R8.5). Standard: 1 or 2 liang. Small: 1 liang only. Applies to BOTH monday and optional match types (but monday is always standard).
R11.2  SPORADIC POOL bet amounts: MUST satisfy amount_liang % 3 = 0 AND amount_liang >= 3 AND amount_liang <= 150. Valid values: 3, 6, 9, ... 150 liang (1支 to 50支). Per-person minimum: 1支 (3兩). Per-person maximum: 50支 (150兩).
R11.3  DEPRECATED: The min_bet_liang and bet_increment_liang fields on matches table are no longer needed for base match validation (amounts are fixed at 1 or 2). Sporadic pool validation uses R11.2 directly.
R11.4  Mandatory self-bet (5 liang) is exempt from R11.1 validation. Its amount is fixed.
R11.5  Auto-placed Monday bet (1 liang) is exempt from R11.1 validation. Its amount is fixed.