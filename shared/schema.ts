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
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Garden shape enum
export const gardenShapeEnum = pgEnum("garden_shape", [
  "rectangle",
  "circle", 
  "oval",
  "rhomboid",
  "l_shaped"
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
  hardiness_zone: varchar("hardiness_zone"),
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
  sunlight: jsonb("sunlight"), // Their 4-tiered system as array
  soil: jsonb("soil"), // Soil requirements
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
  careLevel: varchar("care_level"), // Easy, moderate, hard
  maintenance: varchar("maintenance"), // Low, moderate, high
  
  // Appearance
  leaf: jsonb("leaf"), // Leaf information
  leafColor: jsonb("leaf_color"), // Array of colors
  flowerColor: jsonb("flower_color"), // Array of colors
  floweringSeason: varchar("flowering_season"), // When it blooms
  
  // Safety - VERY IMPORTANT
  poisonousToHumans: integer("poisonous_to_humans").default(0), // 0-5 scale
  poisonousToPets: integer("poisonous_to_pets").default(0), // 0-5 scale
  cuisine: boolean("cuisine").default(false), // Culinary uses
  medicinal: boolean("medicinal").default(false), // Medicinal uses
  
  // Garden information
  attracts: jsonb("attracts"), // What it attracts (butterflies, birds, etc.)
  propagation: jsonb("propagation"), // How to propagate
  pruningMonth: jsonb("pruning_month"), // Array of months
  pruningCount: jsonb("pruning_count"), // Frequency info
  seeds: integer("seeds"), // Seed count/info
  pestSusceptibility: jsonb("pest_susceptibility"), // Common pests array
  pestSusceptibilityApi: varchar("pest_susceptibility_api"), // API endpoint
  
  // Content and guides
  description: text("description"), // Full plant description
  careGuides: varchar("care_guides"), // URL to care guides
  
  // System fields
  generatedImageUrl: varchar("generated_image_url"), // Our FLUX generated images
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

// Climate data cache
export const climateData = pgTable("climate_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  location: varchar("location").notNull().unique(),
  hardiness_zone: varchar("hardiness_zone"),
  annual_rainfall: decimal("annual_rainfall", { precision: 7, scale: 2 }),
  avg_temp_min: decimal("avg_temp_min", { precision: 5, scale: 2 }),
  avg_temp_max: decimal("avg_temp_max", { precision: 5, scale: 2 }),
  frost_dates: jsonb("frost_dates"), // first and last frost dates
  growing_season: jsonb("growing_season"),
  monthly_data: jsonb("monthly_data"),
  data_source: varchar("data_source").default("visual_crossing"),
  lastUpdated: timestamp("last_updated").defaultNow(),
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
export type ClimateData = typeof climateData.$inferSelect;
export type InsertClimateData = typeof climateData.$inferInsert;
export type ApiHealthCheck = typeof apiHealthChecks.$inferSelect;
export type InsertApiHealthCheck = typeof apiHealthChecks.$inferInsert;
export type ApiUsageStat = typeof apiUsageStats.$inferSelect;
export type InsertApiUsageStat = typeof apiUsageStats.$inferInsert;
export type ApiAlert = typeof apiAlerts.$inferSelect;
export type InsertApiAlert = typeof apiAlerts.$inferInsert;

// Schema exports for validation
export const insertGardenSchema = createInsertSchema(gardens);
export const insertPlantSchema = createInsertSchema(plants);
export const insertUserPlantCollectionSchema = createInsertSchema(userPlantCollections);
export const insertGardenPlantSchema = createInsertSchema(gardenPlants);
export const insertPlantDoctorSessionSchema = createInsertSchema(plantDoctorSessions);
export const insertClimateDataSchema = createInsertSchema(climateData);
export const insertApiHealthCheckSchema = createInsertSchema(apiHealthChecks);
export const insertApiUsageStatSchema = createInsertSchema(apiUsageStats);
export const insertApiAlertSchema = createInsertSchema(apiAlerts);
