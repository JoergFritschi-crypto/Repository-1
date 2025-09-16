-- =============================================================================
-- SEED DATA FOR GARDENSCAPE PRO
-- =============================================================================
-- This file contains initial seed data for development and testing
-- Run this after migrations to populate the database with sample data
-- =============================================================================

-- =============================================================================
-- SAMPLE PLANTS DATA
-- =============================================================================

-- Insert some popular garden plants for testing
INSERT INTO public.plants (
    scientific_name,
    common_name,
    description,
    type,
    lifecycle,
    watering,
    sunlight,
    maintenance,
    care_level,
    drought_tolerant,
    indoor,
    flowers,
    image_url,
    thumbnail_url
) VALUES 
(
    'Rosa hybrida',
    'Hybrid Tea Rose',
    'Classic garden roses known for their large, elegant blooms and sweet fragrance.',
    'flower',
    'perennial',
    'regular',
    '{"min": "full sun", "max": "full sun"}'::jsonb,
    'moderate',
    'intermediate',
    false,
    false,
    true,
    '/images/plants/rosa-hybrida.jpg',
    '/images/plants/rosa-hybrida-thumb.jpg'
),
(
    'Lavandula angustifolia',
    'English Lavender',
    'Fragrant herb with purple flowers, excellent for borders and aromatherapy gardens.',
    'herb',
    'perennial',
    'minimal',
    '{"min": "full sun", "max": "full sun"}'::jsonb,
    'low',
    'easy',
    true,
    false,
    true,
    '/images/plants/lavandula-angustifolia.jpg',
    '/images/plants/lavandula-angustifolia-thumb.jpg'
),
(
    'Helianthus annuus',
    'Common Sunflower',
    'Tall annual flowers that follow the sun and produce edible seeds.',
    'flower',
    'annual',
    'regular',
    '{"min": "full sun", "max": "full sun"}'::jsonb,
    'low',
    'easy',
    true,
    false,
    true,
    '/images/plants/helianthus-annuus.jpg',
    '/images/plants/helianthus-annuus-thumb.jpg'
),
(
    'Hosta plantaginea',
    'Fragrant Hosta',
    'Shade-loving perennial with large decorative leaves and fragrant white flowers.',
    'perennial',
    'perennial',
    'regular',
    '{"min": "partial shade", "max": "full shade"}'::jsonb,
    'low',
    'easy',
    false,
    false,
    true,
    '/images/plants/hosta-plantaginea.jpg',
    '/images/plants/hosta-plantaginea-thumb.jpg'
),
(
    'Ocimum basilicum',
    'Sweet Basil',
    'Popular culinary herb with aromatic leaves, essential for Italian cuisine.',
    'herb',
    'annual',
    'regular',
    '{"min": "full sun", "max": "partial sun"}'::jsonb,
    'moderate',
    'easy',
    false,
    true,
    true,
    '/images/plants/ocimum-basilicum.jpg',
    '/images/plants/ocimum-basilicum-thumb.jpg'
)
ON CONFLICT (scientific_name) DO NOTHING;

-- =============================================================================
-- SAMPLE CLIMATE ZONES
-- =============================================================================

INSERT INTO public.climate_data (
    location,
    climate_zone,
    average_temp_c,
    precipitation_mm,
    humidity_percent,
    frost_dates
) VALUES
(
    'London, UK',
    '8b',
    '{"jan": 5, "feb": 5, "mar": 7, "apr": 9, "may": 13, "jun": 16, "jul": 18, "aug": 18, "sep": 15, "oct": 11, "nov": 8, "dec": 6}'::jsonb,
    '{"jan": 55, "feb": 41, "mar": 42, "apr": 44, "may": 49, "jun": 45, "jul": 45, "aug": 50, "sep": 50, "oct": 69, "nov": 60, "dec": 55}'::jsonb,
    '{"avg": 70}'::jsonb,
    '{"last_spring": "2025-03-15", "first_fall": "2025-11-15"}'::jsonb
),
(
    'New York, USA',
    '7a',
    '{"jan": 0, "feb": 2, "mar": 6, "apr": 12, "may": 17, "jun": 22, "jul": 25, "aug": 24, "sep": 20, "oct": 14, "nov": 8, "dec": 3}'::jsonb,
    '{"jan": 93, "feb": 78, "mar": 111, "apr": 114, "may": 106, "jun": 112, "jul": 117, "aug": 113, "sep": 109, "oct": 112, "nov": 102, "dec": 102}'::jsonb,
    '{"avg": 65}'::jsonb,
    '{"last_spring": "2025-04-15", "first_fall": "2025-10-15"}'::jsonb
),
(
    'Sydney, Australia',
    '10b',
    '{"jan": 23, "feb": 23, "mar": 21, "apr": 18, "may": 15, "jun": 12, "jul": 11, "aug": 13, "sep": 15, "oct": 18, "nov": 20, "dec": 22}'::jsonb,
    '{"jan": 100, "feb": 110, "mar": 130, "apr": 130, "may": 120, "jun": 130, "jul": 100, "aug": 80, "sep": 70, "oct": 75, "nov": 85, "dec": 80}'::jsonb,
    '{"avg": 65}'::jsonb,
    '{"last_spring": "2025-07-01", "first_fall": "2025-05-15"}'::jsonb
)
ON CONFLICT (location) DO NOTHING;

-- =============================================================================
-- SAMPLE SECURITY SETTINGS
-- =============================================================================

INSERT INTO public.security_settings (key, value, description) VALUES
('max_login_attempts', '{"value": 5}'::jsonb, 'Maximum number of failed login attempts before lockout'),
('lockout_duration_minutes', '{"value": 30}'::jsonb, 'Duration in minutes for account lockout after max failed attempts'),
('session_timeout_minutes', '{"value": 60}'::jsonb, 'Session timeout in minutes of inactivity'),
('password_min_length', '{"value": 8}'::jsonb, 'Minimum password length requirement'),
('require_2fa', '{"value": false}'::jsonb, 'Whether two-factor authentication is required'),
('allowed_email_domains', '{"value": []}'::jsonb, 'List of allowed email domains for registration (empty = all allowed)')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- DEVELOPMENT NOTICE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sample plants: 5';
    RAISE NOTICE 'Climate zones: 3';
    RAISE NOTICE 'Security settings: 6';
    RAISE NOTICE '';
    RAISE NOTICE 'To add production data:';
    RAISE NOTICE '1. Create additional seed files in supabase/seeds/';
    RAISE NOTICE '2. Reference them in config.toml';
    RAISE NOTICE '========================================';
END $$;