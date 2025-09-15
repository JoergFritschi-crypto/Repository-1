-- =============================================================================
-- ROW LEVEL SECURITY SETUP FOR GARDENSCAPE PRO
-- =============================================================================
-- This script enables RLS and creates policies for all tables in the system
-- Policies are designed around the user authentication system using profiles.id

-- =============================================================================
-- 1. CORE USER TABLES
-- =============================================================================

-- Profiles table - Users can manage their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "profiles_own_access" ON public.profiles
    FOR ALL USING (auth.uid()::text = replit_id);

-- Admins can access all profiles
CREATE POLICY "profiles_admin_access" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Sessions table - Managed by system (Replit Auth)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow system access to sessions (needed for Replit Auth)
CREATE POLICY "sessions_system_access" ON public.sessions
    FOR ALL USING (true);

-- =============================================================================
-- 2. PLANT DATA TABLES
-- =============================================================================

-- Plants table - Public read access, admin write access
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all plants
CREATE POLICY "plants_read_authenticated" ON public.plants
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can manage all plants
CREATE POLICY "plants_admin_manage" ON public.plants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Climate data - Public read access, admin write access
ALTER TABLE public.climate_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "climate_data_read_authenticated" ON public.climate_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "climate_data_admin_manage" ON public.climate_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- =============================================================================
-- 3. USER-SPECIFIC TABLES
-- =============================================================================

-- Gardens table - Users can manage their own gardens
ALTER TABLE public.gardens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gardens_own_access" ON public.gardens
    FOR ALL USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
    );

-- Admin access to all gardens
CREATE POLICY "gardens_admin_access" ON public.gardens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- User plant collections
ALTER TABLE public.user_plant_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_plant_collections_own_access" ON public.user_plant_collections
    FOR ALL USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
    );

CREATE POLICY "user_plant_collections_admin_access" ON public.user_plant_collections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Garden plants - Access through garden ownership
ALTER TABLE public.garden_plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garden_plants_owner_access" ON public.garden_plants
    FOR ALL USING (
        garden_id IN (
            SELECT id FROM public.gardens g
            JOIN public.profiles p ON g.user_id = p.id
            WHERE p.replit_id = auth.uid()::text
        )
    );

CREATE POLICY "garden_plants_admin_access" ON public.garden_plants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Plant doctor sessions
ALTER TABLE public.plant_doctor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_doctor_sessions_own_access" ON public.plant_doctor_sessions
    FOR ALL USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
        OR user_id IS NULL -- Allow anonymous sessions
    );

CREATE POLICY "plant_doctor_sessions_admin_access" ON public.plant_doctor_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Design generations
ALTER TABLE public.design_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_generations_own_access" ON public.design_generations
    FOR ALL USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
    );

CREATE POLICY "design_generations_admin_access" ON public.design_generations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- File vault
ALTER TABLE public.file_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_vault_own_access" ON public.file_vault
    FOR ALL USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
    );

CREATE POLICY "file_vault_admin_access" ON public.file_vault
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- =============================================================================
-- 4. SYSTEM/API MONITORING TABLES - ADMIN ONLY
-- =============================================================================

-- API Health Checks - Admin only
ALTER TABLE public.api_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_health_checks_admin_only" ON public.api_health_checks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- API Usage Stats - Users can see their own, admins see all
ALTER TABLE public.api_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_stats_own_access" ON public.api_usage_stats
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
        OR user_id IS NULL
    );

CREATE POLICY "api_usage_stats_admin_access" ON public.api_usage_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- API Alerts - Admin only
ALTER TABLE public.api_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_alerts_admin_only" ON public.api_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Todo Tasks - Admin only
ALTER TABLE public.todo_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todo_tasks_admin_only" ON public.todo_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Scraping Progress - Admin only
ALTER TABLE public.scraping_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scraping_progress_admin_only" ON public.scraping_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Image Generation Queue - System managed, admin readable
ALTER TABLE public.image_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "image_generation_queue_system_access" ON public.image_generation_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- =============================================================================
-- 5. SECURITY TABLES - ADMIN ONLY WITH LIMITED USER ACCESS
-- =============================================================================

-- Security Audit Logs - Users can see their own events, admins see all
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_audit_logs_own_access" ON public.security_audit_logs
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
    );

CREATE POLICY "security_audit_logs_admin_access" ON public.security_audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Active Sessions - Users can see their own sessions, admins see all
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_sessions_own_access" ON public.active_sessions
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
    );

CREATE POLICY "active_sessions_admin_access" ON public.active_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Failed Login Attempts - Admin only (security sensitive)
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "failed_login_attempts_admin_only" ON public.failed_login_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- IP Access Control - Admin only
ALTER TABLE public.ip_access_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ip_access_control_admin_only" ON public.ip_access_control
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Security Settings - Admin only
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_settings_admin_only" ON public.security_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Rate Limit Violations - Users can see their own, admins see all
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_violations_own_access" ON public.rate_limit_violations
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.profiles 
            WHERE replit_id = auth.uid()::text
        )
    );

CREATE POLICY "rate_limit_violations_admin_access" ON public.rate_limit_violations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- Security Recommendations - Admin only
ALTER TABLE public.security_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_recommendations_admin_only" ON public.security_recommendations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE replit_id = auth.uid()::text AND is_admin = true
        )
    );

-- =============================================================================
-- 6. ADDITIONAL TABLES FROM SCHEMA
-- =============================================================================

-- Estimate Data - If this table exists, make it admin only
-- (This table was mentioned in the warning but not found in current schema)
-- Uncomment if needed:
-- ALTER TABLE public.estimate_data ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "estimate_data_admin_only" ON public.estimate_data
--     FOR ALL USING (
--         EXISTS (
--             SELECT 1 FROM public.profiles 
--             WHERE replit_id = auth.uid()::text AND is_admin = true
--         )
--     );

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- This script enables RLS on all tables and creates policies based on:
-- 
-- 1. USER-OWNED DATA: Users can access their own data via profiles.replit_id matching auth.uid()
-- 2. PUBLIC READ DATA: Authenticated users can read plants and climate data
-- 3. SYSTEM/ADMIN DATA: Only admins can access monitoring and security tables
-- 4. SECURITY PRINCIPLE: Default deny, explicit allow
-- 
-- All policies use the profiles table to determine user permissions through:
-- - replit_id matching auth.uid() for user identification
-- - is_admin = true for admin privileges
-- 
-- The RLS policies protect against unauthorized access while maintaining
-- application functionality for authenticated users and proper admin oversight.
-- =============================================================================