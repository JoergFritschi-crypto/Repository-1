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
  
  // Core botanical identity - THE PRIMARY FOCUS OF THE APP
  scientificName: varchar("scientific_name").notNull().unique(), // Full botanical name
  genus: varchar("genus").notNull(), // First part of botanical name
  species: varchar("species"), // Second part of botanical name  
  cultivar: varchar("cultivar"), // Third part if exists (cultivar or variety)
  commonName: varchar("common_name").notNull(),
  family: varchar("family"),
  
  // Basic characteristics
  type: varchar("type"), // annuals, perennials, herbaceous perennials, biennials, shrubs, ornamental trees, bulbs, climbers, ground covers, ornamental grasses, herbs-medicinal, herbs-culinary, succulents, cacti, aquatic plants, ferns, alpine rock garden plants
  dimension: jsonb("dimension"), // {height: {min, max}, spread: {min, max}} - critical for garden design
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
