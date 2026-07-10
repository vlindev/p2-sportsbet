-- Bets workbench safety floor.
-- Safe pre-auth hardening only: do not change RLS policies to authenticated yet.

-- Active base bets: one active bet per member/match/bet_type for base matches.
CREATE UNIQUE INDEX IF NOT EXISTS bets_unique_base
  ON public.bets (member_id, match_id, bet_type)
  WHERE sporadic_pool_id IS NULL AND status = 'active';

-- Active pool bets: one active bet per member/pool.
CREATE UNIQUE INDEX IF NOT EXISTS bets_unique_pool
  ON public.bets (member_id, sporadic_pool_id)
  WHERE sporadic_pool_id IS NOT NULL AND status = 'active';

-- Monthly settlement uniqueness per member/month.
CREATE UNIQUE INDEX IF NOT EXISTS settlements_member_year_month_unique
  ON public.settlements (member_id, year, month);

-- Common read paths used by bets workbench and settlement reports.
CREATE INDEX IF NOT EXISTS idx_bets_match_status
  ON public.bets (match_id, status);

CREATE INDEX IF NOT EXISTS idx_bets_member_match
  ON public.bets (member_id, match_id);

CREATE INDEX IF NOT EXISTS idx_match_settlements_match_id
  ON public.match_settlements (match_id);

-- Tighten nullable columns only when existing data is already clean.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bets WHERE match_id IS NULL OR member_id IS NULL
  ) THEN
    ALTER TABLE public.bets ALTER COLUMN match_id SET NOT NULL;
    ALTER TABLE public.bets ALTER COLUMN member_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped bets match_id/member_id NOT NULL: existing null rows require cleanup first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.matches
    WHERE team_a_player1_id IS NULL
       OR team_a_player2_id IS NULL
       OR team_b_player1_id IS NULL
       OR team_b_player2_id IS NULL
  ) THEN
    ALTER TABLE public.matches ALTER COLUMN team_a_player1_id SET NOT NULL;
    ALTER TABLE public.matches ALTER COLUMN team_a_player2_id SET NOT NULL;
    ALTER TABLE public.matches ALTER COLUMN team_b_player1_id SET NOT NULL;
    ALTER TABLE public.matches ALTER COLUMN team_b_player2_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped match player NOT NULL constraints: existing null rows require cleanup first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.settlements WHERE member_id IS NULL
  ) THEN
    ALTER TABLE public.settlements ALTER COLUMN member_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped settlements.member_id NOT NULL: existing null rows require cleanup first.';
  END IF;
END $$;
