-- =============================================================================
-- DROP UNUSED INDEXES MIGRATION
-- =============================================================================
-- This migration removes truly unused indexes that are safe to drop
-- IMPORTANT: Never drop indexes that back unique constraints, primary keys, or foreign keys
-- =============================================================================

-- =============================================================================
-- SAFE TO DROP - Regular indexes that are redundant or unused
-- =============================================================================

-- 1. Redundant index on profiles.email (if exists - may already be covered by unique constraint)
DROP INDEX IF EXISTS public.idx_profiles_email;

-- 2. Unused index on profiles.tier (if exists)
DROP INDEX IF EXISTS public.idx_profiles_tier;

-- 3. Unused session expiry index (if exists)
DROP INDEX IF EXISTS public."IDX_session_expire";

-- =============================================================================
-- NEVER DROP THESE - Unique constraint-backed indexes (critical for data integrity)
-- =============================================================================
-- These indexes enforce unique constraints and must NEVER be dropped:
-- - users_email_unique: Prevents duplicate user accounts
-- - active_sessions_session_token_unique: Prevents session hijacking
-- - plants_external_id_unique: Ensures unique plant identifiers
-- - plants_perenual_id_unique: Ensures unique Perenual IDs
-- - plants_scientific_name_unique: Ensures unique scientific names
-- - climate_data_location_unique: Ensures unique climate locations
-- - scraping_progress_url_unique: Prevents duplicate scraping jobs
-- - security_settings_key_unique: Ensures unique security settings

-- =============================================================================
-- CREATE MISSING PERFORMANCE INDEXES
-- =============================================================================

-- Add any missing performance indexes that should exist
CREATE INDEX IF NOT EXISTS idx_gardens_climate_zone ON public.gardens(climate_zone);
CREATE INDEX IF NOT EXISTS idx_gardens_style ON public.gardens(style);
CREATE INDEX IF NOT EXISTS idx_plants_lifecycle ON public.plants(lifecycle);
CREATE INDEX IF NOT EXISTS idx_plants_watering ON public.plants(watering);
CREATE INDEX IF NOT EXISTS idx_plants_sunlight ON public.plants((sunlight->>'min'), (sunlight->>'max'));

-- =============================================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- =============================================================================

-- Update statistics for query planner
ANALYZE public.users;
ANALYZE public.profiles;
ANALYZE public.gardens;
ANALYZE public.plants;
ANALYZE public.garden_plants;
ANALYZE public.plant_collections;
ANALYZE public.user_plant_collections;