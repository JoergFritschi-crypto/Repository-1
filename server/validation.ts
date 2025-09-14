import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// Request/Response type definitions
export type AuthenticatedRequest = express.Request & {
  user: {
    claims: {
      sub: string;
      email?: string;
    };
  };
};

// Garden validation schemas
export const gardenIdParamSchema = z.object({
  id: z.string().uuid("Invalid garden ID format")
});

export const updateGardenBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(200).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  shape: z.enum(["rectangle", "square", "circle", "oval", "triangle", "l_shaped", "r_shaped"]).optional(),
  dimensions: z.record(z.any()).optional(),
  slopePercentage: z.number().min(0).max(100).optional(),
  slopeDirection: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).optional(),
  northOrientation: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).optional(),
  pointOfView: z.enum(["top_down", "bird_eye", "ground_level", "elevated_angle", "isometric"]).optional(),
  sunExposure: z.enum(["full_sun", "partial_sun", "partial_shade", "full_shade"]).optional(),
  soilType: z.enum(["clay", "loam", "sand", "silt", "chalk"]).optional(),
  soilPh: z.number().min(0).max(14).optional(),
  hasSoilAnalysis: z.boolean().optional(),
  soilAnalysis: z.record(z.any()).optional(),
  hardiness_zone: z.string().max(10).optional(),
  usdaZone: z.string().max(10).optional(),
  rhsZone: z.string().max(10).optional(),
  hardinessCategory: z.string().max(50).optional(),
  climate_data: z.record(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
  design_approach: z.enum(["ai", "manual", "hybrid"]).optional(),
  layout_data: z.record(z.any()).optional(),
  ai_generated: z.boolean().optional(),
  status: z.enum(["draft", "completed", "exported"]).optional()
});

export const addPlantsToGardenSchema = z.object({
  plants: z.array(z.object({
    plantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(1000).default(1),
    position_x: z.number().nullable().optional(),
    position_y: z.number().nullable().optional(),
    notes: z.string().max(500).nullable().optional()
  })).min(1).max(100)
});

// Plant search validation schemas
export const plantSearchQuerySchema = z.object({
  query: z.string().max(100).optional(),
  type: z.string().max(50).optional(),
  hardiness_zone: z.string().max(10).optional(),
  sun_requirements: z.string().max(50).optional(),
  pet_safe: z.enum(["true", "false"]).transform(val => val === "true").optional()
});

export const advancedPlantSearchSchema = z.object({
  genus: z.string().max(100).optional(),
  species: z.string().max(100).optional(),
  cultivar: z.string().max(100).optional(),
  plantType: z.string().max(50).optional(),
  sunlight: z.string().max(50).optional(),
  soilType: z.string().max(50).optional(),
  wateringFrequency: z.string().max(50).optional(),
  bloomTime: z.string().max(50).optional(),
  foliage: z.string().max(50).optional(),
  petSafe: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  childSafe: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  hardiness_zone: z.string().max(10).optional(),
  usdaZone: z.string().max(10).optional(),
  rhsZone: z.string().max(10).optional(),
  heightMin: z.coerce.number().min(0).max(10000).optional(),
  heightMax: z.coerce.number().min(0).max(10000).optional(),
  spreadMin: z.coerce.number().min(0).max(10000).optional(),
  spreadMax: z.coerce.number().min(0).max(10000).optional(),
  growthRate: z.enum(["slow", "moderate", "fast"]).optional(),
  cycle: z.string().max(50).optional(),
  indoor: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  careLevel: z.string().max(50).optional(),
  maintenance: z.string().max(50).optional(),
  flowerColor: z.string().max(100).optional(),
  foliageColor: z.string().max(100).optional(),
  edible: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  medicinal: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  fragranceType: z.string().max(50).optional(),
  fragranceIntensity: z.string().max(50).optional(),
  deerResistant: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  droughtTolerant: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  saltTolerant: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  native: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  invasive: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  thorny: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional(),
  verified: z.enum(["true", "false", ""]).transform(val => val === "true" ? true : val === "false" ? false : undefined).optional()
});

// AI generation validation schemas
export const generateArtisticViewSchema = z.object({
  canvasImage: z.string().min(1).max(10000000), // Base64 image
  gardenId: z.string().uuid(),
  gardenName: z.string().max(100).optional(),
  sceneState: z.object({
    camera: z.record(z.any()),
    lighting: z.record(z.any()),
    bounds: z.record(z.any())
  }),
  placedPlants: z.array(z.any()).optional(),
  customPrompt: z.string().max(5000).optional()
});

export const generateCompleteDesignSchema = z.object({
  gardenId: z.string().uuid(),
  designRequest: z.string().max(5000),
  styleId: z.string().max(100).optional(),
  styleName: z.string().max(100).optional(),
  includeSeasonalImages: z.boolean().optional()
});

export const generateSeasonalImagesSchema = z.object({
  gardenId: z.string().uuid(),
  styleId: z.string().max(100),
  season: z.enum(["spring", "summer", "autumn", "winter"]).optional()
});

export const generatePlantIconSchema = z.object({
  plantId: z.string().uuid(),
  style: z.enum(["realistic", "watercolor", "botanical", "minimalist"]).optional()
});

// Garden photo analysis schemas
export const analyzeGardenPhotosSchema = z.object({
  photos: z.array(z.object({
    data: z.string(), // Base64 image
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"])
  })).min(1).max(10),
  location: z.string().max(200).optional()
});

// Garden style generation schema
export const generateDesignStylesSchema = z.object({
  gardenId: z.string().uuid(),
  photos: z.array(z.object({
    data: z.string(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"])
  })).optional(),
  preferences: z.string().max(5000).optional()
});

// Plant advice schema
export const getPlantAdviceSchema = z.object({
  plantId: z.string().uuid(),
  location: z.string().max(200),
  issue: z.string().max(1000).optional()
});

// Gardening advice schema
export const generateGardeningAdviceSchema = z.object({
  type: z.enum(["seasonal", "maintenance", "troubleshooting", "design"]),
  gardenId: z.string().uuid().optional(),
  location: z.string().max(200).optional(),
  details: z.string().max(5000).optional()
});

// Climate analysis schema
export const analyzeClimateSchema = z.object({
  location: z.string().min(1).max(200)
});

// Payment schemas
export const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1).max(100),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

export const createPortalSessionSchema = z.object({
  returnUrl: z.string().url()
});

// Webhook validation for Stripe
export const stripeWebhookHeadersSchema = z.object({
  "stripe-signature": z.string()
});

// Plant import schemas
export const importPlantFromPerenualSchema = z.object({
  perenualId: z.number().int().positive()
});

export const scrapePlantFromUrlSchema = z.object({
  url: z.string().url(),
  sourceType: z.enum(["general", "rhs", "gardenia", "plantnet"]).optional()
});

// File vault schemas
export const uploadFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().max(100),
  fileSize: z.number().int().positive().max(104857600), // 100MB max
  fileData: z.string() // Base64
});

// Admin routes schemas
export const adminUpdateUserSchema = z.object({
  userId: z.string().uuid(),
  isAdmin: z.boolean().optional(),
  userTier: z.enum(["free", "pay_per_design", "premium"]).optional(),
  designCredits: z.number().int().min(0).max(1000).optional()
});

export const adminGenerateIconsSchema = z.object({
  iconType: z.enum(["tools", "plants", "features"]),
  count: z.number().int().min(1).max(20).optional()
});

// Rate limiting configuration
export const RATE_LIMITS = {
  AI_GENERATION: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: "Too many AI generation requests. Please wait before trying again."
  },
  GENERAL_API: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: "Too many requests. Please slow down."
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 auth attempts per 15 minutes
    message: "Too many authentication attempts. Please try again later."
  }
};

// Helper function to validate request body
export function validateRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.errors);
  }
  return result.data;
}

// Helper function to validate query params
export function validateQueryParams<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new ValidationError(result.error.errors);
  }
  return result.data;
}

// Helper function to validate route params
export function validateRouteParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError(result.error.errors);
  }
  return result.data;
}

// Custom validation error class
export class ValidationError extends Error {
  constructor(public errors: z.ZodIssue[]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
  
  toJSON() {
    return {
      message: this.message,
      errors: this.errors.map(err => ({
        path: err.path.join("."),
        message: err.message
      }))
    };
  }
}