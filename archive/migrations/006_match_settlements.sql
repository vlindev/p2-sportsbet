-- P6: Settlements Schema Migration
-- Creates match_settlements table + adds provider_fee_liang to settlements
-- No application code changes — that's P7

-- ============================================================
-- Step 1: Create match_settlements table
-- ============================================================
-- settlement_date is the MATCH DATE (denormalized from matches.date at write time).
-- Match dates never change after creation. Denormalized here so weekly/monthly
-- aggregation queries can group by date without joining through match_id → matches.

CREATE TABLE match_settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           UUID NOT NULL REFERENCES members(id),
  match_id            UUID NOT NULL REFERENCES matches(id),
  settlement_context  TEXT NOT NULL CHECK (settlement_context IN ('base', 'sporadic_pool')),
  sporadic_pool_id    UUID REFERENCES sporadic_pools(id),
  settlement_date     DATE NOT NULL,  -- match date, denormalized from matches.date
  gross_liang         INTEGER NOT NULL,
  rake_liang          INTEGER NOT NULL,
  provider_fee_liang  INTEGER NOT NULL DEFAULT 0,
  net_liang           INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Pool context requires sporadic_pool_id; base context requires NULL
  CONSTRAINT pool_context_requires_pool_id
    CHECK (
      settlement_context = 'base' AND sporadic_pool_id IS NULL
      OR
      settlement_context = 'sporadic_pool' AND sporadic_pool_id IS NOT NULL
    )
);

-- ============================================================
-- Step 2: Partial unique indexes (same pattern as bets table)
-- ============================================================
-- One base row per member per match
CREATE UNIQUE INDEX match_settlements_unique_base
  ON match_settlements (member_id, match_id)
  WHERE settlement_context = 'base';

-- One pool row per member per match per pool
CREATE UNIQUE INDEX match_settlements_unique_pool
  ON match_settlements (member_id, match_id, sporadic_pool_id)
  WHERE settlement_context = 'sporadic_pool';

-- ============================================================
-- Step 3: Indexes for common query patterns
-- ============================================================
-- Lookups by match (settlement report, correction)
CREATE INDEX idx_match_settlements_match_id
  ON match_settlements (match_id);

-- Lookups by member + date (weekly/monthly aggregation)
CREATE INDEX idx_match_settlements_member_date
  ON match_settlements (member_id, settlement_date);

-- Lookups by date (daily/weekly derived views)
CREATE INDEX idx_match_settlements_date
  ON match_settlements (settlement_date);

-- ============================================================
-- Step 4: Add provider_fee_liang to existing settlements table
-- ============================================================
-- DEFAULT 0 is safe — settlements table is currently empty
ALTER TABLE settlements
  ADD COLUMN provider_fee_liang INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Step 5: updated_at trigger on match_settlements
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_settlements_updated_at
  BEFORE UPDATE ON match_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Step 6: RLS — permissive allow_all (placeholder until Step 9 auth)
-- ============================================================
ALTER TABLE match_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON match_settlements
  FOR ALL USING (true) WITH CHECK (true);
