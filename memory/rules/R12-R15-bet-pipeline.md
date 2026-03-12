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