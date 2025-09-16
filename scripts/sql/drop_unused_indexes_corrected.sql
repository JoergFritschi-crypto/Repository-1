-- Drop Unused Indexes Script (CORRECTED VERSION)
-- This script only removes truly unused indexes that are safe to drop
-- IMPORTANT: Never drop indexes that back unique constraints, primary keys, or foreign keys

-- ============================================================================
-- SAFE TO DROP - Regular indexes that are redundant or unused
-- ============================================================================

-- 1. Redundant index on profiles.email (already covered by profiles_email_key)
DROP INDEX IF EXISTS public.idx_profiles_email;

-- 2. Unused index on profiles.tier 
DROP INDEX IF EXISTS public.idx_profiles_tier;

-- 3. Unused session expiry index
DROP INDEX IF EXISTS public."IDX_session_expire";

-- ============================================================================
-- NEVER DROP THESE - Unique constraint-backed indexes (critical for data integrity)
-- ============================================================================
-- These indexes enforce unique constraints and must NEVER be dropped:
-- - users_email_unique: Prevents duplicate user accounts
-- - active_sessions_session_token_unique: Prevents session hijacking
-- - plants_external_id_unique: Ensures unique plant identifiers
-- - plants_perenual_id_unique: Ensures unique Perenual IDs
-- - plants_scientific_name_unique: Ensures unique scientific names
-- - climate_data_location_unique: Ensures unique climate locations
-- - scraping_progress_url_unique: Prevents duplicate scraping jobs
-- - security_settings_key_unique: Ensures unique security settings

-- ============================================================================
-- How to identify truly unused indexes (excluding constraint-backed ones):
-- ============================================================================
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT IN (
    -- Exclude primary keys
    SELECT conname FROM pg_constraint WHERE contype = 'p'
    UNION
    -- Exclude unique constraints
    SELECT conname FROM pg_constraint WHERE contype = 'u'
    UNION  
    -- Exclude foreign keys
    SELECT conname FROM pg_constraint WHERE contype = 'f'
)
ORDER BY schemaname, tablename;
*/

-- ============================================================================
-- Status: EXECUTED - Only safe indexes removed
-- ============================================================================
-- Result: Removed 3 truly unused regular indexes
-- Preserved: All unique constraint indexes for data integrity