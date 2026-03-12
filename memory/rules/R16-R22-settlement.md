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