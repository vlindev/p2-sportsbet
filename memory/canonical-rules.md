CASINO GOLF SOCIETY — CANONICAL SYSTEM RULES
Version: Session 22 | 2026-03-03

This file is the sole authoritative source of all system rules.
All prior documentation is superseded where it conflicts with this file.
No rule exists outside this file. No behavior may be inferred from context.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R1. DEFINITIONS

All terms used in this document are defined here. No term carries implicit meaning beyond its definition.

R1.1   MATCH: A single scheduled golf game between Team A and Team B on a specific date.
R1.2   MATCH TYPE: Organizational category of a match. Values: monday, optional. No other values are valid.
R1.3   SPORADIC MODIFIER: A rule overlay applied to an existing match. Stored as is_sporadic BOOLEAN DEFAULT false. When true, all rules in R5 apply in addition to base rules. Where R5 conflicts with base rules, R5 takes precedence.
R1.4   PLAYER: A member assigned to Team A or Team B in a match. Every match has EXACTLY 4 players: 2 on Team A, 2 on Team B.
R1.5   EXTERNAL BETTOR: A bettor who is NOT a player in that match.
R1.6   ACTIVE MEMBER: A member with members.active = true.
R1.7   AUTHORIZED OPERATOR: A user with bookkeeper or admin role.
R1.8   MATCH SIDE: The designation of a team within a match. Values: A, B.
R1.9   MANDATORY SELF-BET: A system-generated bet of exactly 5 liang placed automatically for each player on their own team at match creation. Cannot be modified or deleted.
R1.10  AUTO-PLACED BET: A system-generated bet of exactly 1 liang placed after Monday deadline for an active member who did not voluntarily bet on that match.
R1.11  VOLUNTARY BET: A bet placed by a member of their own choice.
R1.12  CAPACITY: Maximum total external bet exposure allowed on one side of a match. Measured in zhi. Applies ONLY when capacity_zhi IS NOT NULL.
R1.13  LIFO: Last In First Out. The invalidation order for over-capacity pending requests. Most recently created request is invalidated first.
R1.14  FLOW 1: Money transfer from all losing bets to the winning team players. Allocated per player share ratio (R17).
R1.15  FLOW 2: Money transfer of all winning bets, paid 1:1 by the losing team players. Allocated per player share ratio (R17).
R1.16  RAKE: Fee deducted from each winner's net gain. Paid to the club.
R1.17  PROVIDER FEE: Fee deducted from rake. Paid to the system provider.
R1.18  SETTLEMENT: Monthly calculation of net money owed or due per member.
R1.19  REFERRER (介紹人): The member who introduced another member to the club. Stored as referrer_id (FK → members.id, nullable).
R1.20  LIANG (兩): Base monetary unit. 1 liang = 1,000 NTD exactly. All bet amounts are stored in whole liang.
R1.21  ZHI (支): Capacity unit. 1 zhi = 3 liang = 3,000 NTD exactly.
R1.22  NTD: New Taiwan Dollar. Atomic settlement unit. All settlement arithmetic uses integer NTD.
R1.23  BPS (BASIS POINTS): Unit for share percentages. 10,000 BPS = 100.00% exactly.
R1.24  FLOOR_DIV(a, b): Integer division using mathematical floor toward negative infinity. floor_div(7,2)=3. floor_div(-7,2)=-4. See R18.
R1.25  UNIT STEP: The minimum valid bet increment for a match. Set per match via bet_increment_liang. See R11.
R1.26  PENDING ORGANIZER CONFIRMATION: A rule flagged [OQ-n] is a working assumption pending organizer confirmation. It MUST NOT be treated as final until confirmed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R2. MATCH TYPES

R2.1   matches.match_type MUST be one of: monday, optional. No other values are valid.
R2.2   DEPRECATED (see R5.12). Original: matches.is_sporadic BOOLEAN DEFAULT false. Replaced by sporadic_pools table — a match has sporadic behavior when COUNT(sporadic_pools WHERE match_id = X) > 0.
R2.3   DEPRECATED (see R2.2). Sporadic pools are valid on any match_type (monday or optional).
R2.4   When a match has no sporadic pools, base match rules apply.
R2.5   When a match has sporadic pools, rules in R5 apply IN ADDITION to base rules. R5 overrides base rules on conflict.
R2.6   DEPRECATED (superseded by R8.5 for base matches, R5.6/R11.2 for sporadic pools, R11.3 for deprecation notice). Original: matches.min_bet_liang and matches.bet_increment_liang MUST be set at match creation. These fields are no longer needed — base match amounts are determined by bet configuration (R8.5) and sporadic pool amounts by R5.6.
R2.7   DEPRECATED (see R2.6).
R2.8   DEPRECATED (see R2.6).
R2.9   Multiple matches on the same day MAY each independently have sporadic pools.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R3. SCORING

R3.1   All matches use 2v2 best ball format over 18 holes.
R3.2   Per-hole points: Win = 1, Birdie = 2, Eagle = 3, Hole-in-One = 10.
R3.3   H1 is the hardest hole. H18 is the easiest hole. Hole difficulty order is used for handicap distribution.
R3.4   The bookkeeper enters the final match result ONLY. The system MUST NOT calculate per-hole points.
R3.5   matches.result MUST be one of: team_a, team_b, pending. Initial value is pending.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R4. HANDICAP

R4.1   matches.handicap_type MUST be one of: 讓點, 讓洞, 不讓分. No other values are valid.
R4.2   matches.handicap_value MUST be an integer >= 0.
R4.3   When handicap_type = 不讓分, handicap_value MUST be 0.
R4.4   matches.handicap_team identifies the stronger team giving the handicap. Values: A, B. MUST be set when handicap_type != 不讓分. MUST be null when handicap_type = 不讓分.
R4.5   讓點 rule: handicap_value free points are awarded to the team NOT in handicap_team. Applied to holes H1 through H{handicap_value} in hardest-first order.
R4.6   讓洞 mechanics: The system records handicap_type = 讓洞 and handicap_value (number of holes) only. Detailed on-course mechanics (which holes, how swings are allocated) are resolved by the 4 players themselves and are OUT OF SCOPE for the system. If real-time per-hole scoring is added in the future, revisit this rule. [OQ-1: RESOLVED]
R4.7   Handicap is agreed between all 4 players before match creation. The bookkeeper records the agreed values.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R5. SPORADIC MODIFIER RULES (加強版)

A sporadic pool (盤) is an independent betting overlay attached to a match. Each pool has its own handicap conditions, capacity, and result. Sporadic pools are modeled as a SEPARATE TABLE (sporadic_pools), NOT as fields on the matches table.

R5.1   A match MAY have 0, 1, 2, or more sporadic pools. There is no upper limit. Common: 1 pool. Occasional: 2 pools. Rare: 3+.
R5.2   Each sporadic pool record MUST contain: match_id, opened_by_team (A or B — which team opened this pool), handicap_type, handicap_value, handicap_team, capacity_zhi, result (team_a/team_b/pending).
R5.3   The same team MAY open multiple pools on the same match (with different handicap conditions).
R5.4   External bettors MUST NOT bet on the team that opened the pool (opened_by_team). They may ONLY bet on the opposing team. [OQ-2: RESOLVED — old assumption "only bet on weak team" was INCORRECT. Correct rule: cannot bet on the team that opened the pool.]
R5.5   Each pool has its own capacity_zhi. capacity_zhi MUST NOT be null on sporadic pools. capacity_zhi MUST be >= 20. This is a soft ceiling requiring manual confirmation. See R15. If actual bets collected are less than capacity_zhi, the pool still proceeds normally.
R5.6   Valid bet amount per pool: amount_liang % 3 = 0 AND amount_liang >= 3 AND amount_liang <= 150 (50支). Per-person limits: minimum 1支 (3兩), maximum 50支 (150兩). No other bet amounts are valid on sporadic pools.
R5.7   Each pool settles INDEPENDENTLY — its own result, its own payout calculation, its own rake. A pool's result may differ from the match-level result or from other pools on the same match.
R5.8   The bookkeeper MUST enter a result for EACH pool separately.
R5.9   The same external bettor MAY place bets on multiple pools within the same match.
R5.10  LIFO invalidation applies to over-capacity pending bet_requests per pool. See R15.
R5.11  Non-sporadic bets (mandatory self-bet, mandatory Monday, voluntary) use the MATCH-LEVEL handicap and result. They are NOT affected by sporadic pool results.
R5.12  matches.is_sporadic is DEPRECATED as a concept. Use COUNT(sporadic_pools WHERE match_id = X) > 0 to determine if a match has sporadic pools.
R5.13  When match_type = monday AND sporadic pools exist: Monday mandatory betting (R9) applies to the BASE match only. Sporadic pools have NO mandatory betting — participation is entirely voluntary. [OQ-4: RESOLVED]
R5.14  Match format is not always 2v2 — 1v1, 1v2, 1v3 are also possible. PENDING FUTURE DISCUSSION (not OQ — will be addressed separately).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R12. BET PIPELINE ROUTING

R12.1  Mandatory self-bets (bet_type = mandatory_self) MUST be written DIRECTLY to bets. They MUST NOT enter bet_requests.
R12.2  All other bets MUST enter bet_requests before transitioning to bets.
R12.3  When a bet_request is for a match where capacity_zhi IS NULL: the system MUST immediately auto-accept the request within the same transaction. A bets record is created and bet_requests.status is set to accepted.
R12.4  When a bet_request is for a match where capacity_zhi IS NOT NULL: the system evaluates capacity per R15 before accepting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R13. BET REQUESTS — SCHEMA AND LIFECYCLE

R13.1  bet_requests table fields:
       id                   PRIMARY KEY
       match_id             FK → matches.id, NOT NULL
       member_id            FK → members.id, NOT NULL
       team_bet_on          ENUM(A, B), NOT NULL
       requested_amount     INTEGER NOT NULL, > 0, immutable after creation
       accepted_amount      INTEGER NOT NULL DEFAULT 0, incremented on acceptance
       status               ENUM(pending, partially_accepted, accepted, rejected, expired), NOT NULL
       status_reason        ENUM(capacity_overflow_lifo, manual_reject, deadline_passed, match_cancelled), NULLABLE
       created_at           TIMESTAMP NOT NULL
       created_by_role      ENUM(member, bookkeeper, system), NOT NULL
       created_via          ENUM(manual, rule_engine, scheduled_job, import, api), NOT NULL
       created_by_user_id   NULLABLE FK → auth users — MUST be NULL when created_by_role = system
       created_by_service   NULLABLE TEXT — MUST be NULL when created_via != api

R13.2  remaining_amount is DERIVED: requested_amount - accepted_amount. NOT stored.

R13.3  Invariants enforced at all times:
       0 <= accepted_amount <= requested_amount
       remaining_amount = requested_amount - accepted_amount

R13.4  Status definitions:
       pending             Initial state. accepted_amount = 0.
       partially_accepted  0 < accepted_amount < requested_amount.
       accepted            accepted_amount = requested_amount. TERMINAL.
       rejected            Explicitly not accepted. TERMINAL. Requires status_reason.
       expired             Not resolved before deadline or match start. TERMINAL. Requires status_reason.

R13.5  Status transition rules:
       pending             → partially_accepted (partial acceptance)
       pending             → accepted (full acceptance)
       pending             → rejected (manual reject or LIFO invalidation)
       pending             → expired (deadline passed or match cancelled)
       partially_accepted  → partially_accepted (additional partial acceptance)
       partially_accepted  → accepted (remaining amount accepted)
       partially_accepted  → rejected (remaining rejected by operator or LIFO)
       partially_accepted  → expired (match cancelled)
       All terminal states (accepted, rejected, expired) are irreversible.

R13.6  status_reason values:
       capacity_overflow_lifo  Used with rejected. LIFO invalidation due to capacity.
       manual_reject           Used with rejected. Explicit rejection by authorized operator.
       deadline_passed         Used with expired. No decision before deadline or match start.
       match_cancelled         Used with expired. Match was cancelled.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R14. BET LIFECYCLE

R14.1  bets table includes the following key fields:
       id                   PRIMARY KEY
       match_id             FK → matches.id, NOT NULL
       member_id            FK → members.id, NOT NULL
       team_bet_on          ENUM(A, B), NOT NULL
       amount_liang         INTEGER NOT NULL, > 0
       bet_type             ENUM(mandatory_self, mandatory_monday, voluntary), NOT NULL
       result               ENUM(win, loss, pending), NOT NULL DEFAULT pending
       status               ENUM(active, voided), NOT NULL DEFAULT active
       void_reason          ENUM(player_changed, match_cancelled), NULLABLE
       created_at           TIMESTAMP NOT NULL
       created_by_role      ENUM(member, bookkeeper, system), NOT NULL
       created_via          ENUM(manual, rule_engine, scheduled_job, import, api), NOT NULL
       created_by_user_id   NULLABLE FK → auth users
       created_by_service   NULLABLE TEXT

R14.2  active: Bet is valid and settlement-eligible. Initial state.
R14.3  voided: Bet is invalid. MUST be excluded from all settlement calculations. TERMINAL. Irreversible.
R14.4  void_reason MUST be set whenever status = voided.
R14.5  bets.result is set to win or loss at the moment match result is entered. It is written to every associated active bet row atomically. See R23.5.
R14.6  Settlement reads bets.result DIRECTLY. Settlement MUST NOT re-derive result from matches.result.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R15. CAPACITY MANAGEMENT

R15.1  Capacity applies ONLY to matches where capacity_zhi IS NOT NULL.
R15.2  capacity_zhi is the maximum accepted external bet exposure per team side, in zhi (3 liang).
R15.3  Capacity is a soft ceiling. When a bet_request arrives and total exposure would exceed capacity_zhi, the system MUST NOT automatically reject the request. The request MUST be stored in bet_requests with status = pending and made visible to the authorized operator.
R15.4  Mandatory self-bets MUST NOT count toward capacity_zhi.

CAPACITY CHECK PROCEDURE (executed within a locked transaction per R27):
  current_exposure_liang = SUM(accepted_amount) from bet_requests WHERE match_id = [match_id] AND team_bet_on = [side] AND status IN (partially_accepted, accepted) AND bet_type != mandatory_self
  capacity_liang = capacity_zhi × 3
  available_liang = capacity_liang - current_exposure_liang
  If requested_amount <= available_liang: auto-accept in full within same transaction.
  Else: set status = pending for manual operator decision.

R15.5  capacity_zhi is mutable during the lifecycle of a match. When increased, previously pending requests MUST be processed in chronological order by created_at (earliest first).

R15.6  PARTIAL ACCEPTANCE by an authorized operator:
       accepted_amount MUST satisfy: accepted_amount % bet_increment_liang = 0 AND accepted_amount >= min_bet_liang
       remaining_amount MUST satisfy: remaining_amount % bet_increment_liang = 0 AND remaining_amount >= min_bet_liang
       accepted_amount + remaining_amount MUST = requested_amount exactly.
       If requested_amount < min_bet_liang: only accept-all or reject-all are valid. No partial split is permitted.
       UI MUST restrict input to valid unit increments. Backend MUST validate and reject invalid splits.

R15.7  LIFO INVALIDATION: When an authorized operator rejects overflow requests, requests MUST be rejected in reverse chronological order by created_at (most recently created first). Each rejected request receives status = rejected, status_reason = capacity_overflow_lifo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R16. PAYOUT MODEL

R16.1  The payout model is 1:1 for ALL match types and ALL sporadic modifier states.
R16.2  Players act as the house. They absorb all external bet flow.
R16.3  For each completed match, two independent money flows apply:

FLOW 1 — LOSING BETS TO WINNING PLAYERS:
  total_losing_liang = SUM(amount_liang) of all bets WHERE result = loss AND status = active
  total_losing_ntd = total_losing_liang × 1,000
  Each winning player receives a share of total_losing_ntd per R17 and R18.

FLOW 2 — WINNING BETS PAID BY LOSING PLAYERS:
  total_winning_liang = SUM(amount_liang) of all bets WHERE result = win AND status = active
  total_winning_ntd = total_winning_liang × 1,000
  Each losing player pays a share of total_winning_ntd per R17 and R18.

R16.4  External bettors participate in neither Flow 1 nor Flow 2. Their settlement is determined by R21 Pass 1 only.
R16.5  Mandatory self-bets are included in total_losing_liang and total_winning_liang calculations.
R16.6  Voided bets (status = voided) MUST NOT be included in any flow calculation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R17. PLAYER SHARE ALLOCATION

R17.1  Player share ratios are stored in the match_team_player_shares table.
R17.2  match_team_player_shares schema:
       id            PRIMARY KEY
       match_id      FK → matches.id, NOT NULL
       match_side    ENUM(A, B), NOT NULL
       player_id     FK → members.id, NOT NULL
       share_bps     INTEGER NOT NULL
       context       ENUM(base, sporadic_pool) NOT NULL
       sporadic_pool_id  FK → sporadic_pools.id, NULLABLE (NOT NULL when context = sporadic_pool, NULL when context = base)

R17.3  Constraints:
       UNIQUE: (match_id, match_side, player_id, context, sporadic_pool_id)
       share_bps >= 0 AND share_bps <= 10,000
       Per (match_id, match_side, context, sporadic_pool_id): SUM(share_bps) = 10,000 EXACTLY

R17.4  DEFAULT EQUAL SPLIT ALGORITHM (applied when no custom ratio is set):
       Given n players on a team side:
       base = floor(10,000 / n)
       remainder = 10,000 - (base × n)
       Assign share_bps = base to all players on that side.
       Assign +1 BPS to the first remainder players in ascending player_id order.
       Invariant: SUM(share_bps) = 10,000 exactly.

R17.5  Manually entered share ratios MUST be integer percentages (UI shows %). Stored as BPS internally. MUST sum to 10,000 exactly. UI enforces this. DB CHECK constraint enforces this.
R17.6  Settlement MUST reference match_team_player_shares.share_bps. Assuming equal splits is NOT valid.
R17.7  Share ratios apply ONLY to Flow 1 and Flow 2. Mandatory self-bets are individual stakes not subject to share ratios.
R17.8  Share ratios are set per match independently. The same players may have different ratios in different matches.
R17.9  Share ratios MAY be modified until match status = active. Once active, share ratios are LOCKED.
R17.10 Share ratios MAY be modified after betting close (封盤) and before match starts.

R17.11 MINIMUM EXPOSURE RULE — BASE MATCH ONLY (not sporadic pools):
       Each player's allocated share MUST result in >= 20 liang (20,000 NTD) of exposure.
       Validation occurs after betting close (封盤), when total bet amount is known.
       player_exposure_liang = floor(total_exposure_liang × share_bps / 10,000)
       If any player's exposure < 20 liang:
         a. Auto-adjust to the nearest integer % where both players >= 20 liang.
         b. Allocated amounts MUST be integer liang (no decimals).
         c. System MUST notify the bookkeeper that the ratio was auto-adjusted.
       If total_exposure_liang < 40 liang: impossible to satisfy 20 liang minimum for both players. Force 50/50.

R17.12 SPORADIC POOL SHARES: No minimum exposure rule. Any integer % split is valid, including 100/0 and 0/100. Players decide freely.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R18. ARITHMETIC STANDARD

R18.1  All settlement and payout arithmetic MUST use 64-bit integers (BIGINT) for all intermediate calculations. 32-bit arithmetic is INVALID.
R18.2  All monetary values in settlement are expressed in integer NTD.
R18.3  floor_div(a, b): integer division using mathematical floor toward negative infinity.
       floor_div(7, 2) = 3
       floor_div(-7, 2) = -4 (NOT -3)
       This rule applies for both positive and negative values of a.
R18.4  PROPORTIONAL ALLOCATION for any flow_total_ntd split across n players by share_bps:
       Step 1: base_i = floor_div(flow_total_ntd × share_bps_i, 10,000)  [64-bit intermediate]
       Step 2: remainder = flow_total_ntd - SUM(all base_i)
       Step 3: Distribute +1 NTD to players in ascending player_id order until remainder = 0.
       Invariant: SUM(all allocations) = flow_total_ntd EXACTLY.
R18.5  The intermediate product (flow_total_ntd × share_bps_i) MUST be computed in 64-bit before division.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R19. RAKE CALCULATION

R19.1  Rake is applied to each winner individually. Losers are NEVER raked.
R19.2  A winner is any member with net_gain_liang > 0 for a completed match after all flows are summed.
R19.3  Rake is ALWAYS >= 0. Rake NEVER negative.
R19.4  RAKE FORMULA — applied per winner, per match, in sequence:
       Step 1: net_gain_liang = total net gain from all flows for that member and match (liang)
       Step 2: raw_rake_ntd = net_gain_liang × 50   [equivalent to × 1,000 × 0.05; result in NTD]
       Step 3: rounded_rake_ntd = ROUND(raw_rake_ntd / 100) × 100  [nearest 100 NTD; 0.5 rounds up]
       Step 4: rake_liang = rounded_rake_ntd / 1,000
       Step 5: winner_net_liang = net_gain_liang - rake_liang
R19.5  Rake is paid to the club.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R20. PROVIDER FEE

R20.1  Provider fee configuration is stored per club in club_billing_config. One row per club.
R20.2  club_billing_config schema:
       club_id              PRIMARY KEY (FK → clubs table)
       provider_rate_bps    INTEGER NOT NULL DEFAULT 100   [100 BPS = 1.00%]
       free_period_months   INTEGER NOT NULL DEFAULT 3
       contract_start_date  DATE NOT NULL
       billing_enabled      BOOLEAN NOT NULL DEFAULT true

R20.3  Free period end date:
       free_period_end_date = contract_start_date + (INTERVAL '1 month' × free_period_months)
       Month-end overflow resolves to the last valid day of the target month using PostgreSQL interval semantics.

R20.4  PROVIDER FEE FORMULA — applied per winner, per match:
       rake_ntd = rounded_rake_ntd from R19 Step 3 (integer NTD)
       provider_fee_ntd_raw = floor_div(rake_ntd × provider_rate_bps, 10,000)  [64-bit]
       If settlement_date < free_period_end_date:
         provider_fee_ntd = 0
         provider_fee_reason = free_period
       Else:
         provider_fee_ntd = provider_fee_ntd_raw
         provider_fee_reason = standard

R20.5  provider_fee_reason MUST be one of: free_period, standard. No other values are valid.
R20.6  Provider fee records MUST ALWAYS be created, including when provider_fee_ntd = 0.
R20.7  The rate applied is provider_rate_bps at the time of settlement calculation. Previously stored settlement records are NEVER recomputed when rate changes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R21. SETTLEMENT CALCULATION

R21.1  Settlement is auto-calculated from the database. The bookkeeper MUST NOT manually enter monetary totals.
R21.2  Settlement requires two passes per match per member. Both passes MUST complete before writing settlement records.

PASS 1 — EXTERNAL BETTOR ROWS (reads from bets table):
  For each bet WHERE status = active AND result = win:
    record +amount_liang as gross gain for that member for that match.
  For each bet WHERE status = active AND result = loss:
    record -amount_liang as loss for that member for that match.
  Bets WHERE status = voided MUST be excluded entirely.

PASS 2 — PLAYER FLOWS (match-level aggregation; CANNOT be derived from individual bet rows):
  For each completed match where member was a player on the winning team:
    flow1_income_ntd = SUM(amount_liang × 1,000) of all bets WHERE result = loss AND status = active on that match
    player_flow1_ntd = floor_div(flow1_income_ntd × member_share_bps, 10,000)  [R18, 64-bit]
    Add player_flow1_ntd to member's gross gain for this match.
  For each completed match where member was a player on the losing team:
    flow2_liability_ntd = SUM(amount_liang × 1,000) of all bets WHERE result = win AND status = active on that match
    player_flow2_ntd = floor_div(flow2_liability_ntd × member_share_bps, 10,000)  [R18, 64-bit]
    Add player_flow2_ntd to member's losses for this match.

RAKE APPLICATION (after both passes, per match per member):
  net_gain_liang = (sum of gains - sum of losses) for that match in liang
  If net_gain_liang > 0: apply R19 rake formula.
  If net_gain_liang <= 0: rake = 0.

PROVIDER FEE APPLICATION: Apply R20 per winner per match.

R21.3  MONTHLY TOTALS per member:
       gross_liang          = SUM of all gains across all matches (liang)
       rake_liang           = SUM of all rake amounts (liang)
       provider_fee_liang   = SUM of all provider fees (liang)
       net_liang            = gross_liang - rake_liang - provider_fee_liang - SUM of all losses
       net_liang > 0: member is owed money (應收)
       net_liang < 0: member owes money (應付)

R21.4  If a member appears in both Pass 1 (as bettor) and Pass 2 (as player) for the same match, both contributions are summed independently.
R21.5  MANDATORY AUDIT: Settlement calculation MUST run twice independently. Results MUST match exactly before the bookkeeper can confirm. Any discrepancy MUST block confirmation.
R21.6  INACTIVE MEMBER DEBT: If net_liang < 0 for an inactive member, the outstanding balance becomes the responsibility of that member's referrer_id.
R21.7  Unique constraint: one settlements record per (member_id, year, month).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R22. SETTLEMENT LIFECYCLE

R22.1  settlements.status MUST be one of: pending, settled. No other values are valid.
R22.2  pending: Calculation complete, not yet confirmed as paid. Initial state.
R22.3  settled: Authorized operator has confirmed payment for this member's balance. TERMINAL.
R22.4  Settlement is calculated monthly. Money changes hands on the 4th Monday of every month.
R22.5  Weekly reports are generated per member showing: all matches that week, all bets placed by that member, running monthly balance (cumulative, not week-only).
R22.6  The system tracks balances but NEVER holds or moves money. Settlement is peer-to-peer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R23. MATCH LIFECYCLE

R23.1  matches.status MUST be one of: scheduled, betting_closed, active, cancelled, completed. No other values are valid.
R23.2  scheduled: Initial state for all new matches. Player assignments and bet submission are open. Bets MAY be cancelled.
R23.3  betting_closed (封盤): Betting is closed for members — member UI shows no modification options.
       BOOKKEEPER retains full modification power after close: change amount, change team, cancel bets, add late bets. This is a hidden capability for error correction — members are told "封盤後不能改".
       Player share ratios still editable. Bookkeeper MAY reopen (revert to scheduled) in case of human error.
       BULK REDUCTION (全額降注): Players may request all 2兩 bets be reduced to 1兩 on their side, the other side, or both. Executable by bookkeeper at any time before match starts (including after 封盤). Not selective — all 2兩 on the affected side(s) become 1兩.
R23.4  active: Match is in progress. Player assignments are LOCKED. Bet submission is LOCKED. Share ratios LOCKED. Bets CANNOT be cancelled.
R23.5  completed: Match result has been entered. Bet results are set. Record is immutable. TERMINAL.
R23.6  cancelled: Match will not be played. All associated bets voided and requests expired. TERMINAL.

R23.7  Status transition rules:
       scheduled      → betting_closed  (manual bookkeeper action OR auto at deadline)
       scheduled      → cancelled       (authorized operator action)
       betting_closed → scheduled       (bookkeeper reopens — human error recovery)
       betting_closed → active          (match start time reached, system transition)
       betting_closed → cancelled       (authorized operator action)
       active         → completed       (bookkeeper enters result)
       active         → cancelled       (authorized operator action — see R24.4 [OQ-3])
       completed      → any state: INVALID. NOT permitted.
       cancelled      → any state: INVALID. NOT permitted.

R23.8  BETTING CLOSE TRIGGERS:
       Monday matches: auto-close at Sunday 7:00 PM. Bookkeeper MAY close earlier manually.
       Optional matches: no auto-close deadline. Bookkeeper closes manually at any time before match starts. Players may request close at any time.
       On close: system validates player share ratios per R17.11 (auto-adjust if needed, notify bookkeeper).

R23.9  BET CANCELLATION RULES:
       scheduled (betting open): bets MAY be cancelled by member or bookkeeper.
       betting_closed: members CANNOT cancel or modify. Bookkeeper CAN cancel/modify (hidden capability, for error correction only).
       active or later: bets MUST NOT be cancelled by anyone except system maintainer override (R29).

R23.10 RESULT ENTRY: When bookkeeper enters match result:
       a. Set matches.result to team_a or team_b.
       b. Set bets.result = win for all active bets on the winning side.
       c. Set bets.result = loss for all active bets on the losing side.
       All three operations MUST execute in a single atomic transaction.
       For sporadic pools: each pool's result is entered separately. Pool bets are settled against the pool's result, not the match-level result.

R23.11 RESULT CORRECTION (更正結果): When an authorized operator corrects a previously entered result:
       a. Update matches.result (or sporadic_pools.result) to the corrected value.
       b. Flip ALL associated bets.result values (win → loss, loss → win) for all active bets on that match/pool.
       Both operations MUST execute in a single atomic transaction.
       If settlement has been calculated for the month containing this match, settlement MUST be recalculated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R24. MATCH CANCELLATION

R24.1  When a match is cancelled, ALL of the following MUST occur in a single atomic transaction:
       a. Set matches.status = cancelled.
       b. Set bets.status = voided AND bets.void_reason = match_cancelled for ALL bets on that match where bets.status = active.
       c. Set bet_requests.status = expired AND bet_requests.status_reason = match_cancelled for ALL bet_requests on that match where bet_requests.status is pending or partially_accepted.
R24.2  Voided bets MUST be excluded from settlement.
R24.3  Expired requests NEVER reach settlement.
R24.4  MID-GAME CANCELLATION (match already active): [OQ-3: RESOLVED]
       TWO SCENARIOS:

       SCENARIO A — Non-weather cancellation (any reason except weather):
       All bets voided. Same as pre-start cancellation (R24.1 applies).

       SCENARIO B — Weather cancellation (all players agree they cannot continue):
       The 裁決 (ruling) process applies:
       a. Compare the leading team's point advantage to the number of remaining unplayed holes.
       b. If leading_score >= remaining_holes: leading team WINS. Match completes normally (result entered, bets settled).
       c. If leading_score < remaining_holes: all bets voided. Same as pre-start cancellation (R24.1 applies).
       d. If tied (0-0 or equal): remaining_holes > 0, so all bets voided.
       PURPOSE: Prevents players from intentionally abandoning a match to void all bets.

       SPORADIC POOL 裁決: ⚠️ NO ESTABLISHED RULE. When a weather-cancelled match has sporadic pools,
       the sporadic pool result may differ from the base match ruling (e.g. handicap holes not yet played).
       Currently handled manually by the bookkeeper (void the pool). A formal rule may be established
       in the future using this system. Until then, the bookkeeper MAY manually set a sporadic pool
       result to voided independently of the base match ruling.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R25. PLAYER CHANGES

R25.1  Player assignments MAY be changed ONLY when matches.status = scheduled.
R25.2  Once matches.status = active, player assignments are LOCKED. Change attempts MUST be rejected.
R25.3  When a player is replaced while status = scheduled:
       a. Set outgoing player's mandatory self-bet to bets.status = voided, void_reason = player_changed.
       b. Auto-generate a new mandatory self-bet for the incoming player per R7.
       Both operations MUST execute in a single atomic transaction.
R25.4  If the incoming player already has an active voluntary bet on the same match as an external bettor, the system MUST block the player assignment. The authorized operator MUST resolve the conflict (edit or void the existing voluntary bet) before the assignment can proceed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R26. BET ATTRIBUTION FIELDS

R26.1  created_by_role MUST be one of: member, bookkeeper, system.
R26.2  created_via MUST be one of: manual, rule_engine, scheduled_job, import, api.
R26.3  Valid (created_by_role, created_via) combinations — enforced by DB CHECK constraint:
       member      → manual, api
       bookkeeper  → manual, import, api
       system      → rule_engine, scheduled_job
       All other combinations are INVALID and MUST be rejected at DB level.
R26.4  created_by_user_id (NULLABLE FK → auth users):
       MUST be non-null when created_by_role is member or bookkeeper.
       MUST be NULL when created_by_role = system.
R26.5  created_by_service (NULLABLE TEXT):
       MUST be set when created_via = api.
       MUST be NULL when created_via != api.
R26.6  member + import is INVALID. MUST NOT be persisted under any circumstances.
R26.7  Canonical attribution for system-generated bets:
       mandatory_self      → created_by_role = system, created_via = rule_engine
       mandatory_monday    → created_by_role = system, created_via = scheduled_job
R26.8  Both bets and bet_requests tables MUST include all attribution fields defined in R26.1–R26.5.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R27. CONCURRENCY RULES

R27.1  All capacity evaluation and bet acceptance operations MUST execute within a single serialized database transaction.
R27.2  Before evaluating capacity or accepting any bet_request on a capacity-constrained match, the system MUST acquire a row-level lock on the match record:
       SELECT * FROM matches WHERE id = [match_id] FOR UPDATE
R27.3  Capacity MUST be recalculated AFTER acquiring the lock. Pre-lock capacity reads are NOT valid for acceptance decisions.
R27.4  The transaction MUST include atomically: capacity check, bets record insertion, bet_requests.accepted_amount increment, bet_requests.status update.
R27.5  Two simultaneous acceptance operations on the same match MUST NOT produce combined allocations that exceed capacity_zhi.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R28. PENDING ORGANIZER CONFIRMATIONS

The rules below are working assumptions. They MUST NOT be treated as final. Implementation based on these rules MUST be clearly flagged for review.

[OQ-1]  讓洞 MECHANICS: RESOLVED. System only records type + value. On-course mechanics are out of scope — players handle it themselves. Revisit if real-time per-hole scoring is added.

[OQ-2]  SPORADIC BETTOR RESTRICTION: RESOLVED. External bettors CANNOT bet on the team that opened the pool — they can ONLY bet on the opposing team. Old assumption "only bet on weak team" was incorrect. Either team (strong or weak) can open a pool. A match can have unlimited pools. Each pool has its own handicap, capacity, and independent result. See R5.

[OQ-3]  MID-GAME CANCELLATION: RESOLVED. Two scenarios: (A) non-weather → all voided, (B) weather + player consensus → 裁決: leading_score >= remaining_holes = win, otherwise voided. Sporadic pool 裁決 has NO established rule yet — bookkeeper handles manually. See R24.4.

[OQ-4]  MONDAY + SPORADIC INTERACTION: RESOLVED. Monday mandatory betting applies to base match ONLY. Sporadic pools are entirely voluntary — no forced participation. Base match: 1兩 or 2兩 voluntary, 1兩 auto-placed. Sporadic pools: 1支–50支, no auto-placement. See R5.13, R9.6.

[OQ-5]  LOSING PLAYER SPLIT: RESOLVED. Not always 50/50. Players decide their own share ratio before match starts. Bookkeeper records it. Default 50/50, adjustable to any integer %. Base match: minimum 20兩 per player exposure (auto-adjusted if violated, bookkeeper notified). Sporadic pools: no minimum, any split including 100/0. Locked once match is active. See R17.9–R17.12.

[OQ-5a] BETTING CLOSE (封盤): RESOLVED. New match status: betting_closed. Monday: auto-close Sunday 7pm, can close earlier manually. Optional: manual close only, no fixed deadline. After close: no new bets, no bet cancellation, but bookkeeper can add late bets manually and modify share ratios. Can reopen (revert to scheduled) for human error. See R23.3, R23.7–R23.9.

[OQ-5b] BET CANCELLATION: RESOLVED. Bets can be cancelled ONLY while status = scheduled (betting open). Once betting_closed or later: no cancellation under any circumstances. See R23.9.

[OQ-8]  MANDATORY SELF-BET CREATION: RESOLVED. System auto-creates at match creation. Confirmed — matches R7.1. No change needed.

[OQ-9]  POST-MONDAY VISIBILITY: NOT A CLUB RULE — system design decision for Veronica. Parked.

[OQ-10] SUNDAY 7PM YEAR-ROUND: RESOLVED. Yes, year-round, no exceptions. No seasonal or holiday adjustments.

[OQ-11] HIO POINTS: RESOLVED. 10 points. But system does not calculate per-hole scores, so no system impact. Background knowledge only.

[OQ-7]  DEADLINE EDGE CASE: RESOLVED. Member's button press time is what counts. System applies a 2-minute grace period: bets received by 7:02 PM are accepted. After 7:02 PM → rejected, auto-placement begins. See R10.1.

[OQ-6]  MEMBER BET EDITING: RESOLVED. Before betting close: members can modify amount, change team, or cancel their own bets freely. After betting close: no modifications allowed in any UI (member or bookkeeper). Hidden system maintainer (Veronica) override exists for extreme cases — not visible in any UI, requires audit log (who, when, what changed). All changes still flow through normal auto-settlement. See R23.9, R29.

[OQ-5c] BASE MATCH VOLUNTARY BET AMOUNTS: RESOLVED. Both monday and optional match types: voluntary bets MUST be exactly 1兩 or 2兩. No other amounts. See R8.4, R11.1.

[OQ-5d] SPORADIC POOL BET LIMITS: RESOLVED. Per person: min 1支 (3兩), max 50支 (150兩). Pool capacity_zhi must be >= 20. See R5.5, R5.6.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R29. SYSTEM MAINTAINER OVERRIDE

R29.1  A hidden override capability exists for the system maintainer (Veronica) ONLY.
R29.2  This override allows modification of any bet data after betting close, including: amount, team, cancellation, and re-creation.
R29.3  The override MUST NOT appear in any user interface — not in the member UI, not in the bookkeeper UI. It is accessed via backend-only mechanisms (direct DB, hidden admin API, or CLI).
R29.4  All override actions MUST be logged in an audit_log table:
       id             PRIMARY KEY
       performed_by   TEXT NOT NULL (identifier of who executed)
       performed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
       action         TEXT NOT NULL (description of what was done)
       table_name     TEXT NOT NULL
       record_id      UUID NOT NULL
       old_values     JSONB NOT NULL
       new_values     JSONB NOT NULL
R29.5  Audit log records are append-only. They MUST NOT be modified or deleted.
R29.6  Override changes still flow through normal settlement auto-calculation. No manual settlement adjustments.
R29.7  Purpose: emergency correction when a genuine mistake occurs and no UI path can fix it. NOT for routine operations.
R29.8  FUTURE: 3-4 admin accounts planned, each with different permission levels. A permission matrix will be designed when admin roles are built. Current Phase 1: single bookkeeper role with full access. Revisit permissions if frequent errors occur.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

END OF CANONICAL RULES FILE
