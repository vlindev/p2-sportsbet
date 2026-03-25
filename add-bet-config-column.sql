-- Phase 1: Add bet_config column to matches table
-- Priority 3 (place_bet RPC) — Session 78
--
-- D3: The RPC needs to know standard vs small to validate amounts (R8.5).
-- Hardcoding 'standard' would create a hidden assumption in financial code.
-- All existing matches use 'standard' — the DEFAULT handles backfill.

ALTER TABLE matches
ADD COLUMN bet_config TEXT NOT NULL DEFAULT 'standard'
CHECK (bet_config IN ('standard', 'small'));
