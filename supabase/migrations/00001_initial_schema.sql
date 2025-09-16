-- =============================================================================
-- INITIAL SCHEMA MIGRATION FOR GARDENSCAPE PRO
-- =============================================================================
-- This migration sets up the initial database schema for the application
-- including all tables, indexes, and relationships
-- =============================================================================

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS AND AUTHENTICATION TABLES
-- =============================================================================

-- Users table (core user information)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    tier VARCHAR(50) DEFAULT 'free',
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Profiles table (extended user information)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    replit_id TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_replit_id ON public.profiles(replit_id);

-- =============================================================================
-- PLANTS CATALOG TABLES
-- =============================================================================

-- Plants table (main plant catalog)
CREATE TABLE IF NOT EXISTS public.plants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    perenual_id INTEGER UNIQUE,
    scientific_name VARCHAR(500) UNIQUE NOT NULL,
    common_name VARCHAR(500),
    description TEXT,
    type VARCHAR(100),
    dimension TEXT,
    lifecycle VARCHAR(100),
    watering VARCHAR(100),
    watering_general_benchmark JSONB,
    depth_water_requirement JSONB,
    volume_water_requirement JSONB,
    watering_period VARCHAR(100),
    sunlight JSONB,
    pruning_month JSONB,
    pruning_count JSONB,
    seeds INTEGER,
    maintenance VARCHAR(100),
    care_level VARCHAR(100),
    care_guides TEXT,
    soil JSONB,
    growth_rate VARCHAR(100),
    drought_tolerant BOOLEAN,
    salt_tolerant BOOLEAN,
    thorny BOOLEAN,
    invasive BOOLEAN,
    tropical BOOLEAN,
    indoor BOOLEAN,
    flowers BOOLEAN,
    flower_color JSONB,
    blooming_season JSONB,
    fruit BOOLEAN,
    fruit_color JSONB,
    harvest_season JSONB,
    harvest_method VARCHAR(255),
    leaf BOOLEAN,
    leaf_color JSONB,
    edible_leaf BOOLEAN,
    cuisine BOOLEAN,
    medicinal BOOLEAN,
    poisonous_to_humans BOOLEAN,
    poisonous_to_pets BOOLEAN,
    hardiness JSONB,
    hardiness_location JSONB,
    propagation JSONB,
    image_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for plant lookups
CREATE INDEX IF NOT EXISTS idx_plants_common_name ON public.plants(common_name);
CREATE INDEX IF NOT EXISTS idx_plants_scientific_name ON public.plants(scientific_name);
CREATE INDEX IF NOT EXISTS idx_plants_type ON public.plants(type);

-- Plant collections table (user's personal plant collections)
CREATE TABLE IF NOT EXISTS public.plant_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for collections
CREATE INDEX IF NOT EXISTS idx_plant_collections_user_id ON public.plant_collections(user_id);

-- User plant collections (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.user_plant_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES public.plant_collections(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plant_id, collection_id)
);

-- Create indexes for user plant collections
CREATE INDEX IF NOT EXISTS idx_user_plant_collections_user_id ON public.user_plant_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plant_collections_plant_id ON public.user_plant_collections(plant_id);
CREATE INDEX IF NOT EXISTS idx_user_plant_collections_collection_id ON public.user_plant_collections(collection_id);

-- =============================================================================
-- GARDENS TABLES
-- =============================================================================

-- Gardens table
CREATE TABLE IF NOT EXISTS public.gardens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location TEXT,
    size_sqm DECIMAL(10, 2),
    garden_type VARCHAR(100),
    style VARCHAR(100),
    climate_zone VARCHAR(50),
    soil_type VARCHAR(100),
    sun_exposure VARCHAR(100),
    design_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for gardens
CREATE INDEX IF NOT EXISTS idx_gardens_user_id ON public.gardens(user_id);

-- Garden plants table (plants in a specific garden)
CREATE TABLE IF NOT EXISTS public.garden_plants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garden_id UUID REFERENCES public.gardens(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    planted_date DATE,
    position JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(garden_id, plant_id)
);

-- Create indexes for garden plants
CREATE INDEX IF NOT EXISTS idx_garden_plants_garden_id ON public.garden_plants(garden_id);
CREATE INDEX IF NOT EXISTS idx_garden_plants_plant_id ON public.garden_plants(plant_id);

-- =============================================================================
-- PLANT DOCTOR AND AI FEATURES
-- =============================================================================

-- Plant doctor sessions table
CREATE TABLE IF NOT EXISTS public.plant_doctor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    plant_id UUID REFERENCES public.plants(id),
    diagnosis TEXT,
    recommendations TEXT,
    images JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for plant doctor sessions
CREATE INDEX IF NOT EXISTS idx_plant_doctor_sessions_user_id ON public.plant_doctor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_doctor_sessions_session_id ON public.plant_doctor_sessions(session_id);

-- Design generations table
CREATE TABLE IF NOT EXISTS public.design_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garden_id UUID REFERENCES public.gardens(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    generation_type VARCHAR(100),
    prompt TEXT,
    result JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for design generations
CREATE INDEX IF NOT EXISTS idx_design_generations_garden_id ON public.design_generations(garden_id);
CREATE INDEX IF NOT EXISTS idx_design_generations_user_id ON public.design_generations(user_id);

-- Image generation queue table
CREATE TABLE IF NOT EXISTS public.image_generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    result_url TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for image generation queue
CREATE INDEX IF NOT EXISTS idx_image_generation_queue_user_id ON public.image_generation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_image_generation_queue_status ON public.image_generation_queue(status);

-- =============================================================================
-- FILE STORAGE
-- =============================================================================

-- File vault table
CREATE TABLE IF NOT EXISTS public.file_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for file vault
CREATE INDEX IF NOT EXISTS idx_file_vault_user_id ON public.file_vault(user_id);

-- =============================================================================
-- API AND MONITORING TABLES
-- =============================================================================

-- API usage stats table
CREATE TABLE IF NOT EXISTS public.api_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for API usage stats
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_user_id ON public.api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint ON public.api_usage_stats(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_created_at ON public.api_usage_stats(created_at);

-- API health checks table
CREATE TABLE IF NOT EXISTS public.api_health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for API health checks
CREATE INDEX IF NOT EXISTS idx_api_health_checks_service_name ON public.api_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_api_health_checks_created_at ON public.api_health_checks(created_at);

-- API alerts table
CREATE TABLE IF NOT EXISTS public.api_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for API alerts
CREATE INDEX IF NOT EXISTS idx_api_alerts_alert_type ON public.api_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_api_alerts_severity ON public.api_alerts(severity);

-- =============================================================================
-- SECURITY AND AUDIT TABLES
-- =============================================================================

-- Security audit logs table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for security audit logs
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action ON public.security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs(created_at);

-- Failed login attempts table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for failed login attempts
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email ON public.failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip_address ON public.failed_login_attempts(ip_address);

-- Active sessions table
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for active sessions
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_token ON public.active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON public.active_sessions(expires_at);

-- IP access control table
CREATE TABLE IF NOT EXISTS public.ip_access_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET UNIQUE NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'allow' or 'block'
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for IP access control
CREATE INDEX IF NOT EXISTS idx_ip_access_control_ip_address ON public.ip_access_control(ip_address);

-- Rate limit violations table
CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address INET,
    endpoint VARCHAR(255),
    violations_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for rate limit violations
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user_id ON public.rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip_address ON public.rate_limit_violations(ip_address);

-- Security settings table
CREATE TABLE IF NOT EXISTS public.security_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security recommendations table
CREATE TABLE IF NOT EXISTS public.security_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    recommendation TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DATA SCRAPING AND IMPORT TABLES
-- =============================================================================

-- Scraping progress table
CREATE TABLE IF NOT EXISTS public.scraping_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url VARCHAR(1000) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for scraping progress
CREATE INDEX IF NOT EXISTS idx_scraping_progress_status ON public.scraping_progress(status);

-- Scrape requests table
CREATE TABLE IF NOT EXISTS public.scrape_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for scrape requests
CREATE INDEX IF NOT EXISTS idx_scrape_requests_status ON public.scrape_requests(status);

-- =============================================================================
-- CLIMATE DATA TABLE
-- =============================================================================

-- Climate data table
CREATE TABLE IF NOT EXISTS public.climate_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location VARCHAR(500) UNIQUE NOT NULL,
    climate_zone VARCHAR(50),
    average_temp_c JSONB,
    precipitation_mm JSONB,
    humidity_percent JSONB,
    frost_dates JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for climate data
CREATE INDEX IF NOT EXISTS idx_climate_data_location ON public.climate_data(location);
CREATE INDEX IF NOT EXISTS idx_climate_data_climate_zone ON public.climate_data(climate_zone);

-- =============================================================================
-- TASK MANAGEMENT TABLE
-- =============================================================================

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, service_role, anon;

-- Grant permissions on all tables to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on all tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant read permissions to anon users (for public data)
GRANT SELECT ON public.plants TO anon;
GRANT SELECT ON public.climate_data TO anon;