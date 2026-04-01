-- 007b: Add non-partial unique constraint for Supabase JS .upsert() compatibility
-- Partial unique indexes (match_settlements_unique_base, match_settlements_unique_pool)
-- cannot be referenced by Supabase JS onConflict parameter.
-- This constraint covers both base (sporadic_pool_id = NULL) and pool rows.
-- NULLS NOT DISTINCT ensures two base rows with NULL sporadic_pool_id correctly conflict.
-- Partial indexes remain for query performance.

ALTER TABLE match_settlements
  ADD CONSTRAINT match_settlements_upsert_key
  UNIQUE NULLS NOT DISTINCT (member_id, match_id, settlement_context, sporadic_pool_id);
