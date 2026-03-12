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