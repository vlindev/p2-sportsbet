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