-- =============================================
-- GardenScape Pro - Supabase Database Schema
-- =============================================
-- This script creates all necessary tables for the GardenScape Pro application
-- Compatible with Supabase PostgreSQL
-- 
-- Tables included:
-- - User management (users, sessions)
-- - Garden design (gardens, plants, garden_plants)
-- - User collections (user_plant_collections)
-- - AI features (plant_doctor_sessions, design_generations)
-- - Climate data (climate_data)
-- - File management (file_vault)
-- - API monitoring (api_health_checks, api_usage_stats, api_alerts)
-- - Security (audit logs, active sessions, failed logins, etc.)
-- - Scraping and queue management
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Sessions table (required for Replit Auth)
-- Stores user session data for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

-- Users table
-- Stores user profile and subscription information
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  subscription_status VARCHAR,
  user_tier user_tier DEFAULT 'free',
  design_credits INTEGER DEFAULT 1,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(user_tier);

-- Gardens table
-- Stores garden design information and parameters
CREATE TABLE IF NOT EXISTS gardens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  location VARCHAR NOT NULL,
  units VARCHAR NOT NULL DEFAULT 'metric',
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
  hardiness_zone VARCHAR,
  usda_zone VARCHAR,
  rhs_zone VARCHAR,
  hardiness_category VARCHAR,
  climate_data JSONB,
  preferences JSONB,
  design_approach VARCHAR DEFAULT 'ai',
  layout_data JSONB,
  ai_generated BOOLEAN DEFAULT false,
  status VARCHAR DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gardens_user_id ON gardens(user_id);
CREATE INDEX IF NOT EXISTS idx_gardens_status ON gardens(status);

-- Plants table
-- Master plant database with botanical and horticultural information
CREATE TABLE IF NOT EXISTS plants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  perenual_id INTEGER UNIQUE,
  external_id VARCHAR UNIQUE,
  
  -- Core botanical identity
  scientific_name VARCHAR NOT NULL UNIQUE,
  genus VARCHAR NOT NULL,
  species VARCHAR,
  cultivar VARCHAR,
  common_name VARCHAR NOT NULL,
  family VARCHAR,
  
  -- Basic characteristics
  type VARCHAR,
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
  
  cycle VARCHAR,
  foliage VARCHAR,
  
  -- Growing conditions
  hardiness VARCHAR,
  hardiness_location JSONB,
  sunlight JSONB,
  soil JSONB,
  soil_ph VARCHAR,
  watering VARCHAR,
  watering_general_benchmark JSONB,
  watering_period VARCHAR,
  depth_water_requirement JSONB,
  volume_water_requirement JSONB,
  
  -- Plant characteristics
  growth_rate VARCHAR,
  drought_tolerant BOOLEAN DEFAULT false,
  salt_tolerant BOOLEAN DEFAULT false,
  thorny BOOLEAN DEFAULT false,
  tropical BOOLEAN DEFAULT false,
  invasive BOOLEAN DEFAULT false,
  indoor BOOLEAN DEFAULT false,
  care_level VARCHAR,
  maintenance VARCHAR,
  
  -- Availability scoring
  base_availability_score INTEGER,
  cultivation_difficulty VARCHAR,
  propagation_method VARCHAR,
  commercial_production VARCHAR,
  climate_adaptability INTEGER,
  regional_availability JSONB,
  
  -- Appearance
  leaf JSONB,
  leaf_color JSONB,
  flower_color JSONB,
  flowering_season VARCHAR,
  fruit_color JSONB,
  harvest_season VARCHAR,
  
  -- Bloom timing (legacy and precise)
  bloom_start_month INTEGER,
  bloom_end_month INTEGER,
  bloom_start_day_of_year INTEGER,
  bloom_end_day_of_year INTEGER,
  bloom_windows JSONB,
  bloom_precision VARCHAR,
  
  -- Safety (RHS/HTA 3-tier classification)
  toxicity_category VARCHAR DEFAULT 'low',
  toxicity_to_humans VARCHAR DEFAULT 'low',
  toxicity_to_pets VARCHAR DEFAULT 'low',
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
  pest_susceptibility_api VARCHAR,
  
  -- Content and guides
  description TEXT,
  care_guides VARCHAR,
  
  -- Image generation fields
  thumbnail_image VARCHAR,
  full_image VARCHAR,
  detail_image VARCHAR,
  image_generation_status VARCHAR DEFAULT 'pending',
  image_generation_started_at TIMESTAMP,
  image_generation_completed_at TIMESTAMP,
  image_generation_error TEXT,
  image_generation_attempts INTEGER DEFAULT 0,
  last_image_generation_at TIMESTAMP,
  
  -- System fields
  generated_image_url VARCHAR,
  data_source VARCHAR DEFAULT 'perenual',
  imported_at TIMESTAMP,
  verification_status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
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
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id VARCHAR NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_plants_user ON user_plant_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plants_plant ON user_plant_collections(plant_id);

-- Garden plants
-- Links plants to specific positions in garden designs
CREATE TABLE IF NOT EXISTS garden_plants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  garden_id VARCHAR NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  plant_id VARCHAR NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  position_x DECIMAL(10,2),
  position_y DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garden_plants_garden ON garden_plants(garden_id);
CREATE INDEX IF NOT EXISTS idx_garden_plants_plant ON garden_plants(plant_id);

-- =============================================
-- AI AND ANALYSIS TABLES
-- =============================================

-- Plant doctor sessions
-- Stores plant identification and diagnosis sessions
CREATE TABLE IF NOT EXISTS plant_doctor_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR NOT NULL,
  image_url VARCHAR,
  ai_analysis JSONB,
  confidence DECIMAL(5,4),
  identified_plant_id VARCHAR REFERENCES plants(id),
  user_feedback JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plant_doctor_user ON plant_doctor_sessions(user_id);

-- Design generations
-- Tracks AI design generation for tier limits
CREATE TABLE IF NOT EXISTS design_generations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  garden_id VARCHAR REFERENCES gardens(id) ON DELETE SET NULL,
  style_id VARCHAR NOT NULL,
  generation_type VARCHAR NOT NULL,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_gen_user ON design_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_design_gen_garden ON design_generations(garden_id);

-- =============================================
-- CLIMATE AND DATA TABLES
-- =============================================

-- Climate data cache
-- Stores location-specific climate information
CREATE TABLE IF NOT EXISTS climate_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location VARCHAR NOT NULL UNIQUE,
  hardiness_zone VARCHAR,
  usda_zone VARCHAR,
  rhs_zone VARCHAR,
  ahs_heat_zone INTEGER,
  koppen_climate VARCHAR,
  hardiness_category VARCHAR,
  temperature_range VARCHAR,
  annual_rainfall DECIMAL(7,2),
  avg_temp_min DECIMAL(5,2),
  avg_temp_max DECIMAL(5,2),
  avg_humidity DECIMAL(5,2),
  avg_wind_speed DECIMAL(5,2),
  sunshine_percent DECIMAL(5,2),
  wettest_month VARCHAR,
  wettest_month_precip DECIMAL(7,2),
  driest_month VARCHAR,
  driest_month_precip DECIMAL(7,2),
  monthly_precip_pattern JSONB,
  frost_dates JSONB,
  growing_season JSONB,
  monthly_data JSONB,
  gardening_advice TEXT,
  data_source VARCHAR DEFAULT 'visual_crossing',
  data_range JSONB,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_climate_location ON climate_data(location);

-- =============================================
-- QUEUE AND PROCESSING TABLES
-- =============================================

-- Image generation queue
-- Manages bulk image generation with rate limiting
CREATE TABLE IF NOT EXISTS image_generation_queue (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plant_id VARCHAR NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  image_type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  generated_image_path VARCHAR,
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_img_queue_plant ON image_generation_queue(plant_id);
CREATE INDEX IF NOT EXISTS idx_img_queue_status ON image_generation_queue(status);

-- Scraping progress
-- Tracks web scraping progress
CREATE TABLE IF NOT EXISTS scraping_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url VARCHAR NOT NULL UNIQUE,
  status VARCHAR NOT NULL DEFAULT 'in_progress',
  total_batches INTEGER DEFAULT 0,
  completed_batches INTEGER DEFAULT 0,
  total_plants INTEGER DEFAULT 0,
  saved_plants INTEGER DEFAULT 0,
  duplicate_plants INTEGER DEFAULT 0,
  failed_plants INTEGER DEFAULT 0,
  last_product_url VARCHAR,
  product_urls JSONB,
  errors JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- MONITORING AND ANALYTICS TABLES
-- =============================================

-- API health checks
-- Monitors external API status
CREATE TABLE IF NOT EXISTS api_health_checks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  quota_used INTEGER,
  quota_limit INTEGER,
  last_checked TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_api_health_service ON api_health_checks(service);

-- API usage statistics
-- Tracks API usage for cost monitoring
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service VARCHAR NOT NULL,
  endpoint VARCHAR,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  request_count INTEGER DEFAULT 1,
  tokens_used INTEGER,
  cost DECIMAL(10,4),
  date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_stats(service);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_stats(user_id);

-- API alerts
-- Alert configurations for monitoring
CREATE TABLE IF NOT EXISTS api_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service VARCHAR NOT NULL,
  alert_type VARCHAR NOT NULL,
  threshold INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP,
  notifications_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- FILE MANAGEMENT TABLES
-- =============================================

-- File vault
-- Stores user files with tier-based retention
CREATE TABLE IF NOT EXISTS file_vault (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  content_type VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  metadata JSONB,
  expires_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_vault_user ON file_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_file_vault_type ON file_vault(file_type);

-- =============================================
-- ADMIN TABLES
-- =============================================

-- Todo tasks
-- Simple todo list for admin dashboard
CREATE TABLE IF NOT EXISTS todo_tasks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SECURITY TABLES
-- =============================================

-- Security audit logs
-- Tracks all security-relevant events
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  event_type security_event_type NOT NULL,
  event_description TEXT NOT NULL,
  ip_address VARCHAR,
  user_agent TEXT,
  metadata JSONB,
  severity security_severity NOT NULL DEFAULT 'info',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON security_audit_logs(severity);

-- Active sessions
-- Monitors currently active user sessions
CREATE TABLE IF NOT EXISTS active_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR NOT NULL UNIQUE,
  ip_address VARCHAR NOT NULL,
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT NOW(),
  login_time TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);

-- Failed login attempts
-- Tracks failed logins for security monitoring
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip_address VARCHAR NOT NULL,
  attempted_email VARCHAR,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  last_attempt TIMESTAMP DEFAULT NOW(),
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);

-- IP access control
-- Manages IP-based access rules
CREATE TABLE IF NOT EXISTS ip_access_control (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip_address VARCHAR NOT NULL,
  ip_range VARCHAR,
  type VARCHAR NOT NULL,
  reason TEXT,
  added_by VARCHAR REFERENCES users(id),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_control_address ON ip_access_control(ip_address);

-- Security settings
-- Stores security configuration
CREATE TABLE IF NOT EXISTS security_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key VARCHAR NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  last_modified_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Security recommendations
-- System-generated security improvement suggestions
CREATE TABLE IF NOT EXISTS security_recommendations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  severity security_severity NOT NULL,
  category VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  implementation_guide TEXT,
  dismissed_by VARCHAR REFERENCES users(id),
  dismissed_at TIMESTAMP,
  dismissal_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rate limit violations
-- Tracks rate limit violations
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip_address VARCHAR NOT NULL,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  endpoint VARCHAR NOT NULL,
  violation_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  window_end TIMESTAMP,
  blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON rate_limit_violations(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on user-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gardens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plant_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_doctor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Note: Since we're using HTTP API (not direct database connection),
-- these RLS policies are primarily for defense-in-depth.
-- The actual authorization happens in the Express backend.

-- Users can only see their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid()::text = id OR auth.uid() IS NULL);

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Users can only access their own gardens
CREATE POLICY gardens_select_own ON gardens
  FOR SELECT USING (auth.uid()::text = user_id OR auth.uid() IS NULL);

CREATE POLICY gardens_insert_own ON gardens
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY gardens_update_own ON gardens
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY gardens_delete_own ON gardens
  FOR DELETE USING (auth.uid()::text = user_id);

-- Users can only access their own plant collections
CREATE POLICY user_plants_select_own ON user_plant_collections
  FOR SELECT USING (auth.uid()::text = user_id OR auth.uid() IS NULL);

CREATE POLICY user_plants_insert_own ON user_plant_collections
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY user_plants_update_own ON user_plant_collections
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY user_plants_delete_own ON user_plant_collections
  FOR DELETE USING (auth.uid()::text = user_id);

-- Garden plants access through garden ownership
CREATE POLICY garden_plants_select ON garden_plants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND (gardens.user_id = auth.uid()::text OR auth.uid() IS NULL)
    )
  );

CREATE POLICY garden_plants_insert ON garden_plants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND gardens.user_id = auth.uid()::text
    )
  );

CREATE POLICY garden_plants_update ON garden_plants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND gardens.user_id = auth.uid()::text
    )
  );

CREATE POLICY garden_plants_delete ON garden_plants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gardens 
      WHERE gardens.id = garden_plants.garden_id 
      AND gardens.user_id = auth.uid()::text
    )
  );

-- Plant doctor sessions
CREATE POLICY plant_doctor_select_own ON plant_doctor_sessions
  FOR SELECT USING (auth.uid()::text = user_id OR auth.uid() IS NULL);

CREATE POLICY plant_doctor_insert_own ON plant_doctor_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Design generations
CREATE POLICY design_gen_select_own ON design_generations
  FOR SELECT USING (auth.uid()::text = user_id OR auth.uid() IS NULL);

CREATE POLICY design_gen_insert_own ON design_generations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- File vault
CREATE POLICY file_vault_select_own ON file_vault
  FOR SELECT USING (auth.uid()::text = user_id OR auth.uid() IS NULL);

CREATE POLICY file_vault_insert_own ON file_vault
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY file_vault_delete_own ON file_vault
  FOR DELETE USING (auth.uid()::text = user_id);

-- Active sessions
CREATE POLICY active_sessions_select_own ON active_sessions
  FOR SELECT USING (auth.uid()::text = user_id OR auth.uid() IS NULL);

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

-- Add update triggers to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
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
-- GRANT PERMISSIONS (for Supabase service role)
-- =============================================

-- Grant all permissions to authenticated users for reading plants
-- (Plants are public data, not user-specific)
GRANT SELECT ON plants TO authenticated;
GRANT SELECT ON climate_data TO authenticated;

-- Grant permissions to service role (used by backend)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================
-- END OF SCHEMA
-- =============================================

-- Note: After running this script, you may need to:
-- 1. Configure Supabase Auth settings in the dashboard
-- 2. Set up environment variables in your application
-- 3. Configure API keys and secrets
-- 4. Set up any additional indexes based on query patterns
-- 5. Configure backup and recovery settings