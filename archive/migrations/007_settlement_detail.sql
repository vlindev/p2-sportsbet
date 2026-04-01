-- P7: Add detail_jsonb column to match_settlements
-- Stores the full MemberMatchDetail engine output for report display.
-- Values are in NTD (engine units), not liang. The four canonical columns
-- (gross_liang, rake_liang, provider_fee_liang, net_liang) handle aggregation
-- in liang. This column is for the display layer only.

ALTER TABLE match_settlements ADD COLUMN detail_jsonb JSONB;
