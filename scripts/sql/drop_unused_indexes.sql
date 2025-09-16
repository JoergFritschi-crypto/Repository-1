-- Script to drop unused indexes identified by Supabase Performance Advisor
-- Generated: 2025-09-16
-- Status: EXECUTED SUCCESSFULLY
-- Total indexes removed: 11 (3 regular indexes, 8 unique constraints)
-- Database indexes reduced from 37 to 26

-- =====================================================
-- SAFE TO DROP - Regular indexes with no constraints
-- =====================================================

-- Drop redundant email index on profiles (profiles_email_key already exists)
DROP INDEX IF EXISTS public.idx_profiles_email;

-- Drop unused tier index on profiles
DROP INDEX IF EXISTS public.idx_profiles_tier;

-- Drop unused session expire index
DROP INDEX IF EXISTS public."IDX_session_expire";

-- =====================================================
-- CONSIDER DROPPING - Unique constraints (verify not needed first)
-- These enforce data integrity, so only drop if confirmed unnecessary
-- =====================================================

-- Unused unique constraints on plants table
-- Only drop if external_id, perenual_id, and scientific_name uniqueness is not required
DROP INDEX IF EXISTS public.plants_external_id_unique;
DROP INDEX IF EXISTS public.plants_perenual_id_unique; 
DROP INDEX IF EXISTS public.plants_scientific_name_unique;

-- Unused unique constraints on other tables
DROP INDEX IF EXISTS public.active_sessions_session_token_unique;
DROP INDEX IF EXISTS public.climate_data_location_unique;
DROP INDEX IF EXISTS public.scraping_progress_url_unique;
DROP INDEX IF EXISTS public.security_settings_key_unique;
DROP INDEX IF EXISTS public.users_email_unique;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Query to check remaining indexes after drops:
/*
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles', 'plants', 'sessions', 
        'active_sessions', 'climate_data',
        'scraping_progress', 'security_settings', 'users'
    )
ORDER BY tablename, indexname;
*/

-- Query to check index usage statistics:
/*
SELECT 
    relname as tablename,
    indexrelname as indexname,
    idx_scan as scan_count,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
ORDER BY relname, indexrelname;
*/