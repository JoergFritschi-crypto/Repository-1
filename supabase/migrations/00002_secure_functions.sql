-- =============================================================================
-- SECURE FUNCTIONS MIGRATION
-- =============================================================================
-- Fixes Function Search Path vulnerabilities identified by Supabase Security Advisor
-- This migration creates/updates functions with proper search_path settings to prevent SQL injection
-- =============================================================================

-- Drop existing functions if they exist (to ensure clean state)
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =============================================================================
-- CREATE SECURE FUNCTIONS
-- =============================================================================

-- Create secure update_updated_at function
-- This function automatically updates the updated_at column when a row is modified
-- Uses empty search_path and fully qualified identifiers per Supabase security best practices
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Create secure handle_new_user function
-- This function is called when a new user signs up
-- Uses empty search_path and fully qualified identifiers per Supabase security best practices
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Insert user into public.users table with default values, fully qualified
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = now();
    
    RETURN NEW;
END;
$$;

-- =============================================================================
-- CREATE TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================================================

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_gardens_updated_at ON public.gardens;
DROP TRIGGER IF EXISTS update_plants_updated_at ON public.plants;
DROP TRIGGER IF EXISTS update_plant_collections_updated_at ON public.plant_collections;
DROP TRIGGER IF EXISTS update_garden_plants_updated_at ON public.garden_plants;
DROP TRIGGER IF EXISTS update_plant_doctor_sessions_updated_at ON public.plant_doctor_sessions;
DROP TRIGGER IF EXISTS update_api_usage_stats_updated_at ON public.api_usage_stats;
DROP TRIGGER IF EXISTS update_api_alerts_updated_at ON public.api_alerts;
DROP TRIGGER IF EXISTS update_failed_login_attempts_updated_at ON public.failed_login_attempts;
DROP TRIGGER IF EXISTS update_ip_access_control_updated_at ON public.ip_access_control;
DROP TRIGGER IF EXISTS update_rate_limit_violations_updated_at ON public.rate_limit_violations;
DROP TRIGGER IF EXISTS update_scrape_requests_updated_at ON public.scrape_requests;
DROP TRIGGER IF EXISTS update_security_audit_logs_updated_at ON public.security_audit_logs;
DROP TRIGGER IF EXISTS update_security_recommendations_updated_at ON public.security_recommendations;
DROP TRIGGER IF EXISTS update_security_settings_updated_at ON public.security_settings;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_design_generations_updated_at ON public.design_generations;
DROP TRIGGER IF EXISTS update_image_generation_queue_updated_at ON public.image_generation_queue;
DROP TRIGGER IF EXISTS update_file_vault_updated_at ON public.file_vault;
DROP TRIGGER IF EXISTS update_active_sessions_updated_at ON public.active_sessions;
DROP TRIGGER IF EXISTS update_scraping_progress_updated_at ON public.scraping_progress;
DROP TRIGGER IF EXISTS update_climate_data_updated_at ON public.climate_data;

-- Create triggers for tables with updated_at columns
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gardens_updated_at
    BEFORE UPDATE ON public.gardens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_plants_updated_at
    BEFORE UPDATE ON public.plants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_plant_collections_updated_at
    BEFORE UPDATE ON public.plant_collections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_garden_plants_updated_at
    BEFORE UPDATE ON public.garden_plants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_plant_doctor_sessions_updated_at
    BEFORE UPDATE ON public.plant_doctor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_design_generations_updated_at
    BEFORE UPDATE ON public.design_generations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_image_generation_queue_updated_at
    BEFORE UPDATE ON public.image_generation_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_file_vault_updated_at
    BEFORE UPDATE ON public.file_vault
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_api_alerts_updated_at
    BEFORE UPDATE ON public.api_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_active_sessions_updated_at
    BEFORE UPDATE ON public.active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ip_access_control_updated_at
    BEFORE UPDATE ON public.ip_access_control
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rate_limit_violations_updated_at
    BEFORE UPDATE ON public.rate_limit_violations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_scrape_requests_updated_at
    BEFORE UPDATE ON public.scrape_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_scraping_progress_updated_at
    BEFORE UPDATE ON public.scraping_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_security_recommendations_updated_at
    BEFORE UPDATE ON public.security_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_security_settings_updated_at
    BEFORE UPDATE ON public.security_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_climate_data_updated_at
    BEFORE UPDATE ON public.climate_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;