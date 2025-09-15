import {
  users,
  gardens,
  plants,
  userPlantCollections,
  gardenPlants,
  plantDoctorSessions,
  designGenerations,
  climateData,
  fileVault,
  scrapingProgress,
  todoTasks,
  securityAuditLogs,
  failedLoginAttempts,
  activeSessions,
  ipAccessControl,
  securitySettings,
  rateLimitViolations,
  securityRecommendations,
  type User,
  type UpsertUser,
  type Garden,
  type InsertGarden,
  type Plant,
  type InsertPlant,
  type UserPlantCollection,
  type InsertUserPlantCollection,
  type GardenPlant,
  type InsertGardenPlant,
  type PlantDoctorSession,
  type InsertPlantDoctorSession,
  type DesignGeneration,
  type InsertDesignGeneration,
  type ClimateData,
  type InsertClimateData,
  type FileVault,
  type InsertFileVault,
  type ScrapingProgress,
  type InsertScrapingProgress,
  type TodoTask,
  type InsertTodoTask,
  type SecurityAuditLog,
  type InsertSecurityAuditLog,
  type FailedLoginAttempt,
  type InsertFailedLoginAttempt,
  type ActiveSession,
  type InsertActiveSession,
  type IpAccessControl,
  type InsertIpAccessControl,
  type SecuritySetting,
  type InsertSecuritySetting,
  type RateLimitViolation,
  type InsertRateLimitViolation,
  type SecurityRecommendation,
  type InsertSecurityRecommendation,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, or, desc, isNotNull, isNull, lte, sql, gte } from "drizzle-orm";
import { extractBotanicalParts } from "@shared/botanicalUtils";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateUser(userId: string, data: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Garden operations
  getGarden(id: string): Promise<Garden | undefined>;
  getUserGardens(userId: string): Promise<Garden[]>;
  createGarden(garden: InsertGarden): Promise<Garden>;
  updateGarden(id: string, garden: Partial<InsertGarden>): Promise<Garden>;
  deleteGarden(id: string): Promise<void>;
  
  // Plant operations
  getPlant(id: string): Promise<Plant | undefined>;
  getAllPlants(): Promise<Plant[]>;
  searchPlants(query: string, filters?: {
    type?: string;
    hardiness_zone?: string;
    sun_requirements?: string;
    pet_safe?: boolean;
  }): Promise<Plant[]>;
  advancedSearchPlants(filters: {
    genus?: string;
    species?: string;
    cultivar?: string;
    plantType?: string;
    sunlight?: string;
    soilType?: string;
    maintenance?: string;
    watering?: string;
    minHeight?: number;
    maxHeight?: number;
    minSpread?: number;
    maxSpread?: number;
    isSafe?: boolean;
    specialFeatures?: string[];
    attractsWildlife?: string[];
    bloomMonths?: string[];
    colors?: string[];
    [key: string]: any; // Allow additional properties for future expansion
  }): Promise<Plant[]>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: string, plant: Partial<InsertPlant>): Promise<Plant>;
  getPendingPlants(): Promise<Plant[]>;
  verifyPlant(id: string): Promise<Plant>;
  deletePlant(id: string): Promise<void>;
  
  // User plant collection operations
  getUserPlantCollection(userId: string): Promise<UserPlantCollection[]>;
  getUserCollectionCount(userId: string): Promise<number>;
  canAddToCollection(userId: string): Promise<{ canAdd: boolean; limit: number; current: number }>;
  addToUserCollection(collection: InsertUserPlantCollection): Promise<UserPlantCollection>;
  removeFromUserCollection(userId: string, plantId: string): Promise<void>;
  
  // Garden plant operations
  getGardenPlants(gardenId: string): Promise<GardenPlant[]>;
  addPlantToGarden(gardenPlant: InsertGardenPlant): Promise<GardenPlant>;
  updateGardenPlant(id: string, gardenPlant: Partial<InsertGardenPlant>): Promise<GardenPlant>;
  removePlantFromGarden(id: string): Promise<void>;
  
  // Plant doctor operations
  createPlantDoctorSession(session: InsertPlantDoctorSession): Promise<PlantDoctorSession>;
  getUserPlantDoctorSessions(userId: string): Promise<PlantDoctorSession[]>;
  updatePlantDoctorSession(id: string, session: Partial<InsertPlantDoctorSession>): Promise<PlantDoctorSession>;
  
  // Design generation tracking operations
  getUserDesignGenerations(userId: string): Promise<DesignGeneration[]>;
  createDesignGeneration(generation: InsertDesignGeneration): Promise<DesignGeneration>;
  getDesignGenerationsByStyle(userId: string, styleId: string): Promise<DesignGeneration[]>;
  
  // Climate data operations
  getClimateData(location: string): Promise<ClimateData | undefined>;
  createClimateData(climate: InsertClimateData): Promise<ClimateData>;
  updateClimateData(location: string, climate: Partial<InsertClimateData>): Promise<ClimateData>;
  
  // File vault operations
  createVaultItem(vaultItem: InsertFileVault): Promise<FileVault>;
  getUserVaultItems(userId: string): Promise<FileVault[]>;
  getVaultItem(id: string): Promise<FileVault | undefined>;
  updateVaultAccessTime(id: string): Promise<void>;
  deleteExpiredVaultItems(): Promise<number>;
  
  // Visualization data operations
  getVisualizationData(gardenId: string): Promise<Record<string, any> | undefined>;
  updateVisualizationData(gardenId: string, data: Record<string, any>): Promise<void>;
  
  // Scraping progress operations
  getScrapingProgress(url: string): Promise<ScrapingProgress | undefined>;
  createScrapingProgress(progress: InsertScrapingProgress): Promise<ScrapingProgress>;
  updateScrapingProgress(id: string, progress: Partial<InsertScrapingProgress>): Promise<ScrapingProgress>;
  finalizeScrapingProgress(id: string, stats: { totalPlants: number; savedPlants: number; duplicatePlants: number; failedPlants: number }): Promise<ScrapingProgress>;
  getPlantByScientificName(scientificName: string): Promise<Plant | undefined>;
  getPlantByExternalId(externalId: string): Promise<Plant | undefined>;
  bulkCreatePlants(plants: InsertPlant[]): Promise<{ saved: number; duplicates: number; errors: number }>;
  
  // Todo task operations
  getAllTodoTasks(): Promise<TodoTask[]>;
  createTodoTask(task: InsertTodoTask): Promise<TodoTask>;
  deleteTodoTask(id: string): Promise<void>;
  
  // Security operations
  createSecurityAuditLog(log: InsertSecurityAuditLog): Promise<SecurityAuditLog>;
  getSecurityAuditLogs(filters?: { userId?: string; eventType?: string; severity?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<SecurityAuditLog[]>;
  
  recordFailedLoginAttempt(attempt: InsertFailedLoginAttempt): Promise<FailedLoginAttempt>;
  getFailedLoginAttempts(ipAddress?: string): Promise<FailedLoginAttempt[]>;
  clearFailedLoginAttempts(ipAddress: string): Promise<void>;
  
  createActiveSession(session: InsertActiveSession): Promise<ActiveSession>;
  getActiveSessions(userId?: string): Promise<ActiveSession[]>;
  updateSessionActivity(sessionId: string): Promise<void>;
  revokeSession(sessionId: string, revokedBy: string): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
  
  addIpAccessControl(control: InsertIpAccessControl): Promise<IpAccessControl>;
  getIpAccessControl(type?: 'block' | 'allow'): Promise<IpAccessControl[]>;
  checkIpAccess(ipAddress: string): Promise<{ allowed: boolean; reason?: string }>;
  removeIpAccessControl(id: string): Promise<void>;
  
  getSecuritySettings(): Promise<SecuritySetting[]>;
  updateSecuritySetting(key: string, value: any, updatedBy: string): Promise<SecuritySetting>;
  
  recordRateLimitViolation(violation: InsertRateLimitViolation): Promise<RateLimitViolation>;
  getRateLimitViolations(filters?: { ipAddress?: string; endpoint?: string; startDate?: Date }): Promise<RateLimitViolation[]>;
  
  getSecurityRecommendations(status?: string): Promise<SecurityRecommendation[]>;
  updateRecommendationStatus(id: string, status: string, dismissedBy?: string): Promise<SecurityRecommendation>;
  createSecurityRecommendation(recommendation: InsertSecurityRecommendation): Promise<SecurityRecommendation>;
  
  getSecurityStats(): Promise<{
    totalUsers: number;
    activeSessionsCount: number;
    failedLoginsLast24h: number;
    blockedIpsCount: number;
    securityScore: number;
    recentEvents: SecurityAuditLog[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId, 
        stripeSubscriptionId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...data,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Garden operations
  async getGarden(id: string): Promise<Garden | undefined> {
    const [garden] = await db.select().from(gardens).where(eq(gardens.id, id));
    return garden;
  }

  async getUserGardens(userId: string): Promise<Garden[]> {
    return await db.select().from(gardens).where(eq(gardens.userId, userId)).orderBy(desc(gardens.updatedAt));
  }

  async createGarden(garden: InsertGarden): Promise<Garden> {
    const [newGarden] = await db.insert(gardens).values(garden).returning();
    return newGarden;
  }

  async updateGarden(id: string, garden: Partial<InsertGarden>): Promise<Garden> {
    const [updatedGarden] = await db
      .update(gardens)
      .set({ ...garden, updatedAt: new Date() })
      .where(eq(gardens.id, id))
      .returning();
    return updatedGarden;
  }

  async deleteGarden(id: string): Promise<void> {
    await db.delete(gardens).where(eq(gardens.id, id));
  }

  // Plant operations
  async getPlant(id: string): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.id, id));
    return plant;
  }

  async getAllPlants(): Promise<Plant[]> {
    return await db.select().from(plants);
  }

  async searchPlants(query: string, filters?: {
    type?: string;
    hardiness_zone?: string;
    sun_requirements?: string;
    pet_safe?: boolean;
  }): Promise<Plant[]> {
    const conditions = [];
    
    if (query) {
      conditions.push(
        or(
          ilike(plants.commonName, `%${query}%`),
          ilike(plants.scientificName, `%${query}%`)
        )
      );
    }
    
    if (filters?.type) {
      conditions.push(eq(plants.type, filters.type));
    }
    
    if (filters?.sun_requirements) {
      // sunlight is stored as JSONB array, so we need to check if it contains the value
      conditions.push(sql`${plants.sunlight}::jsonb @> ${JSON.stringify([filters.sun_requirements])}::jsonb`);
    }
    
    if (filters?.pet_safe !== undefined) {
      conditions.push(eq(plants.petSafe, filters.pet_safe));
    }
    
    let queryBuilder = db.select().from(plants);
    
    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions)) as any;
    }
    
    return await queryBuilder.orderBy(plants.commonName);
  }

  async advancedSearchPlants(filters: {
    genus?: string;
    species?: string;
    cultivar?: string;
    plantType?: string;
    sunlight?: string;
    soilType?: string;
    maintenance?: string;
    watering?: string;
    minHeight?: number;
    maxHeight?: number;
    minSpread?: number;
    maxSpread?: number;
    isSafe?: boolean;
    specialFeatures?: string[];
    attractsWildlife?: string[];
    bloomMonths?: string[];
    colors?: string[];
    [key: string]: any; // Allow additional properties for future expansion
  }): Promise<Plant[]> {
    const conditions = [];
    
    // Text fields - Modified to search across ALL name fields for flexibility
    // This allows users to find plants even if they type in the "wrong" field
    if (filters.genus) {
      // When searching for genus, also search in all name-related fields
      conditions.push(
        or(
          ilike(plants.genus, `%${filters.genus}%`),
          ilike(plants.species, `%${filters.genus}%`),
          ilike(plants.cultivar, `%${filters.genus}%`),
          ilike(plants.commonName, `%${filters.genus}%`),
          ilike(plants.scientificName, `%${filters.genus}%`)
        )
      );
    }
    if (filters.species) {
      // When searching for species, also search in all name-related fields
      conditions.push(
        or(
          ilike(plants.species, `%${filters.species}%`),
          ilike(plants.genus, `%${filters.species}%`),
          ilike(plants.cultivar, `%${filters.species}%`),
          ilike(plants.commonName, `%${filters.species}%`),
          ilike(plants.scientificName, `%${filters.species}%`)
        )
      );
    }
    if (filters.cultivar) {
      // When searching for cultivar, also search in all name-related fields
      conditions.push(
        or(
          ilike(plants.cultivar, `%${filters.cultivar}%`),
          ilike(plants.genus, `%${filters.cultivar}%`),
          ilike(plants.species, `%${filters.cultivar}%`),
          ilike(plants.commonName, `%${filters.cultivar}%`),
          ilike(plants.scientificName, `%${filters.cultivar}%`)
        )
      );
    }
    
    // Single selection fields
    if (filters.plantType) conditions.push(eq(plants.type, filters.plantType));
    if (filters.sunlight) {
      // sunlight is stored as JSONB array
      conditions.push(sql`${plants.sunlight}::jsonb @> ${JSON.stringify([filters.sunlight])}::jsonb`);
    }
    if (filters.soilType) {
      // soil is stored as JSONB array
      conditions.push(sql`${plants.soil}::jsonb @> ${JSON.stringify([filters.soilType])}::jsonb`);
    }
    if (filters.maintenance) conditions.push(eq(plants.maintenance, filters.maintenance.toLowerCase()));
    if (filters.watering) {
      conditions.push(eq(plants.watering, filters.watering.toLowerCase()));
    }
    
    // Range fields - now using numeric columns
    // Note: filters come in as cm from the frontend
    if (filters.minHeight) {
      conditions.push(gte(plants.heightMaxCm, filters.minHeight));
    }
    // Only apply max height filter if not including large specimens (maxHeight === 0 means no limit)
    if (filters.maxHeight && filters.maxHeight !== 0) {
      conditions.push(lte(plants.heightMinCm, filters.maxHeight));
    }
    if (filters.minSpread) {
      conditions.push(
        or(
          gte(plants.spreadMaxCm, filters.minSpread),
          isNull(plants.spreadMaxCm) // Include plants with no spread data
        )
      );
    }
    if (filters.maxSpread) {
      conditions.push(
        or(
          lte(plants.spreadMinCm, filters.maxSpread),
          isNull(plants.spreadMinCm) // Include plants with no spread data
        )
      );
    }
    
    // Boolean fields
    if (filters.isSafe) {
      conditions.push(and(
        eq(plants.poisonousToHumans, 0),
        eq(plants.poisonousToPets, 0)
      ));
    }
    
    // Special features
    if (filters.specialFeatures && filters.specialFeatures.length > 0) {
      const featureConditions = [];
      if (filters.specialFeatures.includes('Drought Tolerant')) {
        featureConditions.push(eq(plants.droughtTolerant, true));
      }
      if (filters.specialFeatures.includes('Salt Tolerant')) {
        featureConditions.push(eq(plants.saltTolerant, true));
      }
      if (filters.specialFeatures.includes('Fast Growing')) {
        featureConditions.push(eq(plants.growthRate, 'fast'));
      }
      // Note: fragrant column doesn't exist in current schema
      if (featureConditions.length > 0) {
        conditions.push(or(...featureConditions));
      }
    }
    
    // Wildlife attractants - attracts is stored as JSONB array
    if (filters.attractsWildlife && filters.attractsWildlife.length > 0) {
      const wildlifeConditions = filters.attractsWildlife.map((wildlife: string) => {
        const wildlifeMap: Record<string, string> = {
          'Butterflies': 'butterflies',
          'Birds': 'birds', 
          'Bees': 'bees',
          'Hummingbirds': 'hummingbirds'
        };
        const wildlifeName = wildlifeMap[wildlife] || wildlife.toLowerCase();
        return sql`${plants.attracts}::jsonb @> ${JSON.stringify([wildlifeName])}::jsonb`;
      });
      if (wildlifeConditions.length > 0) {
        conditions.push(or(...wildlifeConditions));
      }
    }
    
    // Bloom months - using bloomStartMonth and bloomEndMonth integer fields
    if (filters.bloomMonths && filters.bloomMonths.length > 0) {
      const monthMap: Record<string, number> = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
      };
      const monthConditions = filters.bloomMonths.map((month: string) => {
        const monthName = month.replace('Early ', '').replace('Late ', '');
        const monthNum = monthMap[monthName];
        if (monthNum) {
          return or(
            and(gte(plants.bloomStartMonth, monthNum), lte(plants.bloomStartMonth, monthNum)),
            and(gte(plants.bloomEndMonth, monthNum), lte(plants.bloomEndMonth, monthNum)),
            and(lte(plants.bloomStartMonth, monthNum), gte(plants.bloomEndMonth, monthNum))
          );
        }
        return null;
      }).filter((condition): condition is NonNullable<typeof condition> => condition !== null);
      if (monthConditions.length > 0) {
        conditions.push(or(...monthConditions));
      }
    }
    
    // Colors - flowerColor is stored as JSONB array
    if (filters.colors && filters.colors.length > 0) {
      const colorConditions = filters.colors.map((color: string) => 
        sql`${plants.flowerColor}::jsonb @> ${JSON.stringify([color.toLowerCase()])}::jsonb`
      );
      if (colorConditions.length > 0) {
        conditions.push(or(...colorConditions));
      }
    }
    
    // Return all plants (including pending ones for admin validation)
    // No verification status filter applied
    
    const result = conditions.length > 0
      ? await db.select().from(plants).where(and(...conditions)).limit(100)
      : await db.select().from(plants).limit(100);
      
    return result;
  }

  async createPlant(plant: InsertPlant): Promise<Plant> {
    const [newPlant] = await db.insert(plants).values(plant).returning();
    return newPlant;
  }

  async updatePlant(id: string, plant: Partial<InsertPlant>): Promise<Plant> {
    const [updatedPlant] = await db
      .update(plants)
      .set({ ...plant, updatedAt: new Date() })
      .where(eq(plants.id, id))
      .returning();
    return updatedPlant;
  }

  async getPendingPlants(): Promise<Plant[]> {
    return await db.select().from(plants).where(eq(plants.verificationStatus, "pending"));
  }

  async verifyPlant(id: string): Promise<Plant> {
    const [verifiedPlant] = await db
      .update(plants)
      .set({ 
        verificationStatus: "verified",
        verifiedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(plants.id, id))
      .returning();
    return verifiedPlant;
  }

  async deletePlant(id: string): Promise<void> {
    await db.delete(plants).where(eq(plants.id, id));
  }

  // User plant collection operations
  async getUserPlantCollection(userId: string): Promise<UserPlantCollection[]> {
    const results = await db
      .select({
        collection: userPlantCollections,
        plant: plants
      })
      .from(userPlantCollections)
      .leftJoin(plants, eq(userPlantCollections.plantId, plants.id))
      .where(eq(userPlantCollections.userId, userId));
    
    // Transform the results to include the plant data in the collection item
    return results.map(row => ({
      ...row.collection,
      plant: row.plant
    }));
  }

  async getUserCollectionCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(userPlantCollections)
      .where(eq(userPlantCollections.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async canAddToCollection(userId: string): Promise<{ canAdd: boolean; limit: number; current: number }> {
    // Get user to check their tier
    const user = await this.getUser(userId);
    if (!user) {
      return { canAdd: false, limit: 0, current: 0 };
    }

    // Define collection limits based on tier
    const limits = {
      free: 15,           // Free users can save up to 15 plants
      pay_per_design: 100, // Pay-per-design users get 100 plants
      premium: -1         // Premium users have unlimited (-1 = unlimited)
    };

    const userTier = user.userTier || 'free';
    const limit = limits[userTier as keyof typeof limits];
    const current = await this.getUserCollectionCount(userId);
    
    // For unlimited (premium), always allow
    if (limit === -1) {
      return { canAdd: true, limit: -1, current };
    }
    
    return { 
      canAdd: current < limit, 
      limit, 
      current 
    };
  }

  async addToUserCollection(collection: InsertUserPlantCollection): Promise<UserPlantCollection> {
    // Check if user can add more plants
    const { canAdd } = await this.canAddToCollection(collection.userId);
    if (!canAdd) {
      throw new Error('Collection limit reached. Upgrade to Premium for unlimited plants.');
    }
    
    // Check if plant already in collection
    const existing = await db.select()
      .from(userPlantCollections)
      .where(
        and(
          eq(userPlantCollections.userId, collection.userId),
          eq(userPlantCollections.plantId, collection.plantId)
        )
      );
    
    if (existing.length > 0) {
      throw new Error('Plant already in collection');
    }
    
    const [newCollection] = await db.insert(userPlantCollections).values(collection).returning();
    return newCollection;
  }

  async removeFromUserCollection(userId: string, plantId: string): Promise<void> {
    await db.delete(userPlantCollections).where(
      and(
        eq(userPlantCollections.userId, userId),
        eq(userPlantCollections.plantId, plantId)
      )
    );
  }

  // Garden plant operations
  async getGardenPlants(gardenId: string): Promise<GardenPlant[]> {
    return await db.select().from(gardenPlants).where(eq(gardenPlants.gardenId, gardenId));
  }

  async addPlantToGarden(gardenPlant: InsertGardenPlant): Promise<GardenPlant> {
    const [newGardenPlant] = await db.insert(gardenPlants).values(gardenPlant).returning();
    return newGardenPlant;
  }

  async updateGardenPlant(id: string, gardenPlant: Partial<InsertGardenPlant>): Promise<GardenPlant> {
    const [updatedGardenPlant] = await db
      .update(gardenPlants)
      .set(gardenPlant)
      .where(eq(gardenPlants.id, id))
      .returning();
    return updatedGardenPlant;
  }

  async removePlantFromGarden(id: string): Promise<void> {
    await db.delete(gardenPlants).where(eq(gardenPlants.id, id));
  }

  // Plant doctor operations
  async createPlantDoctorSession(session: InsertPlantDoctorSession): Promise<PlantDoctorSession> {
    const [newSession] = await db.insert(plantDoctorSessions).values(session).returning();
    return newSession;
  }

  async getUserPlantDoctorSessions(userId: string): Promise<PlantDoctorSession[]> {
    return await db.select().from(plantDoctorSessions)
      .where(eq(plantDoctorSessions.userId, userId))
      .orderBy(desc(plantDoctorSessions.createdAt));
  }

  async updatePlantDoctorSession(id: string, session: Partial<InsertPlantDoctorSession>): Promise<PlantDoctorSession> {
    const [updatedSession] = await db
      .update(plantDoctorSessions)
      .set(session)
      .where(eq(plantDoctorSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Design generation tracking operations
  async getUserDesignGenerations(userId: string): Promise<DesignGeneration[]> {
    return await db.select().from(designGenerations)
      .where(eq(designGenerations.userId, userId))
      .orderBy(desc(designGenerations.createdAt));
  }

  async createDesignGeneration(generation: InsertDesignGeneration): Promise<DesignGeneration> {
    const [newGeneration] = await db.insert(designGenerations).values(generation).returning();
    return newGeneration;
  }

  async getDesignGenerationsByStyle(userId: string, styleId: string): Promise<DesignGeneration[]> {
    return await db.select().from(designGenerations)
      .where(and(
        eq(designGenerations.userId, userId),
        eq(designGenerations.styleId, styleId)
      ))
      .orderBy(desc(designGenerations.createdAt));
  }

  // Climate data operations
  async getClimateData(location: string): Promise<ClimateData | undefined> {
    const [climate] = await db.select().from(climateData).where(eq(climateData.location, location));
    return climate;
  }

  async createClimateData(climate: InsertClimateData): Promise<ClimateData> {
    const [newClimate] = await db.insert(climateData).values(climate).returning();
    return newClimate;
  }

  async updateClimateData(location: string, climate: Partial<InsertClimateData>): Promise<ClimateData> {
    const [updatedClimate] = await db
      .update(climateData)
      .set({ ...climate, lastUpdated: new Date() })
      .where(eq(climateData.location, location))
      .returning();
    return updatedClimate;
  }

  // File vault operations
  async createVaultItem(vaultItem: InsertFileVault): Promise<FileVault> {
    const [newItem] = await db.insert(fileVault).values(vaultItem).returning();
    return newItem;
  }

  async getUserVaultItems(userId: string): Promise<FileVault[]> {
    return await db.select().from(fileVault)
      .where(eq(fileVault.userId, userId))
      .orderBy(desc(fileVault.createdAt));
  }

  async getVaultItem(id: string): Promise<FileVault | undefined> {
    const [item] = await db.select().from(fileVault).where(eq(fileVault.id, id));
    return item;
  }

  async updateVaultAccessTime(id: string): Promise<void> {
    await db.update(fileVault)
      .set({ 
        lastAccessedAt: new Date(),
        accessCount: sql`access_count + 1`
      })
      .where(eq(fileVault.id, id));
  }

  async deleteExpiredVaultItems(): Promise<number> {
    const result = await db.delete(fileVault)
      .where(and(
        isNotNull(fileVault.expiresAt),
        lte(fileVault.expiresAt, new Date())
      ));
    return result.rowCount || 0;
  }
  
  // Visualization data operations (stored in garden metadata)
  async getVisualizationData(gardenId: string): Promise<any | undefined> {
    const garden = await this.getGarden(gardenId);
    if (!garden) return undefined;
    
    // Store visualization data in garden's layout_data JSON field
    const layoutData = garden.layout_data as any || {};
    return {
      iterationCount: layoutData.visualizationIterationCount || 0,
      savedImages: layoutData.savedSeasonalImages || [],
      lastSaved: layoutData.lastSeasonalImagesSaved || null
    };
  }
  
  async updateVisualizationData(gardenId: string, data: any): Promise<void> {
    const garden = await this.getGarden(gardenId);
    if (!garden) return;
    
    const layoutData = garden.layout_data as any || {};
    
    // Update visualization data
    if (data.iterationCount !== undefined) {
      layoutData.visualizationIterationCount = data.iterationCount;
    }
    if (data.savedImages !== undefined) {
      layoutData.savedSeasonalImages = data.savedImages;
    }
    if (data.lastSaved !== undefined) {
      layoutData.lastSeasonalImagesSaved = data.lastSaved;
    }
    
    await db.update(gardens)
      .set({ 
        layout_data: layoutData,
        updatedAt: new Date()
      })
      .where(eq(gardens.id, gardenId.toString()));
  }
  
  // Scraping progress operations
  async getScrapingProgress(url: string): Promise<ScrapingProgress | undefined> {
    const [progress] = await db.select().from(scrapingProgress).where(eq(scrapingProgress.url, url));
    return progress;
  }
  
  async createScrapingProgress(progress: InsertScrapingProgress): Promise<ScrapingProgress> {
    const [newProgress] = await db.insert(scrapingProgress).values(progress).returning();
    return newProgress;
  }
  
  async updateScrapingProgress(id: string, progress: Partial<InsertScrapingProgress>): Promise<ScrapingProgress> {
    const [updatedProgress] = await db
      .update(scrapingProgress)
      .set({ ...progress, updatedAt: new Date() })
      .where(eq(scrapingProgress.id, id))
      .returning();
    return updatedProgress;
  }
  
  async finalizeScrapingProgress(id: string, stats: { totalPlants: number; savedPlants: number; duplicatePlants: number; failedPlants: number }): Promise<ScrapingProgress> {
    const [finalized] = await db
      .update(scrapingProgress)
      .set({
        status: 'completed',
        totalPlants: stats.totalPlants,
        savedPlants: stats.savedPlants,
        duplicatePlants: stats.duplicatePlants,
        failedPlants: stats.failedPlants,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(scrapingProgress.id, id))
      .returning();
    
    console.log(`Scraping finalized - Total: ${stats.totalPlants}, Saved: ${stats.savedPlants}, Duplicates: ${stats.duplicatePlants}, Failed: ${stats.failedPlants}`);
    return finalized;
  }
  
  async getPlantByScientificName(scientificName: string): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.scientificName, scientificName));
    return plant;
  }
  
  async getPlantByExternalId(externalId: string): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.externalId, externalId));
    return plant;
  }
  
  async bulkCreatePlants(plantsToSave: InsertPlant[]): Promise<{ saved: number; duplicates: number; errors: number }> {
    let saved = 0;
    let duplicates = 0;
    let errors = 0;
    
    // Process plants in batches of 10 for safety
    const batchSize = 10;
    for (let i = 0; i < plantsToSave.length; i += batchSize) {
      const batch = plantsToSave.slice(i, i + batchSize);
      
      for (const plant of batch) {
        try {
          // Ensure genus is extracted if not provided
          let processedPlant = { ...plant };
          
          if (!processedPlant.genus) {
            // Extract genus from scientific name (first word)
            const scientificName = processedPlant.scientificName || '';
            const botanicalParts = extractBotanicalParts(scientificName);
            
            processedPlant.genus = botanicalParts.genus || 'Unknown';
            processedPlant.species = processedPlant.species || botanicalParts.species;
            processedPlant.cultivar = processedPlant.cultivar || botanicalParts.cultivar;
          }
          
          // Validate required fields - NEVER save without valid botanical data
          if (!processedPlant.scientificName || !processedPlant.genus) {
            console.error(`Rejected invalid plant: Missing required fields (scientificName: "${processedPlant.scientificName}", genus: "${processedPlant.genus}", commonName: "${processedPlant.commonName}")`);
            errors++;
            continue;
          }
          
          // Check if genus is still "Unknown" (should never happen with new logic)
          if (processedPlant.genus === 'Unknown') {
            console.error(`Rejected plant with genus="Unknown": ${processedPlant.scientificName}`);
            errors++;
            continue;
          }
          
          // Use upsert with onConflictDoUpdate for better efficiency
          try {
            if (processedPlant.externalId) {
              // Use onConflictDoUpdate on externalId for atomic upsert
              const result = await db
                .insert(plants)
                .values(processedPlant)
                .onConflictDoUpdate({
                  target: plants.externalId,
                  set: {
                    // Update all fields except id and externalId
                    scientificName: processedPlant.scientificName,
                    commonName: processedPlant.commonName,
                    genus: processedPlant.genus,
                    species: processedPlant.species,
                    cultivar: processedPlant.cultivar,
                    // For optional fields, update only if new value is provided
                    ...(processedPlant.description && { description: processedPlant.description }),
                    ...(processedPlant.heightMinCm && { heightMinCm: processedPlant.heightMinCm }),
                    ...(processedPlant.heightMaxCm && { heightMaxCm: processedPlant.heightMaxCm }),
                    ...(processedPlant.spreadMinCm && { spreadMinCm: processedPlant.spreadMinCm }),
                    ...(processedPlant.spreadMaxCm && { spreadMaxCm: processedPlant.spreadMaxCm }),
                    ...(processedPlant.bloomStartMonth && { bloomStartMonth: processedPlant.bloomStartMonth }),
                    ...(processedPlant.bloomEndMonth && { bloomEndMonth: processedPlant.bloomEndMonth }),
                    ...(processedPlant.flowerColor ? { flowerColor: processedPlant.flowerColor } : {}),
                    ...(processedPlant.sunlight ? { sunlight: processedPlant.sunlight } : {}),
                    ...(processedPlant.watering ? { watering: processedPlant.watering } : {}),
                    ...(processedPlant.soil ? { soil: processedPlant.soil } : {}),
                    ...(processedPlant.hardiness && { hardiness: processedPlant.hardiness }),
                    ...(processedPlant.maintenance && { maintenance: processedPlant.maintenance }),
                    ...(processedPlant.growthRate && { growthRate: processedPlant.growthRate }),
                    ...(processedPlant.droughtTolerant !== undefined && { droughtTolerant: processedPlant.droughtTolerant }),
                    ...(processedPlant.saltTolerant !== undefined && { saltTolerant: processedPlant.saltTolerant }),
                    dataSource: processedPlant.dataSource,
                    updatedAt: new Date()
                  }
                })
                .returning();
              
              if (result && result.length > 0) {
                const plant = result[0];
                // Check if it was an insert or update by comparing created/updated times
                const timeDiff = plant.createdAt && plant.updatedAt 
                  ? Math.abs(plant.createdAt.getTime() - plant.updatedAt.getTime())
                  : 0;
                if (timeDiff < 1000) { // Created and updated at same time = new insert
                  saved++;
                  console.log(`Saved new plant: ${processedPlant.scientificName} (externalId: ${processedPlant.externalId})`);
                } else {
                  duplicates++;
                  console.log(`Updated existing plant: ${processedPlant.scientificName} (externalId: ${processedPlant.externalId})`);
                }
              }
            } else {
              // No externalId, use regular insert (may fail on scientificName unique constraint)
              const [insertedPlant] = await db
                .insert(plants)
                .values(processedPlant)
                .returning();
              
              if (insertedPlant) {
                saved++;
                console.log(`Saved new plant: ${processedPlant.scientificName} (${processedPlant.commonName})`);
              }
            }
          } catch (insertError: any) {
            // Handle unique constraint violations
            if (insertError.code === '23505') {  // PostgreSQL unique violation
              duplicates++;
              console.log(`Duplicate plant skipped: ${processedPlant.scientificName} (${insertError.detail})`);
            } else {
              console.error(`Error processing plant ${processedPlant.scientificName}:`, insertError.message);
              errors++;
            }
          }
        } catch (error: any) {
          errors++;
          console.error(`Unexpected error processing plant:`, error.message);
        }
      }
    }
    
    console.log(`Bulk create complete: ${saved} new, ${duplicates} updated/duplicate, ${errors} errors`);
    return { saved, duplicates, errors };
  }

  // Todo task operations
  async getAllTodoTasks(): Promise<TodoTask[]> {
    return await db.select().from(todoTasks).orderBy(desc(todoTasks.createdAt));
  }

  async createTodoTask(task: InsertTodoTask): Promise<TodoTask> {
    const [newTask] = await db.insert(todoTasks).values(task).returning();
    return newTask;
  }

  async deleteTodoTask(id: string): Promise<void> {
    await db.delete(todoTasks).where(eq(todoTasks.id, id));
  }

  // Security operation implementations
  async createSecurityAuditLog(log: InsertSecurityAuditLog): Promise<SecurityAuditLog> {
    const [newLog] = await db.insert(securityAuditLogs).values(log).returning();
    return newLog;
  }

  async getSecurityAuditLogs(filters?: { 
    userId?: string; 
    eventType?: string; 
    severity?: string; 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number 
  }): Promise<SecurityAuditLog[]> {
    let query = db.select().from(securityAuditLogs);
    const conditions: any[] = [];
    
    if (filters?.userId) {
      conditions.push(eq(securityAuditLogs.userId, filters.userId));
    }
    if (filters?.eventType) {
      conditions.push(eq(securityAuditLogs.eventType as any, filters.eventType));
    }
    if (filters?.severity) {
      conditions.push(eq(securityAuditLogs.severity as any, filters.severity));
    }
    if (filters?.startDate) {
      conditions.push(gte(securityAuditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(securityAuditLogs.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(securityAuditLogs.createdAt)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    return await query;
  }

  async recordFailedLoginAttempt(attempt: InsertFailedLoginAttempt): Promise<FailedLoginAttempt> {
    // Check if there's an existing record for this IP
    const [existing] = await db
      .select()
      .from(failedLoginAttempts)
      .where(eq(failedLoginAttempts.ipAddress, attempt.ipAddress))
      .orderBy(desc(failedLoginAttempts.lastAttempt))
      .limit(1);
    
    if (existing && existing.lastAttempt) {
      // If last attempt was within last hour, update count
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (existing.lastAttempt > hourAgo) {
        const [updated] = await db
          .update(failedLoginAttempts)
          .set({
            attemptCount: (existing.attemptCount || 0) + 1,
            lastAttempt: new Date(),
            attemptedEmail: attempt.attemptedEmail || existing.attemptedEmail,
            userAgent: attempt.userAgent || existing.userAgent
          })
          .where(eq(failedLoginAttempts.id, existing.id))
          .returning();
        return updated;
      }
    }
    
    // Create new record
    const [newAttempt] = await db.insert(failedLoginAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getFailedLoginAttempts(ipAddress?: string): Promise<FailedLoginAttempt[]> {
    if (ipAddress) {
      return await db
        .select()
        .from(failedLoginAttempts)
        .where(eq(failedLoginAttempts.ipAddress, ipAddress))
        .orderBy(desc(failedLoginAttempts.lastAttempt));
    }
    return await db
      .select()
      .from(failedLoginAttempts)
      .orderBy(desc(failedLoginAttempts.lastAttempt));
  }

  async clearFailedLoginAttempts(ipAddress: string): Promise<void> {
    await db.delete(failedLoginAttempts).where(eq(failedLoginAttempts.ipAddress, ipAddress));
  }

  async createActiveSession(session: InsertActiveSession): Promise<ActiveSession> {
    const [newSession] = await db.insert(activeSessions).values(session).returning();
    return newSession;
  }

  async getActiveSessions(userId?: string): Promise<ActiveSession[]> {
    const conditions: any[] = [eq(activeSessions.isActive, true)];
    
    if (userId) {
      conditions.push(eq(activeSessions.userId, userId));
    }
    
    return await db
      .select()
      .from(activeSessions)
      .where(and(...conditions))
      .orderBy(desc(activeSessions.lastActivity));
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await db
      .update(activeSessions)
      .set({ lastActivity: new Date() })
      .where(eq(activeSessions.sessionToken, sessionId));
  }

  async revokeSession(sessionId: string, revokedBy: string): Promise<void> {
    await db
      .update(activeSessions)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy
      })
      .where(eq(activeSessions.sessionToken, sessionId));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(activeSessions)
      .set({ isActive: false })
      .where(and(
        eq(activeSessions.isActive, true),
        lte(activeSessions.expiresAt as any, now)
      ))
      .returning();
    return result.length;
  }

  async addIpAccessControl(control: InsertIpAccessControl): Promise<IpAccessControl> {
    const [newControl] = await db.insert(ipAccessControl).values(control).returning();
    return newControl;
  }

  async getIpAccessControl(type?: 'block' | 'allow'): Promise<IpAccessControl[]> {
    const conditions: any[] = [eq(ipAccessControl.isActive, true)];
    
    if (type) {
      conditions.push(eq(ipAccessControl.type, type));
    }
    
    return await db
      .select()
      .from(ipAccessControl)
      .where(and(...conditions))
      .orderBy(desc(ipAccessControl.createdAt));
  }

  async checkIpAccess(ipAddress: string): Promise<{ allowed: boolean; reason?: string }> {
    const [blocked] = await db
      .select()
      .from(ipAccessControl)
      .where(and(
        eq(ipAccessControl.ipAddress, ipAddress),
        eq(ipAccessControl.type, 'block'),
        eq(ipAccessControl.isActive, true)
      ))
      .limit(1);
    
    if (blocked) {
      return { allowed: false, reason: blocked.reason || 'IP address is blocked' };
    }
    
    const [allowed] = await db
      .select()
      .from(ipAccessControl)
      .where(and(
        eq(ipAccessControl.ipAddress, ipAddress),
        eq(ipAccessControl.type, 'allow'),
        eq(ipAccessControl.isActive, true)
      ))
      .limit(1);
    
    if (allowed) {
      return { allowed: true };
    }
    
    // Default to allow if not in any list
    return { allowed: true };
  }

  async removeIpAccessControl(id: string): Promise<void> {
    await db
      .update(ipAccessControl)
      .set({ isActive: false })
      .where(eq(ipAccessControl.id, id));
  }

  async getSecuritySettings(): Promise<SecuritySetting[]> {
    return await db
      .select()
      .from(securitySettings)
      .orderBy(securitySettings.key);
  }

  async updateSecuritySetting(key: string, value: any, updatedBy: string): Promise<SecuritySetting> {
    const [existingSetting] = await db
      .select()
      .from(securitySettings)
      .where(eq(securitySettings.key, key))
      .limit(1);
    
    if (existingSetting) {
      const [updated] = await db
        .update(securitySettings)
        .set({
          value: value,
          lastModifiedBy: updatedBy,
          updatedAt: new Date()
        })
        .where(eq(securitySettings.key, key))
        .returning();
      return updated;
    } else {
      const [newSetting] = await db
        .insert(securitySettings)
        .values({
          key: key,
          value: value,
          lastModifiedBy: updatedBy
        })
        .returning();
      return newSetting;
    }
  }

  async recordRateLimitViolation(violation: InsertRateLimitViolation): Promise<RateLimitViolation> {
    // Check for existing violation in current window
    const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15 minute window
    const [existing] = await db
      .select()
      .from(rateLimitViolations)
      .where(and(
        eq(rateLimitViolations.ipAddress, violation.ipAddress),
        eq(rateLimitViolations.endpoint, violation.endpoint),
        gte(rateLimitViolations.windowStart, windowStart)
      ))
      .limit(1);
    
    if (existing) {
      const [updated] = await db
        .update(rateLimitViolations)
        .set({
          violationCount: (existing.violationCount || 0) + 1,
          windowEnd: new Date()
        })
        .where(eq(rateLimitViolations.id, existing.id))
        .returning();
      return updated;
    }
    
    const [newViolation] = await db.insert(rateLimitViolations).values(violation).returning();
    return newViolation;
  }

  async getRateLimitViolations(filters?: { 
    ipAddress?: string; 
    endpoint?: string; 
    startDate?: Date 
  }): Promise<RateLimitViolation[]> {
    const conditions: any[] = [];
    
    if (filters?.ipAddress) {
      conditions.push(eq(rateLimitViolations.ipAddress, filters.ipAddress));
    }
    if (filters?.endpoint) {
      conditions.push(eq(rateLimitViolations.endpoint, filters.endpoint));
    }
    if (filters?.startDate) {
      conditions.push(gte(rateLimitViolations.windowStart, filters.startDate));
    }
    
    let query = db.select().from(rateLimitViolations);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(rateLimitViolations.windowStart));
  }

  async getSecurityRecommendations(status?: string): Promise<SecurityRecommendation[]> {
    if (status) {
      return await db
        .select()
        .from(securityRecommendations)
        .where(eq(securityRecommendations.status, status))
        .orderBy(desc(securityRecommendations.severity), desc(securityRecommendations.createdAt));
    }
    return await db
      .select()
      .from(securityRecommendations)
      .orderBy(desc(securityRecommendations.severity), desc(securityRecommendations.createdAt));
  }

  async updateRecommendationStatus(id: string, status: string, dismissedBy?: string): Promise<SecurityRecommendation> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'dismissed' && dismissedBy) {
      updateData.dismissedBy = dismissedBy;
      updateData.dismissedAt = new Date();
    }
    
    const [updated] = await db
      .update(securityRecommendations)
      .set(updateData)
      .where(eq(securityRecommendations.id, id))
      .returning();
    return updated;
  }

  async createSecurityRecommendation(recommendation: InsertSecurityRecommendation): Promise<SecurityRecommendation> {
    const [newRecommendation] = await db
      .insert(securityRecommendations)
      .values(recommendation)
      .returning();
    return newRecommendation;
  }

  async getSecurityStats(): Promise<{
    totalUsers: number;
    activeSessionsCount: number;
    failedLoginsLast24h: number;
    blockedIpsCount: number;
    securityScore: number;
    recentEvents: SecurityAuditLog[];
  }> {
    // Get total active sessions count
    const activeSessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activeSessions)
      .where(eq(activeSessions.isActive, true));
    const totalSessions = Number(activeSessionsResult[0]?.count || 0);
    
    // Get failed logins in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedLoginsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(failedLoginAttempts)
      .where(gte(failedLoginAttempts.lastAttempt, twentyFourHoursAgo));
    const failedLogins24h = Number(failedLoginsResult[0]?.count || 0);
    
    // Get blocked IPs count
    const blockedIpsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ipAccessControl)
      .where(and(
        eq(ipAccessControl.type, 'block'),
        eq(ipAccessControl.isActive, true)
      ));
    const blockedIps = Number(blockedIpsResult[0]?.count || 0);
    
    // Get audit logs today count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const auditLogsTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(securityAuditLogs)
      .where(gte(securityAuditLogs.createdAt, todayStart));
    const auditLogsToday = Number(auditLogsTodayResult[0]?.count || 0);
    
    // Get last audit time
    const lastAuditResult = await db
      .select({ createdAt: securityAuditLogs.createdAt })
      .from(securityAuditLogs)
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(1);
    const lastAuditTime = lastAuditResult[0]?.createdAt || null;
    
    // Count active threats (critical or error severity events in last 24 hours)
    const activeThreatsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(securityAuditLogs)
      .where(and(
        gte(securityAuditLogs.createdAt, twentyFourHoursAgo),
        or(
          eq(securityAuditLogs.severity, 'critical'),
          eq(securityAuditLogs.severity, 'error')
        )
      ));
    const activeThreats = Number(activeThreatsResult[0]?.count || 0);
    
    // Get rate limit violations in last 24 hours
    const rateLimitResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateLimitViolations)
      .where(gte(rateLimitViolations.windowStart, twentyFourHoursAgo));
    const rateLimitViolationCount = Number(rateLimitResult[0]?.count || 0);
    
    // Calculate security score (more comprehensive formula)
    let securityScore = 100;
    if (failedLogins24h > 10) securityScore -= 10;
    if (failedLogins24h > 50) securityScore -= 20;
    if (blockedIps > 5) securityScore -= 5;
    if (blockedIps > 20) securityScore -= 10;
    if (activeThreats > 0) securityScore -= (activeThreats * 5);
    if (rateLimitViolationCount > 100) securityScore -= 10;
    if (rateLimitViolationCount > 500) securityScore -= 20;
    
    // Get total users count
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = Number(totalUsersResult[0]?.count || 0);
    
    // Get recent security events (last 10)
    const recentEvents = await db
      .select()
      .from(securityAuditLogs)
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(10);
    
    return {
      totalUsers,
      activeSessionsCount: totalSessions,
      failedLoginsLast24h: failedLogins24h,
      blockedIpsCount: blockedIps,
      securityScore: Math.max(0, securityScore),
      recentEvents
    };
  }
}

// In-memory storage implementation for when database is unavailable
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private gardens = new Map<string, Garden>();
  private plants = new Map<string, Plant>();
  private userPlantCollections = new Map<string, UserPlantCollection[]>();
  private gardenPlants = new Map<string, GardenPlant[]>();
  private plantDoctorSessions = new Map<string, PlantDoctorSession[]>();
  private designGenerations = new Map<string, DesignGeneration[]>();
  private climateDataMap = new Map<string, ClimateData>();
  private fileVaultItems = new Map<string, FileVault>();
  private scrapingProgressMap = new Map<string, ScrapingProgress>();
  private todoTasksMap = new Map<string, TodoTask>();
  private securityAuditLogsArray: SecurityAuditLog[] = [];
  private failedLoginAttemptsMap = new Map<string, FailedLoginAttempt[]>();
  private activeSessionsMap = new Map<string, ActiveSession>();
  private ipAccessControlArray: IpAccessControl[] = [];
  private securitySettingsMap = new Map<string, SecuritySetting>();
  private rateLimitViolationsArray: RateLimitViolation[] = [];
  private securityRecommendationsMap = new Map<string, SecurityRecommendation>();

  constructor() {
    console.log('🔶 MemStorage initialized - Data will NOT persist across restarts');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email ?? existingUser?.email ?? null,
      firstName: userData.firstName ?? existingUser?.firstName ?? null,
      lastName: userData.lastName ?? existingUser?.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? existingUser?.profileImageUrl ?? null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
      stripeCustomerId: userData.stripeCustomerId ?? existingUser?.stripeCustomerId ?? null,
      stripeSubscriptionId: userData.stripeSubscriptionId ?? existingUser?.stripeSubscriptionId ?? null,
      subscriptionStatus: userData.subscriptionStatus ?? existingUser?.subscriptionStatus ?? null,
      userTier: userData.userTier ?? existingUser?.userTier ?? 'free',
      designCredits: userData.designCredits ?? existingUser?.designCredits ?? 1,
      isAdmin: userData.isAdmin ?? existingUser?.isAdmin ?? false
    };
    this.users.set(userData.id!, user);
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.stripeCustomerId = stripeCustomerId;
    user.stripeSubscriptionId = stripeSubscriptionId;
    user.updatedAt = new Date();
    return user;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    Object.assign(user, data);
    user.updatedAt = new Date();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Garden operations
  async getGarden(id: string): Promise<Garden | undefined> {
    return this.gardens.get(id);
  }

  async getUserGardens(userId: string): Promise<Garden[]> {
    return Array.from(this.gardens.values())
      .filter(g => g.userId === userId)
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  }

  async createGarden(garden: InsertGarden): Promise<Garden> {
    const newGarden: Garden = {
      id: this.generateId(),
      name: garden.name,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: garden.userId,
      location: garden.location,
      units: garden.units || 'metric',
      shape: garden.shape,
      dimensions: garden.dimensions,
      slopePercentage: garden.slopePercentage || null,
      slopeDirection: garden.slopeDirection || null,
      northOrientation: garden.northOrientation || null,
      pointOfView: garden.pointOfView || 'bird_eye',
      sunExposure: garden.sunExposure || null,
      soilType: garden.soilType || null,
      soilPh: garden.soilPh || null,
      hasSoilAnalysis: garden.hasSoilAnalysis || false,
      soilAnalysis: garden.soilAnalysis || null,
      hardiness_zone: garden.hardiness_zone || null,
      usdaZone: garden.usdaZone || null,
      rhsZone: garden.rhsZone || null,
      hardinessCategory: garden.hardinessCategory || null,
      climate_data: garden.climate_data || null,
      preferences: garden.preferences || null,
      design_approach: garden.design_approach || 'ai',
      layout_data: garden.layout_data || null,
      ai_generated: garden.ai_generated || false,
      status: garden.status || 'draft'
    };
    this.gardens.set(newGarden.id, newGarden);
    return newGarden;
  }

  async updateGarden(id: string, garden: Partial<InsertGarden>): Promise<Garden> {
    const existing = this.gardens.get(id);
    if (!existing) throw new Error('Garden not found');
    Object.assign(existing, garden, { updatedAt: new Date() });
    return existing;
  }

  async deleteGarden(id: string): Promise<void> {
    this.gardens.delete(id);
  }

  // Plant operations
  async getPlant(id: string): Promise<Plant | undefined> {
    return this.plants.get(id);
  }

  async getAllPlants(): Promise<Plant[]> {
    return Array.from(this.plants.values());
  }

  async searchPlants(query: string, filters?: {
    type?: string;
    hardiness_zone?: string;
    sun_requirements?: string;
    pet_safe?: boolean;
  }): Promise<Plant[]> {
    let results = Array.from(this.plants.values());
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(p => 
        p.commonName?.toLowerCase().includes(lowerQuery) ||
        p.scientificName?.toLowerCase().includes(lowerQuery)
      );
    }
    
    if (filters?.type) {
      results = results.filter(p => p.type === filters.type);
    }
    
    if (filters?.sun_requirements) {
      results = results.filter(p => 
        p.sunlight && (p.sunlight as string[]).includes(filters.sun_requirements!)
      );
    }
    
    if (filters?.pet_safe !== undefined) {
      results = results.filter(p => p.petSafe === filters.pet_safe);
    }
    
    return results;
  }

  async advancedSearchPlants(filters: any): Promise<Plant[]> {
    let results = Array.from(this.plants.values());
    
    // Apply filters similar to searchPlants but with more options
    if (filters.genus || filters.species || filters.cultivar) {
      const searchTerms = [filters.genus, filters.species, filters.cultivar].filter(Boolean).map(s => s.toLowerCase());
      results = results.filter(p => {
        const plantText = [
          p.genus, p.species, p.cultivar, p.commonName, p.scientificName
        ].filter(Boolean).join(' ').toLowerCase();
        return searchTerms.some(term => plantText.includes(term));
      });
    }
    
    if (filters.plantType) {
      results = results.filter(p => p.type === filters.plantType);
    }
    
    if (filters.minHeight) {
      results = results.filter(p => p.heightMaxCm && p.heightMaxCm >= filters.minHeight);
    }
    
    if (filters.maxHeight && filters.maxHeight !== 0) {
      results = results.filter(p => p.heightMinCm && p.heightMinCm <= filters.maxHeight);
    }
    
    return results.slice(0, 100); // Limit to 100 results
  }

  async createPlant(plant: InsertPlant): Promise<Plant> {
    const newPlant: Plant = {
      ...plant,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      verificationStatus: plant.verificationStatus || 'pending',
      perenualId: plant.perenualId ?? null,
      externalId: plant.externalId ?? null
    } as Plant;
    this.plants.set(newPlant.id, newPlant);
    return newPlant;
  }

  async updatePlant(id: string, plant: Partial<InsertPlant>): Promise<Plant> {
    const existing = this.plants.get(id);
    if (!existing) throw new Error('Plant not found');
    Object.assign(existing, plant, { updatedAt: new Date() });
    return existing;
  }

  async getPendingPlants(): Promise<Plant[]> {
    return Array.from(this.plants.values()).filter(p => p.verificationStatus === 'pending');
  }

  async verifyPlant(id: string): Promise<Plant> {
    const plant = this.plants.get(id);
    if (!plant) throw new Error('Plant not found');
    plant.verificationStatus = 'verified';
    plant.verifiedAt = new Date();
    plant.updatedAt = new Date();
    return plant;
  }

  async deletePlant(id: string): Promise<void> {
    this.plants.delete(id);
  }

  // User plant collection operations
  async getUserPlantCollection(userId: string): Promise<UserPlantCollection[]> {
    const collections = this.userPlantCollections.get(userId) || [];
    return collections.map(c => ({
      ...c,
      plant: this.plants.get(c.plantId)
    }));
  }

  async getUserCollectionCount(userId: string): Promise<number> {
    return (this.userPlantCollections.get(userId) || []).length;
  }

  async canAddToCollection(userId: string): Promise<{ canAdd: boolean; limit: number; current: number }> {
    const user = await this.getUser(userId);
    if (!user) return { canAdd: false, limit: 0, current: 0 };
    
    const limits = { free: 15, pay_per_design: 100, premium: -1 };
    const userTier = user.userTier || 'free';
    const limit = limits[userTier as keyof typeof limits];
    const current = await this.getUserCollectionCount(userId);
    
    if (limit === -1) return { canAdd: true, limit: -1, current };
    return { canAdd: current < limit, limit, current };
  }

  async addToUserCollection(collection: InsertUserPlantCollection): Promise<UserPlantCollection> {
    const { canAdd } = await this.canAddToCollection(collection.userId);
    if (!canAdd) throw new Error('Collection limit reached');
    
    const userCollections = this.userPlantCollections.get(collection.userId) || [];
    if (userCollections.some(c => c.plantId === collection.plantId)) {
      throw new Error('Plant already in collection');
    }
    
    const newCollection: UserPlantCollection = {
      id: this.generateId(),
      userId: collection.userId,
      plantId: collection.plantId,
      notes: collection.notes ?? null,
      isFavorite: collection.isFavorite ?? false,
      createdAt: new Date()
    };
    userCollections.push(newCollection);
    this.userPlantCollections.set(collection.userId, userCollections);
    return newCollection;
  }

  async removeFromUserCollection(userId: string, plantId: string): Promise<void> {
    const collections = this.userPlantCollections.get(userId) || [];
    this.userPlantCollections.set(
      userId,
      collections.filter(c => c.plantId !== plantId)
    );
  }

  // Garden plant operations
  async getGardenPlants(gardenId: string): Promise<GardenPlant[]> {
    return this.gardenPlants.get(gardenId) || [];
  }

  async addPlantToGarden(gardenPlant: InsertGardenPlant): Promise<GardenPlant> {
    const newGardenPlant: GardenPlant = {
      id: this.generateId(),
      gardenId: gardenPlant.gardenId,
      plantId: gardenPlant.plantId,
      position_x: gardenPlant.position_x ?? null,
      position_y: gardenPlant.position_y ?? null,
      quantity: gardenPlant.quantity ?? 1,
      notes: gardenPlant.notes ?? null,
      createdAt: new Date()
    };
    const plants = this.gardenPlants.get(gardenPlant.gardenId) || [];
    plants.push(newGardenPlant);
    this.gardenPlants.set(gardenPlant.gardenId, plants);
    return newGardenPlant;
  }

  async updateGardenPlant(id: string, gardenPlant: Partial<InsertGardenPlant>): Promise<GardenPlant> {
    for (const [gardenId, plants] of Array.from(this.gardenPlants.entries())) {
      const plant = plants.find((p: any) => p.id === id);
      if (plant) {
        Object.assign(plant, gardenPlant);
        return plant;
      }
    }
    throw new Error('Garden plant not found');
  }

  async removePlantFromGarden(id: string): Promise<void> {
    for (const [gardenId, plants] of Array.from(this.gardenPlants.entries())) {
      const index = plants.findIndex((p: any) => p.id === id);
      if (index !== -1) {
        plants.splice(index, 1);
        return;
      }
    }
  }

  // Plant doctor operations
  async createPlantDoctorSession(session: InsertPlantDoctorSession): Promise<PlantDoctorSession> {
    const newSession: PlantDoctorSession = {
      id: this.generateId(),
      createdAt: new Date(),
      userId: session.userId ?? null,
      sessionType: session.sessionType,
      imageUrl: session.imageUrl ?? null,
      aiAnalysis: session.aiAnalysis ?? null,
      confidence: session.confidence ?? null,
      identifiedPlantId: session.identifiedPlantId ?? null,
      userFeedback: session.userFeedback ?? null
    };
    const userId = session.userId || 'anonymous';
    const sessions = this.plantDoctorSessions.get(userId) || [];
    sessions.push(newSession);
    this.plantDoctorSessions.set(userId, sessions);
    return newSession;
  }

  async getUserPlantDoctorSessions(userId: string): Promise<PlantDoctorSession[]> {
    return (this.plantDoctorSessions.get(userId) || [])
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updatePlantDoctorSession(id: string, session: Partial<InsertPlantDoctorSession>): Promise<PlantDoctorSession> {
    for (const sessions of Array.from(this.plantDoctorSessions.values())) {
      const found = sessions.find((s: any) => s.id === id);
      if (found) {
        Object.assign(found, session);
        return found;
      }
    }
    throw new Error('Session not found');
  }

  // Design generation operations
  async getUserDesignGenerations(userId: string): Promise<DesignGeneration[]> {
    return (this.designGenerations.get(userId) || [])
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createDesignGeneration(generation: InsertDesignGeneration): Promise<DesignGeneration> {
    const newGeneration: DesignGeneration = {
      id: this.generateId(),
      createdAt: new Date(),
      userId: generation.userId,
      gardenId: generation.gardenId ?? null,
      styleId: generation.styleId,
      generationType: generation.generationType,
      success: generation.success ?? true,
      errorMessage: generation.errorMessage ?? null,
      tokensUsed: generation.tokensUsed ?? null
    };
    const generations = this.designGenerations.get(generation.userId) || [];
    generations.push(newGeneration);
    this.designGenerations.set(generation.userId, generations);
    return newGeneration;
  }

  async getDesignGenerationsByStyle(userId: string, styleId: string): Promise<DesignGeneration[]> {
    return (this.designGenerations.get(userId) || [])
      .filter(g => g.styleId === styleId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Climate data operations
  async getClimateData(location: string): Promise<ClimateData | undefined> {
    return this.climateDataMap.get(location);
  }

  async createClimateData(climate: InsertClimateData): Promise<ClimateData> {
    const newClimate: ClimateData = {
      id: this.generateId(),
      location: climate.location,
      hardiness_zone: climate.hardiness_zone ?? null,
      usda_zone: climate.usda_zone ?? null,
      rhs_zone: climate.rhs_zone ?? null,
      ahs_heat_zone: climate.ahs_heat_zone ?? null,
      koppen_climate: climate.koppen_climate ?? null,
      hardiness_category: climate.hardiness_category ?? null,
      temperature_range: climate.temperature_range ?? null,
      annual_rainfall: climate.annual_rainfall ?? null,
      avg_temp_min: climate.avg_temp_min ?? null,
      avg_temp_max: climate.avg_temp_max ?? null,
      avg_humidity: climate.avg_humidity ?? null,
      avg_wind_speed: climate.avg_wind_speed ?? null,
      sunshine_percent: climate.sunshine_percent ?? null,
      wettest_month: climate.wettest_month ?? null,
      wettest_month_precip: climate.wettest_month_precip ?? null,
      driest_month: climate.driest_month ?? null,
      driest_month_precip: climate.driest_month_precip ?? null,
      monthly_precip_pattern: climate.monthly_precip_pattern ?? null,
      frost_dates: climate.frost_dates ?? null,
      growing_season: climate.growing_season ?? null,
      monthly_data: climate.monthly_data ?? null,
      gardening_advice: climate.gardening_advice ?? null,
      data_source: climate.data_source ?? 'visual_crossing',
      data_range: climate.data_range ?? null,
      lastUpdated: new Date()
    };
    this.climateDataMap.set(climate.location, newClimate);
    return newClimate;
  }

  async updateClimateData(location: string, climate: Partial<InsertClimateData>): Promise<ClimateData> {
    const existing = this.climateDataMap.get(location);
    if (!existing) throw new Error('Climate data not found');
    Object.assign(existing, climate, { lastUpdated: new Date() });
    return existing;
  }

  // File vault operations
  async createVaultItem(vaultItem: InsertFileVault): Promise<FileVault> {
    const newItem: FileVault = {
      id: this.generateId(),
      createdAt: new Date(),
      userId: vaultItem.userId,
      fileName: vaultItem.fileName,
      fileType: vaultItem.fileType,
      contentType: vaultItem.contentType,
      filePath: vaultItem.filePath,
      metadata: vaultItem.metadata ?? null,
      expiresAt: vaultItem.expiresAt ?? null,
      lastAccessedAt: null,
      accessCount: 0
    };
    this.fileVaultItems.set(newItem.id, newItem);
    return newItem;
  }

  async getUserVaultItems(userId: string): Promise<FileVault[]> {
    return Array.from(this.fileVaultItems.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getVaultItem(id: string): Promise<FileVault | undefined> {
    return this.fileVaultItems.get(id);
  }

  async updateVaultAccessTime(id: string): Promise<void> {
    const item = this.fileVaultItems.get(id);
    if (item) {
      item.lastAccessedAt = new Date();
      item.accessCount = (item.accessCount || 0) + 1;
    }
  }

  async deleteExpiredVaultItems(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [id, item] of Array.from(this.fileVaultItems.entries())) {
      if (item.expiresAt && item.expiresAt <= now) {
        this.fileVaultItems.delete(id);
        count++;
      }
    }
    return count;
  }

  // Visualization data operations
  async getVisualizationData(gardenId: string): Promise<any | undefined> {
    const garden = this.gardens.get(gardenId);
    if (!garden) return undefined;
    const layoutData = garden.layout_data as any || {};
    return {
      iterationCount: layoutData.visualizationIterationCount || 0,
      savedImages: layoutData.savedSeasonalImages || [],
      lastSaved: layoutData.lastSeasonalImagesSaved || null
    };
  }

  async updateVisualizationData(gardenId: string, data: any): Promise<void> {
    const garden = this.gardens.get(gardenId);
    if (!garden) return;
    const layoutData = garden.layout_data as any || {};
    if (data.iterationCount !== undefined) {
      layoutData.visualizationIterationCount = data.iterationCount;
    }
    if (data.savedImages !== undefined) {
      layoutData.savedSeasonalImages = data.savedImages;
    }
    if (data.lastSaved !== undefined) {
      layoutData.lastSeasonalImagesSaved = data.lastSaved;
    }
    garden.layout_data = layoutData;
  }

  // Scraping progress operations
  async getScrapingProgress(url: string): Promise<ScrapingProgress | undefined> {
    return this.scrapingProgressMap.get(url);
  }

  async createScrapingProgress(progress: InsertScrapingProgress): Promise<ScrapingProgress> {
    const newProgress: ScrapingProgress = {
      id: this.generateId(),
      url: progress.url,
      status: progress.status || 'in_progress',
      totalBatches: progress.totalBatches ?? 0,
      completedBatches: progress.completedBatches ?? 0,
      totalPlants: progress.totalPlants ?? 0,
      savedPlants: progress.savedPlants ?? 0,
      duplicatePlants: progress.duplicatePlants ?? 0,
      failedPlants: progress.failedPlants ?? 0,
      lastProductUrl: progress.lastProductUrl ?? null,
      productUrls: progress.productUrls ?? null,
      errors: progress.errors ?? null,
      startedAt: new Date(),
      completedAt: null,
      updatedAt: new Date()
    };
    this.scrapingProgressMap.set(progress.url, newProgress);
    return newProgress;
  }

  async updateScrapingProgress(id: string, progress: Partial<InsertScrapingProgress>): Promise<ScrapingProgress> {
    for (const item of Array.from(this.scrapingProgressMap.values())) {
      if (item.id === id) {
        Object.assign(item, progress, { updatedAt: new Date() });
        return item;
      }
    }
    throw new Error('Scraping progress not found');
  }

  async finalizeScrapingProgress(id: string, stats: any): Promise<ScrapingProgress> {
    for (const item of Array.from(this.scrapingProgressMap.values())) {
      if (item.id === id) {
        item.totalPlants = stats.totalPlants;
        item.savedPlants = stats.savedPlants;
        item.duplicatePlants = stats.duplicatePlants;
        item.failedPlants = stats.failedPlants;
        item.status = 'completed';
        item.completedAt = new Date();
        item.updatedAt = new Date();
        return item;
      }
    }
    throw new Error('Scraping progress not found');
  }

  async getPlantByScientificName(scientificName: string): Promise<Plant | undefined> {
    return Array.from(this.plants.values()).find(p => p.scientificName === scientificName);
  }

  async getPlantByExternalId(externalId: string): Promise<Plant | undefined> {
    return Array.from(this.plants.values()).find(p => p.externalId === externalId);
  }

  async bulkCreatePlants(plants: InsertPlant[]): Promise<{ saved: number; duplicates: number; errors: number }> {
    let saved = 0, duplicates = 0, errors = 0;
    for (const plant of plants) {
      try {
        if (plant.scientificName && await this.getPlantByScientificName(plant.scientificName)) {
          duplicates++;
        } else {
          await this.createPlant(plant);
          saved++;
        }
      } catch {
        errors++;
      }
    }
    return { saved, duplicates, errors };
  }

  // Todo task operations
  async getAllTodoTasks(): Promise<TodoTask[]> {
    return Array.from(this.todoTasksMap.values());
  }

  async createTodoTask(task: InsertTodoTask): Promise<TodoTask> {
    const newTask: TodoTask = {
      ...task,
      id: this.generateId(),
      createdAt: new Date()
    };
    this.todoTasksMap.set(newTask.id, newTask);
    return newTask;
  }

  async deleteTodoTask(id: string): Promise<void> {
    this.todoTasksMap.delete(id);
  }

  // Security operations
  async createSecurityAuditLog(log: InsertSecurityAuditLog): Promise<SecurityAuditLog> {
    const newLog: SecurityAuditLog = {
      id: this.generateId(),
      createdAt: new Date(),
      userId: log.userId ?? null,
      eventType: log.eventType,
      eventDescription: log.eventDescription,
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      severity: log.severity ?? 'info',
      success: log.success ?? true,
      metadata: log.metadata ?? null
    };
    this.securityAuditLogsArray.push(newLog);
    return newLog;
  }

  async getSecurityAuditLogs(filters?: any): Promise<SecurityAuditLog[]> {
    let logs = [...this.securityAuditLogsArray];
    if (filters?.userId) logs = logs.filter(l => l.userId === filters.userId);
    if (filters?.eventType) logs = logs.filter(l => l.eventType === filters.eventType);
    if (filters?.severity) logs = logs.filter(l => l.severity === filters.severity);
    if (filters?.limit) logs = logs.slice(0, filters.limit);
    return logs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async recordFailedLoginAttempt(attempt: InsertFailedLoginAttempt): Promise<FailedLoginAttempt> {
    const newAttempt: FailedLoginAttempt = {
      id: this.generateId(),
      createdAt: new Date(),
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent ?? null,
      attemptedEmail: attempt.attemptedEmail ?? null,
      attemptCount: 1,
      lastAttempt: new Date(),
      blockedUntil: attempt.blockedUntil ?? null
    };
    const attempts = this.failedLoginAttemptsMap.get(attempt.ipAddress) || [];
    attempts.push(newAttempt);
    this.failedLoginAttemptsMap.set(attempt.ipAddress, attempts);
    return newAttempt;
  }

  async getFailedLoginAttempts(ipAddress?: string): Promise<FailedLoginAttempt[]> {
    if (ipAddress) {
      return this.failedLoginAttemptsMap.get(ipAddress) || [];
    }
    const all: FailedLoginAttempt[] = [];
    for (const attempts of Array.from(this.failedLoginAttemptsMap.values())) {
      all.push(...attempts);
    }
    return all;
  }

  async clearFailedLoginAttempts(ipAddress: string): Promise<void> {
    this.failedLoginAttemptsMap.delete(ipAddress);
  }

  async createActiveSession(session: InsertActiveSession): Promise<ActiveSession> {
    const newSession: ActiveSession = {
      id: this.generateId(),
      createdAt: new Date(),
      userId: session.userId,
      expiresAt: session.expiresAt ?? null,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent ?? null,
      sessionToken: session.sessionToken,
      lastActivity: new Date(),
      loginTime: session.loginTime ?? new Date(),
      isActive: true,
      revokedAt: null,
      revokedBy: null
    };
    this.activeSessionsMap.set(session.sessionToken, newSession);
    return newSession;
  }

  async getActiveSessions(userId?: string): Promise<ActiveSession[]> {
    const sessions = Array.from(this.activeSessionsMap.values());
    if (userId) {
      return sessions.filter(s => s.userId === userId);
    }
    return sessions;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = Array.from(this.activeSessionsMap.values()).find(s => s.sessionToken === sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  async revokeSession(sessionId: string, revokedBy: string): Promise<void> {
    const session = Array.from(this.activeSessionsMap.values()).find(s => s.sessionToken === sessionId);
    if (session) {
      session.isActive = false;
      session.revokedAt = new Date();
      session.revokedBy = revokedBy;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [id, session] of Array.from(this.activeSessionsMap.entries())) {
      if (session.expiresAt && session.expiresAt <= now) {
        this.activeSessionsMap.delete(id);
        count++;
      }
    }
    return count;
  }

  async addIpAccessControl(control: InsertIpAccessControl): Promise<IpAccessControl> {
    const newControl: IpAccessControl = {
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: null,
      type: control.type,
      ipAddress: control.ipAddress,
      ipRange: control.ipRange ?? null,
      reason: control.reason ?? null,
      addedBy: control.addedBy ?? null,
      expiresAt: control.expiresAt ?? null,
      isActive: true
    };
    this.ipAccessControlArray.push(newControl);
    return newControl;
  }

  async getIpAccessControl(type?: 'block' | 'allow'): Promise<IpAccessControl[]> {
    if (type) {
      return this.ipAccessControlArray.filter(c => c.type === type && c.isActive);
    }
    return this.ipAccessControlArray.filter(c => c.isActive);
  }

  async checkIpAccess(ipAddress: string): Promise<{ allowed: boolean; reason?: string }> {
    const blocked = this.ipAccessControlArray.find(c => 
      c.type === 'block' && c.isActive && c.ipAddress === ipAddress
    );
    if (blocked) {
      return { allowed: false, reason: blocked.reason || 'IP blocked' };
    }
    return { allowed: true };
  }

  async removeIpAccessControl(id: string): Promise<void> {
    const index = this.ipAccessControlArray.findIndex(c => c.id === id);
    if (index !== -1) {
      this.ipAccessControlArray.splice(index, 1);
    }
  }

  async getSecuritySettings(): Promise<SecuritySetting[]> {
    return Array.from(this.securitySettingsMap.values());
  }

  async updateSecuritySetting(key: string, value: any, updatedBy: string): Promise<SecuritySetting> {
    let setting = this.securitySettingsMap.get(key);
    if (!setting) {
      setting = {
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        key,
        value,
        lastModifiedBy: updatedBy
      };
    } else {
      setting.value = value;
      setting.updatedAt = new Date();
      setting.lastModifiedBy = updatedBy;
    }
    this.securitySettingsMap.set(key, setting);
    return setting;
  }

  async recordRateLimitViolation(violation: InsertRateLimitViolation): Promise<RateLimitViolation> {
    const newViolation: RateLimitViolation = {
      id: this.generateId(),
      createdAt: new Date(),
      userId: violation.userId ?? null,
      ipAddress: violation.ipAddress,
      endpoint: violation.endpoint,
      violationCount: violation.violationCount ?? 1,
      windowStart: new Date(),
      windowEnd: violation.windowEnd ?? null,
      blocked: violation.blocked ?? false,
      blockedUntil: violation.blockedUntil ?? null
    };
    this.rateLimitViolationsArray.push(newViolation);
    return newViolation;
  }

  async getRateLimitViolations(filters?: any): Promise<RateLimitViolation[]> {
    let violations = [...this.rateLimitViolationsArray];
    if (filters?.ipAddress) violations = violations.filter(v => v.ipAddress === filters.ipAddress);
    if (filters?.endpoint) violations = violations.filter(v => v.endpoint === filters.endpoint);
    return violations;
  }

  async getSecurityRecommendations(status?: string): Promise<SecurityRecommendation[]> {
    const recs = Array.from(this.securityRecommendationsMap.values());
    if (status) {
      return recs.filter(r => r.status === status);
    }
    return recs;
  }

  async updateRecommendationStatus(id: string, status: string, dismissedBy?: string): Promise<SecurityRecommendation> {
    const rec = this.securityRecommendationsMap.get(id);
    if (!rec) throw new Error('Recommendation not found');
    rec.status = status;
    if (dismissedBy) rec.dismissedBy = dismissedBy;
    if (status === 'dismissed') rec.dismissedAt = new Date();
    return rec;
  }

  async createSecurityRecommendation(recommendation: InsertSecurityRecommendation): Promise<SecurityRecommendation> {
    const newRec: SecurityRecommendation = {
      id: this.generateId(),
      title: recommendation.title,
      description: recommendation.description,
      severity: recommendation.severity,
      category: recommendation.category,
      status: 'pending',
      priority: recommendation.priority ?? 0,
      implementationGuide: recommendation.implementationGuide ?? null,
      dismissedBy: null,
      dismissedAt: null,
      dismissalReason: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.securityRecommendationsMap.set(newRec.id, newRec);
    return newRec;
  }

  async getSecurityStats(): Promise<any> {
    const totalUsers = this.users.size;
    const activeSessionsCount = Array.from(this.activeSessionsMap.values())
      .filter(s => s.isActive).length;
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedLoginsLast24h = Array.from(this.failedLoginAttemptsMap.values())
      .flat()
      .filter(a => a.lastAttempt && a.lastAttempt >= twentyFourHoursAgo).length;
    
    const blockedIpsCount = this.ipAccessControlArray
      .filter(c => c.type === 'block' && c.isActive).length;
    
    let securityScore = 100;
    if (failedLoginsLast24h > 10) securityScore -= 10;
    if (failedLoginsLast24h > 50) securityScore -= 20;
    if (blockedIpsCount > 5) securityScore -= 5;
    if (blockedIpsCount > 20) securityScore -= 10;
    
    const recentEvents = this.securityAuditLogsArray
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 10);
    
    return {
      totalUsers,
      activeSessionsCount,
      failedLoginsLast24h,
      blockedIpsCount,
      securityScore: Math.max(0, securityScore),
      recentEvents
    };
  }
}

// Database connectivity test and fallback logic
let storage: IStorage;

// Function to test database connectivity
async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Try to import db and run a simple query
    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');
    
    // Run a simple test query
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    // Database is not available
    console.error('Database connection test failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Initialize storage with fallback
(async () => {
  // Check for Supabase HTTP API configuration first - Use resilient version
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { ResilientSupabaseStorage } = await import('./resilientSupabaseStorage');
      storage = new ResilientSupabaseStorage();
      console.log('✅ Using Resilient Supabase HTTP API for storage with retry logic and circuit breaker');
      return;
    } catch (error) {
      console.error('Failed to initialize Resilient Supabase storage:', error);
      // Fall through to regular Supabase storage
    }
  }
  
  // Try regular Supabase storage if resilient version fails
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const { SupabaseHttpStorage } = await import('./supabaseHttpStorage');
      storage = new SupabaseHttpStorage();
      console.log('✅ Using Supabase HTTP API for storage (without retry logic)');
      return;
    } catch (error) {
      console.error('Failed to initialize Supabase storage:', error);
      // Fall through to other options
    }
  }
  
  // Try direct database connection (for local development or other PostgreSQL)
  const isDatabaseAvailable = await testDatabaseConnection();
  
  if (isDatabaseAvailable) {
    console.log('✅ Using PostgreSQL database for storage');
    storage = new DatabaseStorage();
  } else {
    console.warn('⚠️  Database unavailable, using in-memory storage');
    console.warn('⚠️  Data will NOT persist across server restarts');
    console.warn('⚠️  This is a fallback mode - configure a database for production use');
    storage = new MemStorage();
  }
})();

// Export storage (will be undefined briefly during initialization)
export { storage };
