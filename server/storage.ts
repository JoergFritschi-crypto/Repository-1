import {
  users,
  gardens,
  plants,
  userPlantCollections,
  gardenPlants,
  plantDoctorSessions,
  climateData,
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
  type ClimateData,
  type InsertClimateData,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, or, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  
  // Garden operations
  getGarden(id: string): Promise<Garden | undefined>;
  getUserGardens(userId: string): Promise<Garden[]>;
  createGarden(garden: InsertGarden): Promise<Garden>;
  updateGarden(id: string, garden: Partial<InsertGarden>): Promise<Garden>;
  deleteGarden(id: string): Promise<void>;
  
  // Plant operations
  getPlant(id: string): Promise<Plant | undefined>;
  searchPlants(query: string, filters?: {
    type?: string;
    hardiness_zone?: string;
    sun_requirements?: string;
    pet_safe?: boolean;
  }): Promise<Plant[]>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: string, plant: Partial<InsertPlant>): Promise<Plant>;
  getPendingPlants(): Promise<Plant[]>;
  verifyPlant(id: string): Promise<Plant>;
  
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
  
  // Climate data operations
  getClimateData(location: string): Promise<ClimateData | undefined>;
  createClimateData(climate: InsertClimateData): Promise<ClimateData>;
  updateClimateData(location: string, climate: Partial<InsertClimateData>): Promise<ClimateData>;
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
    return await db.select().from(plants).where(eq(plants.verification_status, "pending"));
  }

  async verifyPlant(id: string): Promise<Plant> {
    const [verifiedPlant] = await db
      .update(plants)
      .set({ verification_status: "verified", updatedAt: new Date() })
      .where(eq(plants.id, id))
      .returning();
    return verifiedPlant;
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
}

export const storage = new DatabaseStorage();
