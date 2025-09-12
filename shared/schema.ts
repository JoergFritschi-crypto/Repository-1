import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User tier enum
export const userTierEnum = pgEnum("user_tier", [
  "free",
  "pay_per_design", 
  "premium"
]);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"),
  userTier: userTierEnum("user_tier").default("free"),
  designCredits: integer("design_credits").default(1), // For pay-per-design users
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Garden shape enum
export const gardenShapeEnum = pgEnum("garden_shape", [
  "rectangle",
  "square",
  "circle", 
  "oval",
  "triangle",
  "l_shaped",
  "r_shaped"
]);

// Slope direction enum
export const slopeDirectionEnum = pgEnum("slope_direction", [
  "N", "NE", "E", "SE", "S", "SW", "W", "NW"
]);

// Sun exposure enum
export const sunExposureEnum = pgEnum("sun_exposure", [
  "full_sun",
  "partial_sun", 
  "partial_shade",
  "full_shade"
]);

// Soil type enum
export const soilTypeEnum = pgEnum("soil_type", [
  "clay",
  "loam",
  "sand",
  "silt",
  "chalk"
]);

// Gardens table
export const gardens = pgTable("gardens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  location: varchar("location").notNull(),
  units: varchar("units").notNull().default("metric"), // metric or imperial
  shape: gardenShapeEnum("shape").notNull(),
  dimensions: jsonb("dimensions").notNull(), // flexible storage for different shape parameters
  slopePercentage: decimal("slope_percentage", { precision: 5, scale: 2 }),
  slopeDirection: slopeDirectionEnum("slope_direction"),
  sunExposure: sunExposureEnum("sun_exposure"),
  soilType: soilTypeEnum("soil_type"),
  soilPh: decimal("soil_ph", { precision: 3, scale: 1 }),
  hasSoilAnalysis: boolean("has_soil_analysis").default(false),
  soilAnalysis: jsonb("soil_analysis"), // Professional soil test results
  hardiness_zone: varchar("hardiness_zone"),
  usdaZone: varchar("usda_zone"),
  rhsZone: varchar("rhs_zone"),
  hardinessCategory: varchar("hardiness_category"),
  climate_data: jsonb("climate_data"),
  preferences: jsonb("preferences"), // colors, plant types, bloom times, safety requirements
  design_approach: varchar("design_approach").default("ai"), // ai, manual, hybrid
  layout_data: jsonb("layout_data"), // canvas design data
  ai_generated: boolean("ai_generated").default(false),
  status: varchar("status").default("draft"), // draft, completed, exported
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plants table - Based on botanical naming (genus, species, cultivar)
export const plants = pgTable("plants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  perenualId: integer("perenual_id").unique(), // Perenual's ID for reference
  externalId: varchar("external_id").unique(), // External source ID (e.g., firecrawl URL)
  
  // Core botanical identity - THE PRIMARY FOCUS OF THE APP
  scientificName: varchar("scientific_name").notNull().unique(), // Full botanical name
  genus: varchar("genus").notNull(), // First part of botanical name
  species: varchar("species"), // Second part of botanical name  
  cultivar: varchar("cultivar"), // Third part if exists (cultivar or variety)
  commonName: varchar("common_name").notNull(),
  family: varchar("family"),
  
  // Basic characteristics
  type: varchar("type"), // annuals, perennials, herbaceous perennials, biennials, shrubs, ornamental trees, bulbs, climbers, ground covers, ornamental grasses, herbs-medicinal, herbs-culinary, succulents, cacti, aquatic plants, ferns, alpine rock garden plants
  dimension: jsonb("dimension"), // {height: {min, max}, spread: {min, max}} - DEPRECATED - kept for backward compatibility
  
  // Numeric dimensions for proper filtering and garden design (metric as primary, imperial as secondary)
  heightMinCm: integer("height_min_cm"), // Minimum height in centimeters
  heightMaxCm: integer("height_max_cm"), // Maximum height in centimeters
  spreadMinCm: integer("spread_min_cm"), // Minimum spread in centimeters (for garden design circles)
  spreadMaxCm: integer("spread_max_cm"), // Maximum spread in centimeters (for garden design circles)
  heightMinInches: integer("height_min_inches"), // Minimum height in inches
  heightMaxInches: integer("height_max_inches"), // Maximum height in inches
  spreadMinInches: integer("spread_min_inches"), // Minimum spread in inches
  spreadMaxInches: integer("spread_max_inches"), // Maximum spread in inches
  
  cycle: varchar("cycle"), // Growth cycle
  foliage: varchar("foliage"), // variegated, deciduous, evergreen
  
  // Growing conditions - detailed for gardener advice
  hardiness: varchar("hardiness"), // Hardiness zones
  hardinessLocation: jsonb("hardiness_location"), // v2 API - Location-specific hardiness info
  sunlight: jsonb("sunlight"), // Their 4-tiered system as array
  soil: jsonb("soil"), // Soil requirements
  soilPH: varchar("soil_ph"), // Preferred soil pH: acidic, neutral, alkaline
  watering: varchar("watering"), // Basic watering needs
  wateringGeneralBenchmark: jsonb("watering_general_benchmark"), // Detailed frequency
  wateringPeriod: varchar("watering_period"), // When to water
  depthWaterRequirement: jsonb("depth_water_requirement"), // How deep
  volumeWaterRequirement: jsonb("volume_water_requirement"), // How much
  
  // Plant characteristics
  growthRate: varchar("growth_rate"),
  droughtTolerant: boolean("drought_tolerant").default(false),
  saltTolerant: boolean("salt_tolerant").default(false),
  thorny: boolean("thorny").default(false),
  tropical: boolean("tropical").default(false),
  invasive: boolean("invasive").default(false), // v2 API field
  indoor: boolean("indoor").default(false), // v2 API field - suitable for indoor growing
  careLevel: varchar("care_level"), // Easy, moderate, hard
  maintenance: varchar("maintenance"), // Low, moderate, high
  
  // Availability scoring fields
  baseAvailabilityScore: integer("base_availability_score"), // 1-10, inherent ease of cultivation
  cultivationDifficulty: varchar("cultivation_difficulty"), // easy, moderate, difficult
  propagationMethod: varchar("propagation_method"), // seed, cutting, division, tissue-culture
  commercialProduction: varchar("commercial_production"), // mass, specialty, rare, collector
  climateAdaptability: integer("climate_adaptability"), // 1-5, how widely it can be grown
  regionalAvailability: jsonb("regional_availability"), // {europe: {score, suppliers, lastSeen}, northAmerica: {...}}
  
  // Appearance
  leaf: jsonb("leaf"), // Leaf information
  leafColor: jsonb("leaf_color"), // Array of colors
  flowerColor: jsonb("flower_color"), // Array of colors - v2 provides actual colors
  floweringSeason: varchar("flowering_season"), // When it blooms
  fruitColor: jsonb("fruit_color"), // v2 API - Array of fruit colors
  harvestSeason: varchar("harvest_season"), // v2 API - When to harvest fruit
  bloomStartMonth: integer("bloom_start_month"), // 1-12 (January-December)
  bloomEndMonth: integer("bloom_end_month"), // 1-12 (January-December)
  
  // Safety - VERY IMPORTANT - Using RHS/HTA 3-tier classification
  toxicityCategory: varchar("toxicity_category").default("low"), // high, moderate, low
  toxicityToHumans: varchar("toxicity_to_humans").default("low"), // high, moderate, low  
  toxicityToPets: varchar("toxicity_to_pets").default("low"), // high, moderate, low
  toxicityNotes: text("toxicity_notes"), // Specific toxicity information
  childSafe: boolean("child_safe").default(true), // Quick reference for families
  petSafe: boolean("pet_safe").default(true), // Quick reference for pet owners
  edibleFruit: boolean("edible_fruit").default(false), // v2 API - Has edible fruit
  edibleLeaf: boolean("edible_leaf").default(false), // v2 API - Has edible leaves
  cuisine: boolean("cuisine").default(false), // Culinary uses
  medicinal: boolean("medicinal").default(false), // Medicinal uses
  // Legacy toxicity fields - kept for backward compatibility but deprecated
  poisonousToHumans: integer("poisonous_to_humans").default(0), // DEPRECATED - use toxicityToHumans
  poisonousToPets: integer("poisonous_to_pets").default(0), // DEPRECATED - use toxicityToPets
  
  // Garden information
  attracts: jsonb("attracts"), // What it attracts (butterflies, birds, etc.)
  propagation: jsonb("propagation"), // How to propagate
  resistance: jsonb("resistance"), // v2 API - Disease/pest resistance
  problem: jsonb("problem"), // v2 API - Common problems
  pruningMonth: jsonb("pruning_month"), // Array of months
  pruningCount: jsonb("pruning_count"), // Frequency info
  seeds: integer("seeds"), // Seed count/info
  pestSusceptibility: jsonb("pest_susceptibility"), // Common pests array
  pestSusceptibilityApi: varchar("pest_susceptibility_api"), // API endpoint
  
  // Content and guides
  description: text("description"), // Full plant description
  careGuides: varchar("care_guides"), // URL to care guides
  
  // Image generation fields
  thumbnailImage: varchar("thumbnail_image"), // Card thumbnail
  fullImage: varchar("full_image"), // Full plant view
  detailImage: varchar("detail_image"), // Detailed closeup view
  imageGenerationStatus: varchar("image_generation_status").default("pending"), // pending, queued, generating, completed, failed, stuck
  imageGenerationStartedAt: timestamp("image_generation_started_at"),
  imageGenerationCompletedAt: timestamp("image_generation_completed_at"),
  imageGenerationError: text("image_generation_error"),
  imageGenerationAttempts: integer("image_generation_attempts").default(0),
  lastImageGenerationAt: timestamp("last_image_generation_at"),
  
  // System fields
  generatedImageUrl: varchar("generated_image_url"), // Legacy field, kept for compatibility
  dataSource: varchar("data_source").default("perenual"), // perenual, manual, etc.
  importedAt: timestamp("imported_at"),
  verificationStatus: varchar("verification_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User plant collections
export const userPlantCollections = pgTable("user_plant_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  plantId: varchar("plant_id").notNull().references(() => plants.id),
  notes: text("notes"),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Garden plants (plants used in specific garden designs)
export const gardenPlants = pgTable("garden_plants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gardenId: varchar("garden_id").notNull().references(() => gardens.id),
  plantId: varchar("plant_id").notNull().references(() => plants.id),
  position_x: decimal("position_x", { precision: 10, scale: 2 }),
  position_y: decimal("position_y", { precision: 10, scale: 2 }),
  quantity: integer("quantity").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Plant doctor sessions (for identification and diagnosis)
export const plantDoctorSessions = pgTable("plant_doctor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionType: varchar("session_type").notNull(), // identification, disease, weed
  imageUrl: varchar("image_url"),
  aiAnalysis: jsonb("ai_analysis"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  identifiedPlantId: varchar("identified_plant_id").references(() => plants.id),
  userFeedback: jsonb("user_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Design generation tracking for user tier limits
export const designGenerations = pgTable("design_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  gardenId: varchar("garden_id").references(() => gardens.id),
  styleId: varchar("style_id").notNull(), // Garden style used
  generationType: varchar("generation_type").notNull(), // initial, iteration
  success: boolean("success").default(false),
  errorMessage: text("error_message"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Climate data cache
export const climateData = pgTable("climate_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  location: varchar("location").notNull().unique(),
  hardiness_zone: varchar("hardiness_zone"),
  usda_zone: varchar("usda_zone"),
  rhs_zone: varchar("rhs_zone"),
  ahs_heat_zone: integer("ahs_heat_zone"),
  koppen_climate: varchar("koppen_climate"),
  hardiness_category: varchar("hardiness_category"),
  temperature_range: varchar("temperature_range"),
  annual_rainfall: decimal("annual_rainfall", { precision: 7, scale: 2 }),
  avg_temp_min: decimal("avg_temp_min", { precision: 5, scale: 2 }),
  avg_temp_max: decimal("avg_temp_max", { precision: 5, scale: 2 }),
  avg_humidity: decimal("avg_humidity", { precision: 5, scale: 2 }),
  avg_wind_speed: decimal("avg_wind_speed", { precision: 5, scale: 2 }),
  sunshine_percent: decimal("sunshine_percent", { precision: 5, scale: 2 }),
  wettest_month: varchar("wettest_month"),
  wettest_month_precip: decimal("wettest_month_precip", { precision: 7, scale: 2 }),
  driest_month: varchar("driest_month"),
  driest_month_precip: decimal("driest_month_precip", { precision: 7, scale: 2 }),
  monthly_precip_pattern: jsonb("monthly_precip_pattern"),
  frost_dates: jsonb("frost_dates"), // first and last frost dates
  growing_season: jsonb("growing_season"),
  monthly_data: jsonb("monthly_data"),
  gardening_advice: text("gardening_advice"),
  data_source: varchar("data_source").default("visual_crossing"),
  data_range: jsonb("data_range"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Image generation queue for managing bulk generation with rate limiting
export const imageGenerationQueue = pgTable("image_generation_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plantId: varchar("plant_id").notNull().references(() => plants.id),
  imageType: varchar("image_type").notNull(), // thumbnail, full, detail
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  priority: integer("priority").default(0), // Higher priority = processed first
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  errorMessage: text("error_message"),
  generatedImagePath: varchar("generated_image_path"),
  scheduledFor: timestamp("scheduled_for"), // When to process this item
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API health monitoring
export const apiHealthChecks = pgTable("api_health_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service").notNull(), // anthropic, perplexity, gemini, etc.
  status: varchar("status").notNull(), // healthy, degraded, down
  responseTime: integer("response_time"), // in milliseconds
  errorMessage: text("error_message"),
  quotaUsed: integer("quota_used"),
  quotaLimit: integer("quota_limit"),
  lastChecked: timestamp("last_checked").defaultNow(),
  metadata: jsonb("metadata"), // additional service-specific data
});

// File vault for storing user reports, designs, and images with tier-based retention
export const fileVault = pgTable("file_vault", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(), // climate_report, garden_design, garden_image, plant_report
  contentType: varchar("content_type").notNull(), // json, pdf, image, html
  filePath: varchar("file_path").notNull(),
  metadata: jsonb("metadata"),
  expiresAt: timestamp("expires_at"), // null means permanent
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scraping progress tracking table
export const scrapingProgress = pgTable("scraping_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: varchar("url").notNull().unique(),
  status: varchar("status").notNull().default("in_progress"), // 'in_progress', 'completed', 'failed'
  totalBatches: integer("total_batches").default(0),
  completedBatches: integer("completed_batches").default(0),
  totalPlants: integer("total_plants").default(0),
  savedPlants: integer("saved_plants").default(0),
  duplicatePlants: integer("duplicate_plants").default(0),
  failedPlants: integer("failed_plants").default(0),
  lastProductUrl: varchar("last_product_url"), // Last successfully processed product URL to resume from
  productUrls: jsonb("product_urls"), // Store all product URLs found
  errors: jsonb("errors"), // Store any errors encountered
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API usage statistics
export const apiUsageStats = pgTable("api_usage_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service").notNull(),
  endpoint: varchar("endpoint"),
  userId: varchar("user_id").references(() => users.id),
  requestCount: integer("request_count").default(1),
  tokensUsed: integer("tokens_used"),
  cost: decimal("cost", { precision: 10, scale: 4 }),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Alert configurations
export const apiAlerts = pgTable("api_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service").notNull(),
  alertType: varchar("alert_type").notNull(), // quota_warning, service_down, slow_response
  threshold: integer("threshold"),
  isActive: boolean("is_active").default(true),
  lastTriggered: timestamp("last_triggered"),
  notificationsSent: integer("notifications_sent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Garden = typeof gardens.$inferSelect;
export type InsertGarden = typeof gardens.$inferInsert;
export type Plant = typeof plants.$inferSelect;
export type InsertPlant = typeof plants.$inferInsert;
export type UserPlantCollection = typeof userPlantCollections.$inferSelect;
export type InsertUserPlantCollection = typeof userPlantCollections.$inferInsert;
export type GardenPlant = typeof gardenPlants.$inferSelect;
export type InsertGardenPlant = typeof gardenPlants.$inferInsert;
export type PlantDoctorSession = typeof plantDoctorSessions.$inferSelect;
export type InsertPlantDoctorSession = typeof plantDoctorSessions.$inferInsert;
export type DesignGeneration = typeof designGenerations.$inferSelect;
export type InsertDesignGeneration = typeof designGenerations.$inferInsert;
export type ClimateData = typeof climateData.$inferSelect;
export type InsertClimateData = typeof climateData.$inferInsert;
export type ApiHealthCheck = typeof apiHealthChecks.$inferSelect;
export type InsertApiHealthCheck = typeof apiHealthChecks.$inferInsert;
export type ApiUsageStat = typeof apiUsageStats.$inferSelect;
export type InsertApiUsageStat = typeof apiUsageStats.$inferInsert;
export type ApiAlert = typeof apiAlerts.$inferSelect;
export type InsertApiAlert = typeof apiAlerts.$inferInsert;
export type ImageGenerationQueue = typeof imageGenerationQueue.$inferSelect;
export type InsertImageGenerationQueue = typeof imageGenerationQueue.$inferInsert;
export type FileVault = typeof fileVault.$inferSelect;
export type InsertFileVault = typeof fileVault.$inferInsert;
export type ScrapingProgress = typeof scrapingProgress.$inferSelect;
export type InsertScrapingProgress = typeof scrapingProgress.$inferInsert;

// Schema exports for validation
export const insertGardenSchema = createInsertSchema(gardens);
export const insertPlantSchema = createInsertSchema(plants);
export const insertUserPlantCollectionSchema = createInsertSchema(userPlantCollections);
export const insertGardenPlantSchema = createInsertSchema(gardenPlants);
export const insertPlantDoctorSessionSchema = createInsertSchema(plantDoctorSessions);
export const insertDesignGenerationSchema = createInsertSchema(designGenerations);
export const insertClimateDataSchema = createInsertSchema(climateData);
export const insertApiHealthCheckSchema = createInsertSchema(apiHealthChecks);
export const insertApiUsageStatSchema = createInsertSchema(apiUsageStats);
export const insertApiAlertSchema = createInsertSchema(apiAlerts);
export const insertImageGenerationQueueSchema = createInsertSchema(imageGenerationQueue);
export const insertFileVaultSchema = createInsertSchema(fileVault);
export const insertScrapingProgressSchema = createInsertSchema(scrapingProgress);

// ===========================
// 3D GARDEN SCENE SCHEMA
// ===========================

/**
 * Comprehensive 3D Garden Scene Schema
 * Converts 2D canvas layout data and orientation settings into precise 3D scene parameters
 * for geometrically-perfect Three.js rendering.
 */

// 3D Vector interface for positions and dimensions
export interface Vector3D {
  x: number; // meters
  y: number; // meters  
  z: number; // meters (height/elevation)
}

// Garden boundary shape definitions in 3D space
export interface GardenBounds {
  // Shape type from existing garden shapes enum
  shape: 'rectangle' | 'square' | 'circle' | 'oval' | 'triangle' | 'l_shaped' | 'r_shaped';
  
  // Bounding box in world coordinates (meters)
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number; // ground level
  maxZ: number; // highest point
  
  // Center point of the garden
  center: Vector3D;
  
  // Shape-specific boundary data for precise collision detection
  boundaryGeometry: {
    // For rectangles/squares: corners
    corners?: Vector3D[];
    // For circles: center + radius
    radius?: number;
    // For ovals: center + radii
    radiusX?: number;
    radiusY?: number;
    // For complex shapes: vertex array
    vertices?: Vector3D[];
  };
  
  // Garden dimensions in original units for reference
  originalDimensions: Record<string, number>;
  originalUnits: 'metric' | 'imperial';
}

// 3D Plant instance with precise positioning and characteristics
export interface PlantInstance3D {
  // Identification
  id: string;
  plantId: string; // Reference to plant in database
  plantName: string;
  scientificName?: string;
  
  // 3D Position in world coordinates (meters)
  position: Vector3D;
  
  // Original 2D canvas position (for reference/debugging)
  originalPosition: {
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
  };
  
  // Plant physical characteristics in meters
  dimensions: {
    heightMin: number; // meters
    heightMax: number; // meters
    heightCurrent: number; // meters (for current season/growth stage)
    spreadMin: number; // meters (radius)
    spreadMax: number; // meters (radius)
    spreadCurrent: number; // meters (radius)
  };
  
  // Plant properties for rendering
  properties: {
    type?: string; // tree, shrub, perennial, etc.
    flowerColor?: string;
    leafColor?: string;
    plantType?: string;
    quantity: number; // Number of plants at this position
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    maturity: 'young' | 'mature' | 'old'; // Affects size/appearance
  };
  
  // Growing conditions for realistic rendering
  conditions: {
    sunExposure?: 'full_sun' | 'partial_sun' | 'partial_shade' | 'full_shade';
    soilMoisture?: 'dry' | 'normal' | 'moist' | 'wet';
    microclimate?: string; // Special local conditions
  };
}

// Camera configuration derived from orientation settings
export interface CameraParameters {
  // Camera position in world coordinates
  position: Vector3D;
  
  // Camera target (where it's looking)
  target: Vector3D;
  
  // Camera orientation
  up: Vector3D; // Up vector (usually 0,0,1)
  
  // Viewing parameters
  fov: number; // Field of view in degrees
  aspect: number; // Aspect ratio
  near: number; // Near clipping plane
  far: number; // Far clipping plane
  
  // Original orientation data for reference
  originalSettings: {
    cardinalRotation: number; // degrees (north direction)
    viewerRotation: number; // degrees (viewer perspective)
    gardenCenter: Vector3D; // Center point being viewed
    viewingDistance: number; // Distance from garden center
    viewingHeight: number; // Height above ground
  };
}

// Lighting configuration based on cardinal orientation and time
export interface LightingParameters {
  // Sun position and characteristics
  sun: {
    position: Vector3D; // Sun position in world coordinates
    direction: Vector3D; // Light direction (normalized)
    intensity: number; // Light intensity (0-1)
    color: string; // Hex color
    shadowIntensity: number; // Shadow strength (0-1)
  };
  
  // Ambient lighting
  ambient: {
    intensity: number; // Overall ambient light (0-1)
    color: string; // Hex color
  };
  
  // Time and orientation settings
  timeOfDay: {
    hour: number; // 0-23 (24-hour format)
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    latitude?: number; // For accurate sun calculation
    longitude?: number;
  };
  
  // Cardinal orientation
  cardinalNorth: {
    rotation: number; // degrees from true north
    magneticDeclination?: number; // Magnetic declination if needed
  };
}

// Garden terrain and environmental data
export interface TerrainParameters {
  // Ground elevation data
  elevation: {
    baseLevel: number; // meters (base ground level)
    slope: {
      percentage: number; // 0-100
      direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
      vector: Vector3D; // Normalized slope direction
    };
    // Height map for complex terrain (optional)
    heightMap?: number[][]; // 2D array of elevation values
  };
  
  // Soil and surface materials
  surface: {
    primaryMaterial: 'soil' | 'grass' | 'mulch' | 'gravel' | 'stone' | 'concrete';
    texture?: string; // Texture reference for rendering
    color?: string; // Base color
    moisture?: number; // 0-1 (affects appearance)
  };
  
  // Environmental conditions
  environment: {
    windDirection?: Vector3D; // For plant animation
    windSpeed?: number; // m/s
    humidity?: number; // 0-1
    temperature?: number; // Celsius
  };
}

// Complete 3D Garden Scene definition
export interface GardenScene3D {
  // Garden identification
  gardenId: string;
  gardenName: string;
  createdAt: Date;
  lastUpdated: Date;
  
  // Garden boundaries and shape
  bounds: GardenBounds;
  
  // All plants in the garden with 3D positioning
  plants: PlantInstance3D[];
  
  // Camera setup for viewing
  camera: CameraParameters;
  
  // Lighting configuration
  lighting: LightingParameters;
  
  // Terrain and environment
  terrain: TerrainParameters;
  
  // Rendering metadata
  renderingHints: {
    levelOfDetail: 'low' | 'medium' | 'high' | 'ultra';
    renderDistance: number; // meters
    shadowQuality: 'low' | 'medium' | 'high';
    weatherEffects?: boolean;
    seasonalVariation?: boolean;
  };
  
  // Original 2D data for reference and debugging
  originalData: {
    canvasSize: { width: number; height: number };
    gardenDimensions: Record<string, number>;
    units: 'metric' | 'imperial';
    placedPlants: PlacedPlant[]; // Original 2D placement data
    orientationSettings: {
      cardinalRotation: number;
      viewerRotation: number;
    };
  };
}

// Interface for the PlacedPlant (from existing code)
export interface PlacedPlant {
  id: string;
  plantId: string;
  plantName: string;
  scientificName?: string;
  x: number; // percentage of canvas width
  y: number; // percentage of canvas height
  quantity: number;
  plantType?: string;
  flowerColor?: string;
}

// ===========================
// COORDINATE CONVERSION FUNCTIONS
// ===========================

/**
 * Converts percentage-based 2D canvas coordinates to 3D world coordinates
 * Maintains 10x10cm grid precision as specified in requirements
 */
export function convertCanvasToWorld(
  canvasX: number, // percentage (0-100)
  canvasY: number, // percentage (0-100)
  gardenBounds: GardenBounds,
  snapToGrid: boolean = true
): Vector3D {
  // Convert percentage to normalized coordinates (0-1)
  const normalizedX = canvasX / 100;
  const normalizedY = canvasY / 100;
  
  // Convert to world coordinates within garden bounds
  const worldX = gardenBounds.minX + (normalizedX * (gardenBounds.maxX - gardenBounds.minX));
  // Flip Y coordinate: canvas Y=0 (top) → world maxY (top), canvas Y=100 (bottom) → world minY (bottom)
  const worldY = gardenBounds.maxY - (normalizedY * (gardenBounds.maxY - gardenBounds.minY));
  
  // Snap to 10x10cm grid if requested (0.1m precision)
  const finalX = snapToGrid ? Math.round(worldX * 10) / 10 : worldX;
  const finalY = snapToGrid ? Math.round(worldY * 10) / 10 : worldY;
  
  return {
    x: finalX,
    y: finalY,
    z: 0 // Ground level, will be adjusted for terrain
  };
}

/**
 * Converts garden dimensions from various shapes to standardized 3D bounds
 */
export function createGardenBounds(
  shape: string,
  dimensions: Record<string, number>,
  units: 'metric' | 'imperial'
): GardenBounds {
  // Convert to meters if needed
  const metersMultiplier = units === 'metric' ? 1 : 0.3048; // feet to meters
  
  let width: number, height: number, radius: number;
  let boundaryGeometry: GardenBounds['boundaryGeometry'] = {};
  
  switch (shape) {
    case 'rectangle':
      width = (dimensions.width || 10) * metersMultiplier;
      height = (dimensions.height || dimensions.length || 8) * metersMultiplier;
      boundaryGeometry.corners = [
        { x: -width/2, y: -height/2, z: 0 },
        { x: width/2, y: -height/2, z: 0 },
        { x: width/2, y: height/2, z: 0 },
        { x: -width/2, y: height/2, z: 0 }
      ];
      break;
      
    case 'square':
      const side = (dimensions.width || dimensions.side || 10) * metersMultiplier;
      width = height = side;
      boundaryGeometry.corners = [
        { x: -side/2, y: -side/2, z: 0 },
        { x: side/2, y: -side/2, z: 0 },
        { x: side/2, y: side/2, z: 0 },
        { x: -side/2, y: side/2, z: 0 }
      ];
      break;
      
    case 'circle':
      radius = (dimensions.radius || 5) * metersMultiplier;
      width = height = radius * 2;
      boundaryGeometry.radius = radius;
      break;
      
    case 'oval':
      const radiusX = ((dimensions.width || 8) / 2) * metersMultiplier;
      const radiusY = ((dimensions.height || dimensions.length || 6) / 2) * metersMultiplier;
      width = radiusX * 2;
      height = radiusY * 2;
      boundaryGeometry.radiusX = radiusX;
      boundaryGeometry.radiusY = radiusY;
      break;
      
    case 'l_shaped':
      // Complex shape - create vertex array
      const mainWidth = (dimensions.mainWidth || 20) * metersMultiplier;
      const mainLength = (dimensions.mainLength || 30) * metersMultiplier;
      const cutoutWidth = (dimensions.cutoutWidth || 10) * metersMultiplier;
      const cutoutLength = (dimensions.cutoutLength || 15) * metersMultiplier;
      
      width = mainWidth;
      height = mainLength;
      
      boundaryGeometry.vertices = [
        { x: -mainWidth/2, y: -mainLength/2, z: 0 },
        { x: mainWidth/2, y: -mainLength/2, z: 0 },
        { x: mainWidth/2, y: mainLength/2 - cutoutLength, z: 0 },
        { x: mainWidth/2 - cutoutWidth, y: mainLength/2 - cutoutLength, z: 0 },
        { x: mainWidth/2 - cutoutWidth, y: mainLength/2, z: 0 },
        { x: -mainWidth/2, y: mainLength/2, z: 0 }
      ];
      break;
      
    default:
      // Default to rectangle
      width = (dimensions.width || 10) * metersMultiplier;
      height = (dimensions.height || 8) * metersMultiplier;
      boundaryGeometry.corners = [
        { x: -width/2, y: -height/2, z: 0 },
        { x: width/2, y: -height/2, z: 0 },
        { x: width/2, y: height/2, z: 0 },
        { x: -width/2, y: height/2, z: 0 }
      ];
  }
  
  return {
    shape: shape as GardenBounds['shape'],
    minX: -width / 2,
    maxX: width / 2,
    minY: -height / 2,
    maxY: height / 2,
    minZ: 0,
    maxZ: 5, // Assume max 5m height for plants
    center: { x: 0, y: 0, z: 2.5 },
    boundaryGeometry,
    originalDimensions: dimensions,
    originalUnits: units
  };
}

/**
 * Converts cardinal and viewer rotations to camera parameters
 * cardinalRotation: degrees from default north (lighting direction)
 * viewerRotation: degrees for viewer perspective (camera position)
 */
export function createCameraParameters(
  cardinalRotation: number,
  viewerRotation: number,
  gardenBounds: GardenBounds,
  viewingDistance: number = 15, // meters from garden center
  viewingHeight: number = 5 // meters above ground
): CameraParameters {
  const gardenCenter = gardenBounds.center;
  
  // Convert viewer rotation to radians (0° = south, 90° = west, etc.)
  const viewerAngleRad = (viewerRotation * Math.PI) / 180;
  
  // Calculate camera position around garden center
  const cameraX = gardenCenter.x + viewingDistance * Math.sin(viewerAngleRad);
  const cameraY = gardenCenter.y + viewingDistance * Math.cos(viewerAngleRad);
  const cameraZ = viewingHeight;
  
  // Calculate field of view based on garden size
  const gardenSize = Math.max(
    gardenBounds.maxX - gardenBounds.minX,
    gardenBounds.maxY - gardenBounds.minY
  );
  const fov = Math.max(35, Math.min(75, (gardenSize / viewingDistance) * 30));
  
  return {
    position: { x: cameraX, y: cameraY, z: cameraZ },
    target: gardenCenter,
    up: { x: 0, y: 0, z: 1 }, // Z-up coordinate system
    fov,
    aspect: 16 / 9, // Default aspect ratio
    near: 0.1,
    far: viewingDistance * 3,
    originalSettings: {
      cardinalRotation,
      viewerRotation,
      gardenCenter,
      viewingDistance,
      viewingHeight
    }
  };
}

/**
 * Creates lighting parameters based on cardinal rotation and time settings
 */
export function createLightingParameters(
  cardinalRotation: number,
  timeOfDay: number = 14, // 2 PM default
  season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer',
  latitude: number = 45 // Default latitude
): LightingParameters {
  // Calculate sun position based on time and season
  const hourAngle = (timeOfDay - 12) * 15; // degrees from solar noon
  
  // Season affects sun elevation
  const seasonalOffset = {
    spring: 0,
    summer: 23.5,
    autumn: 0,
    winter: -23.5
  }[season];
  
  const sunElevation = Math.max(10, 90 - Math.abs(latitude) + seasonalOffset);
  
  // Convert to radians and apply cardinal rotation
  const azimuthRad = ((hourAngle + cardinalRotation) * Math.PI) / 180;
  const elevationRad = (sunElevation * Math.PI) / 180;
  
  // Calculate sun position (high in sky, positioned based on time and north direction)
  const sunDistance = 1000; // Far away for parallel light
  const sunX = sunDistance * Math.sin(azimuthRad) * Math.cos(elevationRad);
  const sunY = sunDistance * Math.cos(azimuthRad) * Math.cos(elevationRad);
  const sunZ = sunDistance * Math.sin(elevationRad);
  
  // Sun intensity based on elevation
  const sunIntensity = Math.max(0.3, Math.sin(elevationRad));
  
  return {
    sun: {
      position: { x: sunX, y: sunY, z: sunZ },
      direction: { 
        x: -Math.sin(azimuthRad) * Math.cos(elevationRad),
        y: -Math.cos(azimuthRad) * Math.cos(elevationRad),
        z: -Math.sin(elevationRad)
      },
      intensity: sunIntensity,
      color: '#fff5e6', // Warm sunlight
      shadowIntensity: 0.7
    },
    ambient: {
      intensity: 0.4,
      color: '#87ceeb' // Sky blue ambient
    },
    timeOfDay: {
      hour: timeOfDay,
      season,
      latitude
    },
    cardinalNorth: {
      rotation: cardinalRotation
    }
  };
}

/**
 * Converts a PlacedPlant from 2D canvas to PlantInstance3D
 */
export function convertPlantTo3D(
  placedPlant: PlacedPlant,
  plant: Plant,
  gardenBounds: GardenBounds,
  season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer',
  maturity: 'young' | 'mature' | 'old' = 'mature'
): PlantInstance3D {
  // Convert 2D position to 3D world coordinates
  const worldPosition = convertCanvasToWorld(
    placedPlant.x,
    placedPlant.y,
    gardenBounds,
    true // Snap to 10cm grid
  );
  
  // Convert plant dimensions from cm to meters
  const heightMin = (plant.heightMinCm || 30) / 100;
  const heightMax = (plant.heightMaxCm || 100) / 100;
  const spreadMin = (plant.spreadMinCm || 20) / 100;
  const spreadMax = (plant.spreadMaxCm || 60) / 100;
  
  // Calculate current dimensions based on season and maturity
  const maturityFactor = maturity === 'young' ? 0.6 : maturity === 'old' ? 1.2 : 1.0;
  const seasonalFactor = season === 'spring' ? 0.8 : season === 'summer' ? 1.0 : 
                        season === 'autumn' ? 0.9 : 0.7; // winter
  
  const heightCurrent = (heightMin + (heightMax - heightMin) * 0.7) * maturityFactor * seasonalFactor;
  const spreadCurrent = (spreadMin + (spreadMax - spreadMin) * 0.7) * maturityFactor;
  
  return {
    id: placedPlant.id,
    plantId: placedPlant.plantId,
    plantName: placedPlant.plantName,
    scientificName: placedPlant.scientificName,
    position: worldPosition,
    originalPosition: {
      x: placedPlant.x,
      y: placedPlant.y
    },
    dimensions: {
      heightMin,
      heightMax,
      heightCurrent,
      spreadMin,
      spreadMax,
      spreadCurrent
    },
    properties: {
      type: plant.type,
      flowerColor: placedPlant.flowerColor,
      leafColor: Array.isArray(plant.leafColor) ? plant.leafColor[0] : plant.leafColor,
      plantType: placedPlant.plantType,
      quantity: placedPlant.quantity,
      season,
      maturity
    },
    conditions: {
      sunExposure: 'full_sun', // Default, could be calculated based on position
      soilMoisture: 'normal'
    }
  };
}

/**
 * Main conversion function: Creates complete 3D scene from 2D garden data
 */
export function createGardenScene3D(
  gardenData: {
    gardenId: string;
    gardenName: string;
    shape: string;
    dimensions: Record<string, number>;
    units: 'metric' | 'imperial';
    placedPlants: PlacedPlant[];
    plants: Plant[]; // Plant database entries
    orientationSettings: {
      cardinalRotation: number;
      viewerRotation: number;
    };
    environmentSettings?: {
      season?: 'spring' | 'summer' | 'autumn' | 'winter';
      timeOfDay?: number;
      slopePercentage?: number;
      slopeDirection?: string;
      latitude?: number;
    };
  }
): GardenScene3D {
  const { 
    gardenId, 
    gardenName, 
    shape, 
    dimensions, 
    units, 
    placedPlants, 
    plants,
    orientationSettings,
    environmentSettings = {}
  } = gardenData;
  
  const {
    season = 'summer',
    timeOfDay = 14,
    slopePercentage = 0,
    slopeDirection = 'S',
    latitude = 45
  } = environmentSettings;
  
  // Create garden bounds
  const bounds = createGardenBounds(shape, dimensions, units);
  
  // Convert plants to 3D
  const plantsMap = new Map(plants.map(p => [p.id, p]));
  const plants3D = placedPlants.map(pp => {
    const plant = plantsMap.get(pp.plantId);
    if (!plant) {
      throw new Error(`Plant not found: ${pp.plantId}`);
    }
    return convertPlantTo3D(pp, plant, bounds, season);
  });
  
  // Create camera parameters
  const camera = createCameraParameters(
    orientationSettings.cardinalRotation,
    orientationSettings.viewerRotation,
    bounds
  );
  
  // Create lighting
  const lighting = createLightingParameters(
    orientationSettings.cardinalRotation,
    timeOfDay,
    season,
    latitude
  );
  
  // Create terrain
  const slopeDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const slopeIndex = slopeDirections.indexOf(slopeDirection as any) || 4; // Default to South
  const slopeAngle = slopeIndex * 45; // degrees
  const slopeRad = (slopeAngle * Math.PI) / 180;
  
  const terrain: TerrainParameters = {
    elevation: {
      baseLevel: 0,
      slope: {
        percentage: slopePercentage || 0,
        direction: slopeDirection as any || 'S',
        vector: {
          x: Math.sin(slopeRad) * (slopePercentage / 100),
          y: Math.cos(slopeRad) * (slopePercentage / 100),
          z: 1
        }
      }
    },
    surface: {
      primaryMaterial: 'soil',
      color: '#8b4513',
      moisture: 0.5
    },
    environment: {
      windDirection: { x: 0.1, y: 0.2, z: 0 },
      windSpeed: 2,
      humidity: 0.6,
      temperature: 20
    }
  };
  
  return {
    gardenId,
    gardenName,
    createdAt: new Date(),
    lastUpdated: new Date(),
    bounds,
    plants: plants3D,
    camera,
    lighting,
    terrain,
    renderingHints: {
      levelOfDetail: 'high',
      renderDistance: 50,
      shadowQuality: 'high',
      weatherEffects: true,
      seasonalVariation: true
    },
    originalData: {
      canvasSize: { width: 1200, height: 800 }, // Default canvas size
      gardenDimensions: dimensions,
      units,
      placedPlants,
      orientationSettings
    }
  };
}
