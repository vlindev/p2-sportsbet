-- 007c: Change liang columns from INTEGER to NUMERIC
-- ntdToLiang() produces decimal values (e.g. 9500 NTD ÷ 1000 = 9.5 liang).
-- INTEGER columns reject these. NUMERIC preserves exact decimal representation.
-- Applied to both match_settlements (per-match) and settlements (monthly aggregation).

-- match_settlements: 4 columns
ALTER TABLE match_settlements ALTER COLUMN gross_liang TYPE NUMERIC;
ALTER TABLE match_settlements ALTER COLUMN rake_liang TYPE NUMERIC;
ALTER TABLE match_settlements ALTER COLUMN provider_fee_liang TYPE NUMERIC;
ALTER TABLE match_settlements ALTER COLUMN net_liang TYPE NUMERIC;

-- settlements: 4 columns
ALTER TABLE settlements ALTER COLUMN gross_liang TYPE NUMERIC;
ALTER TABLE settlements ALTER COLUMN rake_liang TYPE NUMERIC;
ALTER TABLE settlements ALTER COLUMN provider_fee_liang TYPE NUMERIC;
ALTER TABLE settlements ALTER COLUMN net_liang TYPE NUMERIC;
