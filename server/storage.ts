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
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, or, desc, isNotNull, lte, sql, gte } from "drizzle-orm";

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
  advancedSearchPlants(filters: any): Promise<Plant[]>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: string, plant: Partial<InsertPlant>): Promise<Plant>;
  getPendingPlants(): Promise<Plant[]>;
  verifyPlant(id: string): Promise<Plant>;
  deletePlant(id: string): Promise<void>;
  
  // User plant collection operations
  getUserPlantCollection(userId: string): Promise<UserPlantCollection[]>;
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
  getVisualizationData(gardenId: number): Promise<any | undefined>;
  updateVisualizationData(gardenId: number, data: any): Promise<void>;
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
    let queryBuilder = db.select().from(plants);
    
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
      conditions.push(eq(plants.sun_requirements, filters.sun_requirements as any));
    }
    
    if (filters?.pet_safe !== undefined) {
      conditions.push(eq(plants.pet_safe, filters.pet_safe));
    }
    
    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }
    
    return await queryBuilder.orderBy(plants.commonName);
  }

  async advancedSearchPlants(filters: any): Promise<Plant[]> {
    const conditions = [];
    
    // Text fields
    if (filters.genus) conditions.push(ilike(plants.genus, `%${filters.genus}%`));
    if (filters.species) conditions.push(ilike(plants.species, `%${filters.species}%`));
    if (filters.cultivar) conditions.push(ilike(plants.cultivar, `%${filters.cultivar}%`));
    
    // Single selection fields
    if (filters.plantType) conditions.push(eq(plants.plantType, filters.plantType));
    if (filters.sunlight) {
      const sunMap: any = {
        'Full Sun': 'full sun',
        'Partial Sun': 'partial sun',
        'Partial Shade': 'partial shade',
        'Full Shade': 'full shade'
      };
      conditions.push(eq(plants.sunRequirements, sunMap[filters.sunlight] || filters.sunlight));
    }
    if (filters.soilType) conditions.push(ilike(plants.soilType, `%${filters.soilType}%`));
    if (filters.maintenance) conditions.push(eq(plants.maintenanceLevel, filters.maintenance.toLowerCase()));
    if (filters.watering) {
      const waterMap: any = {
        'Minimal': 'low',
        'Average': 'medium',
        'Frequent': 'high'
      };
      conditions.push(eq(plants.wateringNeeds, waterMap[filters.watering] || filters.watering));
    }
    
    // Range fields
    if (filters.minHeight) conditions.push(gte(plants.heightMax, filters.minHeight));
    if (filters.maxHeight) conditions.push(lte(plants.heightMin, filters.maxHeight));
    if (filters.minSpread) conditions.push(gte(plants.spreadMax, filters.minSpread));
    if (filters.maxSpread) conditions.push(lte(plants.spreadMin, filters.maxSpread));
    
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
      if (filters.specialFeatures.includes('Fragrant')) {
        featureConditions.push(eq(plants.fragrant, true));
      }
      if (featureConditions.length > 0) {
        conditions.push(or(...featureConditions));
      }
    }
    
    // Wildlife attractants
    if (filters.attractsWildlife && filters.attractsWildlife.length > 0) {
      const wildlifeConditions = [];
      if (filters.attractsWildlife.includes('Butterflies')) {
        wildlifeConditions.push(eq(plants.attractsButterflies, true));
      }
      if (filters.attractsWildlife.includes('Birds')) {
        wildlifeConditions.push(eq(plants.attractsBirds, true));
      }
      if (filters.attractsWildlife.includes('Bees')) {
        wildlifeConditions.push(eq(plants.attractsBees, true));
      }
      if (filters.attractsWildlife.includes('Hummingbirds')) {
        wildlifeConditions.push(eq(plants.attractsHummingbirds, true));
      }
      if (wildlifeConditions.length > 0) {
        conditions.push(or(...wildlifeConditions));
      }
    }
    
    // Bloom months
    if (filters.bloomMonths && filters.bloomMonths.length > 0) {
      const monthConditions = filters.bloomMonths.map((month: string) => {
        const monthName = month.replace('Early ', '').replace('Late ', '').toLowerCase();
        return ilike(plants.bloomTime, `%${monthName}%`);
      });
      if (monthConditions.length > 0) {
        conditions.push(or(...monthConditions));
      }
    }
    
    // Colors
    if (filters.colors && filters.colors.length > 0) {
      const colorConditions = filters.colors.map((color: string) => 
        ilike(plants.flowerColor, `%${color}%`)
      );
      if (colorConditions.length > 0) {
        conditions.push(or(...colorConditions));
      }
    }
    
    // Only return verified plants
    conditions.push(eq(plants.verificationStatus, 'verified'));
    
    const result = conditions.length > 0
      ? await db.select().from(plants).where(and(...conditions)).limit(100)
      : await db.select().from(plants).where(eq(plants.verificationStatus, 'verified')).limit(100);
      
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
      .set({ verificationStatus: "verified", updatedAt: new Date() })
      .where(eq(plants.id, id))
      .returning();
    return verifiedPlant;
  }

  async deletePlant(id: string): Promise<void> {
    await db.delete(plants).where(eq(plants.id, id));
  }

  // User plant collection operations
  async getUserPlantCollection(userId: string): Promise<UserPlantCollection[]> {
    return await db.select().from(userPlantCollections).where(eq(userPlantCollections.userId, userId));
  }

  async addToUserCollection(collection: InsertUserPlantCollection): Promise<UserPlantCollection> {
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
    return result.count || 0;
  }
  
  // Visualization data operations (stored in garden metadata)
  async getVisualizationData(gardenId: number): Promise<any | undefined> {
    const garden = await this.getGarden(gardenId.toString());
    if (!garden) return undefined;
    
    // Store visualization data in garden's additionalInfo JSON field
    const additionalInfo = garden.additionalInfo as any || {};
    return {
      iterationCount: additionalInfo.visualizationIterationCount || 0,
      savedImages: additionalInfo.savedSeasonalImages || [],
      lastSaved: additionalInfo.lastSeasonalImagesSaved || null
    };
  }
  
  async updateVisualizationData(gardenId: number, data: any): Promise<void> {
    const garden = await this.getGarden(gardenId.toString());
    if (!garden) return;
    
    const additionalInfo = garden.additionalInfo as any || {};
    
    // Update visualization data
    if (data.iterationCount !== undefined) {
      additionalInfo.visualizationIterationCount = data.iterationCount;
    }
    if (data.savedImages !== undefined) {
      additionalInfo.savedSeasonalImages = data.savedImages;
    }
    if (data.lastSaved !== undefined) {
      additionalInfo.lastSeasonalImagesSaved = data.lastSaved;
    }
    
    await db.update(gardens)
      .set({ 
        additionalInfo,
        updatedAt: new Date()
      })
      .where(eq(gardens.id, gardenId.toString()));
  }
}

export const storage = new DatabaseStorage();
