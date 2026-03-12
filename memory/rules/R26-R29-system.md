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