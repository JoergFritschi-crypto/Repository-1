/**
 * Fallback storage mechanism for when Supabase is unavailable
 * Provides in-memory caching with graceful degradation
 */

import {
  type User,
  type Garden,
  type Plant,
  type UserPlantCollection,
  type GardenPlant,
  type PlantDoctorSession,
  type DesignGeneration,
} from "@shared/schema";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class FallbackStorage {
  private cache = new Map<string, CacheEntry<any>>();
  private userCache = new Map<string, User>();
  private gardenCache = new Map<string, Garden[]>();
  private plantCache = new Map<string, Plant>();
  private allPlantsCache: Plant[] | null = null;
  private collectionCache = new Map<string, UserPlantCollection[]>();
  private gardenPlantsCache = new Map<string, GardenPlant[]>();
  
  // TTL in milliseconds
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly USER_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly PLANT_TTL = 30 * 60 * 1000; // 30 minutes
  
  private isEnabled: boolean = false;
  private lastSuccessfulSync: Date | null = null;

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Run cleanup every minute
  }

  /**
   * Enable fallback mode when primary storage fails
   */
  enable(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      console.log('📦 Fallback storage enabled - using in-memory cache');
    }
  }

  /**
   * Disable fallback mode when primary storage recovers
   */
  disable(): void {
    if (this.isEnabled) {
      this.isEnabled = false;
      console.log('✅ Fallback storage disabled - primary storage recovered');
    }
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Set cache with TTL
   */
  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get from cache if valid
   */
  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * User operations
   */
  cacheUser(user: User): void {
    this.userCache.set(user.id, user);
    this.userCache.set(user.replitId || user.id, user); // Cache by both IDs
    if (user.email) {
      this.setCache(`user:email:${user.email}`, user, this.USER_TTL);
    }
    this.setCache(`user:${user.id}`, user, this.USER_TTL);
  }

  getCachedUser(id: string): User | undefined {
    // Try direct cache first
    let user = this.userCache.get(id);
    if (user) return user;

    // Try generic cache
    user = this.getCache<User>(`user:${id}`);
    if (user) {
      this.userCache.set(id, user);
      return user;
    }

    return undefined;
  }

  getCachedUserByEmail(email: string): User | undefined {
    return this.getCache<User>(`user:email:${email}`) || undefined;
  }

  /**
   * Garden operations
   */
  cacheGardens(userId: string, gardens: Garden[]): void {
    this.gardenCache.set(userId, gardens);
    this.setCache(`gardens:${userId}`, gardens, this.DEFAULT_TTL);
    
    // Also cache individual gardens
    gardens.forEach(garden => {
      this.setCache(`garden:${garden.id}`, garden, this.DEFAULT_TTL);
    });
  }

  getCachedGardens(userId: string): Garden[] | null {
    const cached = this.gardenCache.get(userId);
    if (cached) return cached;

    const gardens = this.getCache<Garden[]>(`gardens:${userId}`);
    if (gardens) {
      this.gardenCache.set(userId, gardens);
      return gardens;
    }

    return null;
  }

  getCachedGarden(id: string): Garden | null {
    return this.getCache<Garden>(`garden:${id}`);
  }

  updateCachedGarden(garden: Garden): void {
    this.setCache(`garden:${garden.id}`, garden, this.DEFAULT_TTL);
    
    // Update in user's gardens list if cached
    const userGardens = this.getCachedGardens(garden.userId);
    if (userGardens) {
      const index = userGardens.findIndex(g => g.id === garden.id);
      if (index !== -1) {
        userGardens[index] = garden;
        this.cacheGardens(garden.userId, userGardens);
      }
    }
  }

  /**
   * Plant operations
   */
  cachePlants(plants: Plant[]): void {
    this.allPlantsCache = plants;
    this.setCache('plants:all', plants, this.PLANT_TTL);
    
    // Cache individual plants
    plants.forEach(plant => {
      this.plantCache.set(plant.id, plant);
      this.setCache(`plant:${plant.id}`, plant, this.PLANT_TTL);
    });
  }

  getCachedPlants(): Plant[] | null {
    if (this.allPlantsCache) return this.allPlantsCache;
    
    const plants = this.getCache<Plant[]>('plants:all');
    if (plants) {
      this.allPlantsCache = plants;
      return plants;
    }

    return null;
  }

  getCachedPlant(id: string): Plant | null {
    const cached = this.plantCache.get(id);
    if (cached) return cached;

    const plant = this.getCache<Plant>(`plant:${id}`);
    if (plant) {
      this.plantCache.set(id, plant);
      return plant;
    }

    return null;
  }

  cacheSearchResults(query: string, results: Plant[]): void {
    const key = `search:${query.toLowerCase()}`;
    this.setCache(key, results, this.DEFAULT_TTL);
  }

  getCachedSearchResults(query: string): Plant[] | null {
    const key = `search:${query.toLowerCase()}`;
    return this.getCache<Plant[]>(key);
  }

  /**
   * Collection operations
   */
  cacheUserCollection(userId: string, collection: UserPlantCollection[]): void {
    this.collectionCache.set(userId, collection);
    this.setCache(`collection:${userId}`, collection, this.DEFAULT_TTL);
  }

  getCachedUserCollection(userId: string): UserPlantCollection[] | null {
    const cached = this.collectionCache.get(userId);
    if (cached) return cached;

    const collection = this.getCache<UserPlantCollection[]>(`collection:${userId}`);
    if (collection) {
      this.collectionCache.set(userId, collection);
      return collection;
    }

    return null;
  }

  /**
   * Garden plants operations
   */
  cacheGardenPlants(gardenId: string, plants: GardenPlant[]): void {
    this.gardenPlantsCache.set(gardenId, plants);
    this.setCache(`garden-plants:${gardenId}`, plants, this.DEFAULT_TTL);
  }

  getCachedGardenPlants(gardenId: string): GardenPlant[] | null {
    const cached = this.gardenPlantsCache.get(gardenId);
    if (cached) return cached;

    const plants = this.getCache<GardenPlant[]>(`garden-plants:${gardenId}`);
    if (plants) {
      this.gardenPlantsCache.set(gardenId, plants);
      return plants;
    }

    return null;
  }

  /**
   * Session operations
   */
  cachePlantDoctorSessions(userId: string, sessions: PlantDoctorSession[]): void {
    this.setCache(`plant-doctor:${userId}`, sessions, this.DEFAULT_TTL);
  }

  getCachedPlantDoctorSessions(userId: string): PlantDoctorSession[] | null {
    return this.getCache<PlantDoctorSession[]>(`plant-doctor:${userId}`);
  }

  /**
   * Design generation operations
   */
  cacheDesignGenerations(userId: string, generations: DesignGeneration[]): void {
    this.setCache(`designs:${userId}`, generations, this.DEFAULT_TTL);
  }

  getCachedDesignGenerations(userId: string): DesignGeneration[] | null {
    return this.getCache<DesignGeneration[]>(`designs:${userId}`);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.cache.clear();
    this.userCache.clear();
    this.gardenCache.clear();
    this.plantCache.clear();
    this.allPlantsCache = null;
    this.collectionCache.clear();
    this.gardenPlantsCache.clear();
    console.log('🧹 All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    users: number;
    gardens: number;
    plants: number;
    collections: number;
    lastSync: Date | null;
    isActive: boolean;
  } {
    return {
      totalEntries: this.cache.size,
      users: this.userCache.size,
      gardens: this.gardenCache.size,
      plants: this.plantCache.size,
      collections: this.collectionCache.size,
      lastSync: this.lastSuccessfulSync,
      isActive: this.isEnabled
    };
  }

  /**
   * Update last successful sync time
   */
  updateSyncTime(): void {
    this.lastSuccessfulSync = new Date();
  }
}

// Singleton instance
export const fallbackStorage = new FallbackStorage();