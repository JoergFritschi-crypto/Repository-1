-- =============================================
-- GardenScape Pro - Supabase Database Schema
-- =============================================
-- This script creates all necessary tables for the GardenScape Pro application
-- Compatible with Supabase PostgreSQL
-- 
-- Tables included:
-- - User management (profiles linked to auth.users)
-- - Garden design (gardens, plants, garden_plants)
-- - User collections (user_plant_collections)
-- - AI features (plant_doctor_sessions, design_generations)
-- - Climate data (climate_data)
-- - File management (file_vault)
-- - API monitoring (api_health_checks, api_usage_stats, api_alerts)
-- - Security (audit logs, active sessions, failed logins, etc.)
-- - Scraping and queue management
-- =============================================

-- Enable necessary extensions in the extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- =============================================
-- ENUM TYPES
-- =============================================

-- User tier enum
CREATE TYPE user_tier AS ENUM ('free', 'pay_per_design', 'premium');

-- Garden shape enum
CREATE TYPE garden_shape AS ENUM ('rectangle', 'square', 'circle', 'oval', 'triangle', 'l_shaped', 'r_shaped');

-- Slope direction enum
CREATE TYPE slope_direction AS ENUM ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW');

-- Sun exposure enum
CREATE TYPE sun_exposure AS ENUM ('full_sun', 'partial_sun', 'partial_shade', 'full_shade');

-- Soil type enum
CREATE TYPE soil_type AS ENUM ('clay', 'loam', 'sand', 'silt', 'chalk');

-- North orientation enum
CREATE TYPE north_orientation AS ENUM ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW');

-- Point of view enum
CREATE TYPE point_of_view AS ENUM ('top_down', 'bird_eye', 'ground_level', 'elevated_angle', 'isometric');

-- Security severity enum
CREATE TYPE security_severity AS ENUM ('info', 'warning', 'error', 'critical');

-- Security event type enum
CREATE TYPE security_event_type AS ENUM (
  'login_success', 'login_failed', 'logout', 'password_changed',
  'permission_granted', 'permission_revoked', 'data_access',
  'data_modification', 'data_deletion', 'admin_action',
  'security_setting_changed', 'suspicious_activity',
  'rate_limit_exceeded', 'ip_blocked', 'session_hijacking_attempt'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Profiles table (linked to auth.users)
-- Stores user profile and subscription information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  user_tier user_tier DEFAULT 'free',
  design_credits INTEGER DEFAULT 1,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(user_tier);

-- Gardens table
-- Stores garden design information and parameters
CREATE TABLE IF NOT EXISTS gardens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  units TEXT NOT NULL DEFAULT 'metric',
  shape garden_shape NOT NULL,
  dimensions JSONB NOT NULL,
  slope_percentage DECIMAL(5,2),
  slope_direction slope_direction,
  north_orientation north_orientation,
  point_of_view point_of_view DEFAULT 'bird_eye',
  sun_exposure sun_exposure,
  soil_type soil_type,
  soil_ph DECIMAL(3,1),
  has_soil_analysis BOOLEAN DEFAULT false,
  soil_analysis JSONB,
  hardiness_zone TEXT,
  usda_zone TEXT,
  rhs_zone TEXT,
  hardiness_category TEXT,
  climate_data JSONB,
  preferences JSONB,
  design_approach TEXT DEFAULT 'ai',
  layout_data JSONB,
  ai_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gardens_user_id ON gardens(user_id);
CREATE INDEX IF NOT EXISTS idx_gardens_status ON gardens(status);

-- Plants table
-- Master plant database with botanical and horticultural information
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perenual_id INTEGER UNIQUE,
  external_id TEXT UNIQUE,
  
  -- Core botanical identity
  scientific_name TEXT NOT NULL UNIQUE,
  genus TEXT NOT NULL,
  species TEXT,
  cultivar TEXT,
  common_name TEXT NOT NULL,
  family TEXT,
  
  -- Basic characteristics
  type TEXT,
  dimension JSONB,
  
  -- Numeric dimensions for filtering (metric and imperial)
  height_min_cm INTEGER,
  height_max_cm INTEGER,
  spread_min_cm INTEGER,
  spread_max_cm INTEGER,
  height_min_inches INTEGER,
  height_max_inches INTEGER,
  spread_min_inches INTEGER,
  spread_max_inches INTEGER,
  
  cycle TEXT,
  foliage TEXT,
  
  -- Growing conditions
  hardiness TEXT,
  hardiness_location JSONB,
  sunlight JSONB,
  soil JSONB,
  soil_ph TEXT,
  watering TEXT,
  watering_general_benchmark JSONB,
  watering_period TEXT,
  depth_water_requirement JSONB,
  volume_water_requirement JSONB,
  
  -- Plant characteristics
  growth_rate TEXT,
  drought_tolerant BOOLEAN DEFAULT false,
  salt_tolerant BOOLEAN DEFAULT false,
  thorny BOOLEAN DEFAULT false,
  tropical BOOLEAN DEFAULT false,
  invasive BOOLEAN DEFAULT false,
  indoor BOOLEAN DEFAULT false,
  care_level TEXT,
  maintenance TEXT,
  
  -- Availability scoring
  base_availability_score INTEGER,
  cultivation_difficulty TEXT,
  propagation_method TEXT,
  commercial_production TEXT,
  climate_adaptability INTEGER,
  regional_availability JSONB,
  
  -- Appearance
  leaf JSONB,
  leaf_color JSONB,
  flower_color JSONB,
  flowering_season TEXT,
  fruit_color JSONB,
  harvest_season TEXT,
  
  -- Bloom timing (legacy and precise)
  bloom_start_month INTEGER,
  bloom_end_month INTEGER,
  bloom_start_day_of_year INTEGER,
  bloom_end_day_of_year INTEGER,
  bloom_windows JSONB,
  bloom_precision TEXT,
  
  -- Safety (RHS/HTA 3-tier classification)
  toxicity_category TEXT DEFAULT 'low',
  toxicity_to_humans TEXT DEFAULT 'low',
  toxicity_to_pets TEXT DEFAULT 'low',
  toxicity_notes TEXT,
  child_safe BOOLEAN DEFAULT true,
  pet_safe BOOLEAN DEFAULT true,
  edible_fruit BOOLEAN DEFAULT false,
  edible_leaf BOOLEAN DEFAULT false,
  cuisine BOOLEAN DEFAULT false,
  medicinal BOOLEAN DEFAULT false,
  poisonous_to_humans INTEGER DEFAULT 0,
  poisonous_to_pets INTEGER DEFAULT 0,
  
  -- Garden information
  attracts JSONB,
  propagation JSONB,
  resistance JSONB,
  problem JSONB,
  pruning_month JSONB,
  pruning_count JSONB,
  seeds INTEGER,
  pest_susceptibility JSONB,
  pest_susceptibility_api TEXT,
  
  -- Content and guides
  description TEXT,
  care_guides TEXT,
  
  -- Image generation fields
  thumbnail_image TEXT,
  full_image TEXT,
  detail_image TEXT,
  image_generation_status TEXT DEFAULT 'pending',
  image_generation_started_at TIMESTAMPTZ,
  image_generation_completed_at TIMESTAMPTZ,
  image_generation_error TEXT,
  image_generation_attempts INTEGER DEFAULT 0,
  last_image_generation_at TIMESTAMPTZ,
  
  -- System fields
  generated_image_url TEXT,
  data_source TEXT DEFAULT 'perenual',
  imported_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plants_scientific_name ON plants(scientific_name);
CREATE INDEX IF NOT EXISTS idx_plants_common_name ON plants(common_name);
CREATE INDEX IF NOT EXISTS idx_plants_genus ON plants(genus);
CREATE INDEX IF NOT EXISTS idx_plants_type ON plants(type);
CREATE INDEX IF NOT EXISTS idx_plants_image_status ON plants(image_generation_status);

-- =============================================
-- RELATIONSHIP TABLES
-- =============================================

-- User plant collections
-- Stores user's favorite and saved plants
CREATE TABLE IF NOT EXISTS user_plant_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_plants_user ON user_plant_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plants_plant ON user_plant_collections(plant_id);

-- Garden plants
-- Links plants to specific positions in garden designs
CREATE TABLE IF NOT EXISTS garden_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id UUID NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  position_x DECIMAL(10,2),
  position_y DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garden_plants_garden ON garden_plants(garden_id);
CREATE INDEX IF NOT EXISTS idx_garden_plants_plant ON garden_plants(plant_id);

-- =============================================
-- AI AND ANALYSIS TABLES
-- =============================================

-- Plant doctor sessions
-- Stores plant identification and diagnosis sessions
CREATE TABLE IF NOT EXISTS plant_doctor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  image_url TEXT,
  ai_analysis JSONB,
  confidence DECIMAL(5,4),
  identified_plant_id UUID REFERENCES plants(id),
  user_feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plant_doctor_user ON plant_doctor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_doctor_plant ON plant_doctor_sessions(identified_plant_id);

-- Design generations
-- Tracks AI design generation for tier limits
CREATE TABLE IF NOT EXISTS design_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  garden_id UUID REFERENCES gardens(id) ON DELETE SET NULL,
  style_id TEXT NOT NULL,
  generation_type TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_gen_user ON design_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_design_gen_garden ON design_generations(garden_id);

-- =============================================
-- CLIMATE AND DATA TABLES
-- =============================================

-- Climate data cache
-- Stores location-specific climate information
CREATE TABLE IF NOT EXISTS climate_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL UNIQUE,
  hardiness_zone TEXT,
  usda_zone TEXT,
  rhs_zone TEXT,
  ahs_heat_zone INTEGER,
  koppen_climate TEXT,
  hardiness_category TEXT,
  temperature_range TEXT,
  annual_rainfall DECIMAL(7,2),
  avg_temp_min DECIMAL(5,2),
  avg_temp_max DECIMAL(5,2),
  avg_humidity DECIMAL(5,2),
  avg_wind_speed DECIMAL(5,2),
  sunshine_percent DECIMAL(5,2),
  wettest_month TEXT,
  wettest_month_precip DECIMAL(7,2),
  driest_month TEXT,
  driest_month_precip DECIMAL(7,2),
  monthly_precip_pattern JSONB,
  frost_dates JSONB,
  growing_season JSONB,
  monthly_data JSONB,
  gardening_advice TEXT,
  data_source TEXT DEFAULT 'visual_crossing',
  data_range JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_climate_location ON climate_data(location);

-- =============================================
-- QUEUE AND PROCESSING TABLES
-- =============================================

-- Image generation queue
-- Manages bulk image generation with rate limiting
CREATE TABLE IF NOT EXISTS image_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  image_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  generated_image_path TEXT,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_img_queue_plant ON image_generation_queue(plant_id);
CREATE INDEX IF NOT EXISTS idx_img_queue_status ON image_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_img_queue_scheduled ON image_generation_queue(scheduled_for);

-- Scraping progress
-- Tracks web scraping progress
CREATE TABLE IF NOT EXISTS scraping_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_batches INTEGER DEFAULT 0,
  completed_batches INTEGER DEFAULT 0,
  total_plants INTEGER DEFAULT 0,
  saved_plants INTEGER DEFAULT 0,
  duplicate_plants INTEGER DEFAULT 0,
  failed_plants INTEGER DEFAULT 0,
  last_product_url TEXT,
  product_urls JSONB,
  errors JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MONITORING AND ANALYTICS TABLES
-- =============================================

-- API health checks
-- Monitors external API status
CREATE TABLE IF NOT EXISTS api_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  quota_used INTEGER,
  quota_limit INTEGER,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_api_health_service ON api_health_checks(service);
CREATE INDEX IF NOT EXISTS idx_api_health_checked ON api_health_checks(last_checked);

-- API usage statistics
-- Tracks API usage for cost monitoring
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  endpoint TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  request_count INTEGER DEFAULT 1,
  tokens_used INTEGER,
  cost DECIMAL(10,4),
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_stats(service);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_stats(date);

-- API alerts
-- Alert configurations for monitoring
CREATE TABLE IF NOT EXISTS api_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  threshold INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  notifications_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FILE MANAGEMENT TABLES
-- =============================================

-- File vault
-- Stores user files with tier-based retention
CREATE TABLE IF NOT EXISTS file_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  metadata JSONB,
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_vault_user ON file_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_file_vault_type ON file_vault(file_type);
CREATE INDEX IF NOT EXISTS idx_file_vault_expires ON file_vault(expires_at);

-- =============================================
-- ADMIN TABLES
-- =============================================

-- Todo tasks
-- Simple todo list for admin dashboard
CREATE TABLE IF NOT EXISTS todo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SECURITY TABLES
-- =============================================

-- Security audit logs
-- Tracks all security-relevant events
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type security_event_type NOT NULL,
  event_description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  severity security_severity NOT NULL DEFAULT 'info',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_logs(created_at);

-- Active sessions
-- Monitors currently active user sessions
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  login_time TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_revoked_by ON active_sessions(revoked_by);

-- Failed login attempts
-- Tracks failed logins for security monitoring
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  attempted_email TEXT,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_blocked ON failed_login_attempts(blocked_until);

-- IP access control
-- Manages IP-based access rules
CREATE TABLE IF NOT EXISTS ip_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  ip_range TEXT,
  type TEXT NOT NULL,
  reason TEXT,
  added_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_control_address ON ip_access_control(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_control_active ON ip_access_control(is_active);
CREATE INDEX IF NOT EXISTS idx_ip_control_added_by ON ip_access_control(added_by);

-- Security settings
-- Stores security configuration
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  last_modified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_settings_modified_by ON security_settings(last_modified_by);

-- Security recommendations
-- System-generated security improvement suggestions
CREATE TABLE IF NOT EXISTS security_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity security_severity NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  implementation_guide TEXT,
  dismissed_by UUID REFERENCES profiles(id),
  dismissed_at TIMESTAMPTZ,
  dismissal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_rec_dismissed_by ON security_recommendations(dismissed_by);

-- Rate limit violations
-- Tracks rate limit violations
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  violation_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,
  blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked ON rate_limit_violations(blocked_until);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on user-scoped tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gardens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plant_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_doctor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Gardens policies
CREATE POLICY gardens_select_own ON gardens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY gardens_insert_own ON gardens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY gardens_update_own ON gardens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY gardens_delete_own ON gardens
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- User plant collections policies
CREATE POLICY user_plants_select_own ON user_plant_collections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_plants_insert_own ON user_plant_collections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_plants_update_own ON user_plant_collections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_plants_delete_own ON user_plant_collections
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Garden plants policies (through garden ownership)
CREATE POLICY garden_plants_select ON garden_plants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND gardens.user_id = auth.uid()
    )
  );

CREATE POLICY garden_plants_insert ON garden_plants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND gardens.user_id = auth.uid()
    )
  );

CREATE POLICY garden_plants_update ON garden_plants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND gardens.user_id = auth.uid()
    )
  );

CREATE POLICY garden_plants_delete ON garden_plants
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND gardens.user_id = auth.uid()
    )
  );

-- Plant doctor sessions policies
CREATE POLICY plant_doctor_select_own ON plant_doctor_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY plant_doctor_insert_own ON plant_doctor_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Design generations policies
CREATE POLICY design_gen_select_own ON design_generations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY design_gen_insert_own ON design_generations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- File vault policies
CREATE POLICY file_vault_select_own ON file_vault
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY file_vault_insert_own ON file_vault
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY file_vault_delete_own ON file_vault
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Active sessions policies
CREATE POLICY active_sessions_select_own ON active_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- PUBLIC ACCESS POLICIES
-- =============================================

-- Plants table is public read-only
CREATE POLICY plants_public_read ON plants
  FOR SELECT TO anon, authenticated
  USING (true);

-- Climate data is public read-only
CREATE POLICY climate_public_read ON climate_data
  FOR SELECT TO anon, authenticated
  USING (true);

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add update triggers to tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gardens_updated_at BEFORE UPDATE ON gardens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plants_updated_at BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_progress_updated_at BEFORE UPDATE ON scraping_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_access_control_updated_at BEFORE UPDATE ON ip_access_control
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_settings_updated_at BEFORE UPDATE ON security_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_recommendations_updated_at BEFORE UPDATE ON security_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA AND SETTINGS
-- =============================================

-- Insert default security settings
INSERT INTO security_settings (key, value, description) VALUES
  ('max_login_attempts', '{"value": 5}', 'Maximum login attempts before blocking'),
  ('session_timeout', '{"value": 3600}', 'Session timeout in seconds'),
  ('password_min_length', '{"value": 8}', 'Minimum password length'),
  ('require_2fa', '{"value": false}', 'Require two-factor authentication'),
  ('ip_blocking_duration', '{"value": 900}', 'IP blocking duration in seconds after max failed attempts')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant all permissions to authenticated users for reading plants
GRANT SELECT ON plants TO anon, authenticated;
GRANT SELECT ON climate_data TO anon, authenticated;

-- Grant permissions to service role (used by backend)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- =============================================
-- END OF SCHEMA
-- =============================================

-- Note: After running this script, you may need to:
-- 1. Configure Supabase Auth settings in the dashboard
-- 2. Set up environment variables in your application
-- 3. Configure API keys and secrets
-- 4. Set up any additional indexes based on query patterns
-- 5. Configure backup and recovery settings