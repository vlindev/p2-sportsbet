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