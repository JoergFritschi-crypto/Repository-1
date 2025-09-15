import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
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
import { IStorage } from "./storage";

export class SupabaseHttpStorage implements IStorage {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false // Server-side usage
      }
    });

    console.log('✅ SupabaseHttpStorage initialized - Using Supabase HTTP API for persistent storage');
  }

  // Helper method to generate IDs
  private generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : 
           (Math.random().toString(36).substring(2) + Date.now().toString(36));
  }

  // Helper method to map database user to User type
  private mapDbUserToUser(data: any): User {
    return {
      id: data.replit_id || data.id, // Use replit_id as the main ID for the app
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImageUrl: data.profile_image_url,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      subscriptionStatus: data.subscription_status,
      userTier: data.user_tier || 'free',
      designCredits: data.design_credits || 1,
      isAdmin: data.is_admin || false,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    };
  }

  // ==================== USER OPERATIONS ====================
  // CRITICAL for Replit Auth - these must work correctly

  async getUser(replitId: string): Promise<User | undefined> {
    try {
      // Query by replit_id since that's what the app provides
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('replit_id', replitId)
        .single();

      if (error?.code === 'PGRST116') return undefined; // Not found
      if (error) {
        console.error('Error fetching user:', error);
        return undefined;
      }

      if (data) {
        return this.mapDbUserToUser(data);
      }

      return undefined;
    } catch (error) {
      console.error('Error in getUser:', error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const replitId = userData.id; // This is the Replit ID
      
      // First check if user exists by replit_id
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('replit_id', replitId)
        .single();

      let dbData: any;
      
      if (existingUser) {
        // User exists, update with the existing UUID id
        dbData = {
          id: existingUser.id, // Keep the existing UUID
          replit_id: replitId,
          updated_at: new Date().toISOString()
        };
      } else {
        // New user, generate a UUID for id
        dbData = {
          id: this.generateId(), // Generate new UUID
          replit_id: replitId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      // Map TypeScript fields (camelCase) to database fields (snake_case)
      if (userData.email !== undefined) dbData.email = userData.email;
      if (userData.firstName !== undefined) dbData.first_name = userData.firstName;
      if (userData.lastName !== undefined) dbData.last_name = userData.lastName;
      if (userData.profileImageUrl !== undefined) dbData.profile_image_url = userData.profileImageUrl;
      if (userData.stripeCustomerId !== undefined) dbData.stripe_customer_id = userData.stripeCustomerId;
      if (userData.stripeSubscriptionId !== undefined) dbData.stripe_subscription_id = userData.stripeSubscriptionId;
      if (userData.subscriptionStatus !== undefined) dbData.subscription_status = userData.subscriptionStatus;
      if (userData.userTier !== undefined) dbData.user_tier = userData.userTier;
      if (userData.designCredits !== undefined) dbData.design_credits = userData.designCredits;
      if (userData.isAdmin !== undefined) dbData.is_admin = userData.isAdmin;

      const { data, error } = await this.supabase
        .from('profiles')
        .upsert(dbData, { onConflict: 'replit_id' })
        .select()
        .single();

      if (error) throw error;
      
      return this.mapDbUserToUser(data);
    } catch (error) {
      console.error('Error in upsertUser:', error);
      // Fallback to return user data for auth to continue
      return {
        id: userData.id!,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        stripeCustomerId: userData.stripeCustomerId ?? null,
        stripeSubscriptionId: userData.stripeSubscriptionId ?? null,
        subscriptionStatus: userData.subscriptionStatus ?? null,
        userTier: userData.userTier ?? 'free',
        designCredits: userData.designCredits ?? 1,
        isAdmin: userData.isAdmin ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  async updateUserStripeInfo(replitId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          updated_at: new Date().toISOString()
        })
        .eq('replit_id', replitId) // Query by replit_id
        .select()
        .single();

      if (error) throw error;
      
      return this.mapDbUserToUser(data);
    } catch (error) {
      console.error('Error updating user Stripe info:', error);
      throw error;
    }
  }

  async updateUser(replitId: string, data: Partial<User>): Promise<User> {
    try {
      const updateData: any = {};
      
      // Map field names to database columns
      if (data.email !== undefined) updateData.email = data.email;
      if (data.firstName !== undefined) updateData.first_name = data.firstName;
      if (data.lastName !== undefined) updateData.last_name = data.lastName;
      if (data.profileImageUrl !== undefined) updateData.profile_image_url = data.profileImageUrl;
      if (data.stripeCustomerId !== undefined) updateData.stripe_customer_id = data.stripeCustomerId;
      if (data.stripeSubscriptionId !== undefined) updateData.stripe_subscription_id = data.stripeSubscriptionId;
      if (data.subscriptionStatus !== undefined) updateData.subscription_status = data.subscriptionStatus;
      if (data.userTier !== undefined) updateData.user_tier = data.userTier;
      if (data.designCredits !== undefined) updateData.design_credits = data.designCredits;
      if (data.isAdmin !== undefined) updateData.is_admin = data.isAdmin;
      
      updateData.updated_at = new Date().toISOString();

      const { data: updatedUser, error } = await this.supabase
        .from('profiles')
        .update(updateData)
        .eq('replit_id', replitId) // Query by replit_id
        .select()
        .single();

      if (error) throw error;
      
      return this.mapDbUserToUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to TypeScript fields for each user
      return (data || []).map(user => this.mapDbUserToUser(user));
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  // ==================== GARDEN OPERATIONS ====================

  async getGarden(id: string): Promise<Garden | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('gardens')
        .select('*')
        .eq('id', id)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching garden:', error);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error in getGarden:', error);
      return undefined;
    }
  }

  async getUserGardens(userId: string): Promise<Garden[]> {
    try {
      const { data, error } = await this.supabase
        .from('gardens')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user gardens:', error);
      return [];
    }
  }

  async createGarden(garden: InsertGarden): Promise<Garden> {
    try {
      const gardenData: any = {
        id: this.generateId(),
        user_id: garden.userId,
        name: garden.name,
        location: garden.location,
        units: garden.units || 'metric',
        shape: garden.shape,
        dimensions: garden.dimensions,
        slope_percentage: garden.slopePercentage,
        slope_direction: garden.slopeDirection,
        north_orientation: garden.northOrientation,
        point_of_view: garden.pointOfView || 'bird_eye',
        sun_exposure: garden.sunExposure,
        soil_type: garden.soilType,
        soil_ph: garden.soilPh,
        has_soil_analysis: garden.hasSoilAnalysis || false,
        soil_analysis: garden.soilAnalysis,
        hardiness_zone: garden.hardiness_zone,
        usda_zone: garden.usdaZone,
        rhs_zone: garden.rhsZone,
        hardiness_category: garden.hardinessCategory,
        climate_data: garden.climate_data,
        preferences: garden.preferences,
        design_approach: garden.design_approach || 'ai',
        layout_data: garden.layout_data,
        ai_generated: garden.ai_generated || false,
        status: garden.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('gardens')
        .insert(gardenData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating garden:', error);
      throw error;
    }
  }

  async updateGarden(id: string, garden: Partial<InsertGarden>): Promise<Garden> {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      
      // Map field names to database columns
      if (garden.name !== undefined) updateData.name = garden.name;
      if (garden.location !== undefined) updateData.location = garden.location;
      if (garden.units !== undefined) updateData.units = garden.units;
      if (garden.shape !== undefined) updateData.shape = garden.shape;
      if (garden.dimensions !== undefined) updateData.dimensions = garden.dimensions;
      if (garden.slopePercentage !== undefined) updateData.slope_percentage = garden.slopePercentage;
      if (garden.slopeDirection !== undefined) updateData.slope_direction = garden.slopeDirection;
      if (garden.northOrientation !== undefined) updateData.north_orientation = garden.northOrientation;
      if (garden.pointOfView !== undefined) updateData.point_of_view = garden.pointOfView;
      if (garden.sunExposure !== undefined) updateData.sun_exposure = garden.sunExposure;
      if (garden.soilType !== undefined) updateData.soil_type = garden.soilType;
      if (garden.soilPh !== undefined) updateData.soil_ph = garden.soilPh;
      if (garden.hasSoilAnalysis !== undefined) updateData.has_soil_analysis = garden.hasSoilAnalysis;
      if (garden.soilAnalysis !== undefined) updateData.soil_analysis = garden.soilAnalysis;
      if (garden.hardiness_zone !== undefined) updateData.hardiness_zone = garden.hardiness_zone;
      if (garden.usdaZone !== undefined) updateData.usda_zone = garden.usdaZone;
      if (garden.rhsZone !== undefined) updateData.rhs_zone = garden.rhsZone;
      if (garden.hardinessCategory !== undefined) updateData.hardiness_category = garden.hardinessCategory;
      if (garden.climate_data !== undefined) updateData.climate_data = garden.climate_data;
      if (garden.preferences !== undefined) updateData.preferences = garden.preferences;
      if (garden.design_approach !== undefined) updateData.design_approach = garden.design_approach;
      if (garden.layout_data !== undefined) updateData.layout_data = garden.layout_data;
      if (garden.ai_generated !== undefined) updateData.ai_generated = garden.ai_generated;
      if (garden.status !== undefined) updateData.status = garden.status;

      const { data, error } = await this.supabase
        .from('gardens')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating garden:', error);
      throw error;
    }
  }

  async deleteGarden(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('gardens')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting garden:', error);
      throw error;
    }
  }

  // ==================== PLANT OPERATIONS ====================

  async getPlant(id: string): Promise<Plant | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .select('*')
        .eq('id', id)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching plant:', error);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlant:', error);
      return undefined;
    }
  }

  async getAllPlants(): Promise<Plant[]> {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .select('*')
        .order('common_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all plants:', error);
      return [];
    }
  }

  async searchPlants(query: string, filters?: {
    type?: string;
    hardiness_zone?: string;
    sun_requirements?: string;
    pet_safe?: boolean;
  }): Promise<Plant[]> {
    try {
      let queryBuilder = this.supabase
        .from('plants')
        .select('*');

      // Add search query
      if (query) {
        queryBuilder = queryBuilder.or(`common_name.ilike.%${query}%,scientific_name.ilike.%${query}%`);
      }

      // Add filters
      if (filters?.type) {
        queryBuilder = queryBuilder.eq('type', filters.type);
      }

      if (filters?.sun_requirements) {
        queryBuilder = queryBuilder.contains('sunlight', [filters.sun_requirements]);
      }

      if (filters?.pet_safe !== undefined) {
        queryBuilder = queryBuilder.eq('pet_safe', filters.pet_safe);
      }

      const { data, error } = await queryBuilder.order('common_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching plants:', error);
      return [];
    }
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
  }): Promise<Plant[]> {
    try {
      let queryBuilder = this.supabase
        .from('plants')
        .select('*');

      // Text field searches - flexible across all name fields
      if (filters.genus) {
        queryBuilder = queryBuilder.or(
          `genus.ilike.%${filters.genus}%,species.ilike.%${filters.genus}%,cultivar.ilike.%${filters.genus}%,common_name.ilike.%${filters.genus}%,scientific_name.ilike.%${filters.genus}%`
        );
      }

      if (filters.species) {
        queryBuilder = queryBuilder.or(
          `species.ilike.%${filters.species}%,genus.ilike.%${filters.species}%,cultivar.ilike.%${filters.species}%,common_name.ilike.%${filters.species}%,scientific_name.ilike.%${filters.species}%`
        );
      }

      if (filters.cultivar) {
        queryBuilder = queryBuilder.or(
          `cultivar.ilike.%${filters.cultivar}%,genus.ilike.%${filters.cultivar}%,species.ilike.%${filters.cultivar}%,common_name.ilike.%${filters.cultivar}%,scientific_name.ilike.%${filters.cultivar}%`
        );
      }

      // Single selection fields
      if (filters.plantType) {
        queryBuilder = queryBuilder.eq('type', filters.plantType);
      }

      if (filters.sunlight) {
        queryBuilder = queryBuilder.contains('sunlight', [filters.sunlight]);
      }

      if (filters.soilType) {
        queryBuilder = queryBuilder.contains('soil', [filters.soilType]);
      }

      if (filters.maintenance) {
        queryBuilder = queryBuilder.eq('maintenance', filters.maintenance.toLowerCase());
      }

      if (filters.watering) {
        queryBuilder = queryBuilder.eq('watering', filters.watering.toLowerCase());
      }

      // Range fields
      if (filters.minHeight) {
        queryBuilder = queryBuilder.gte('height_max_cm', filters.minHeight);
      }

      if (filters.maxHeight && filters.maxHeight !== 0) {
        queryBuilder = queryBuilder.lte('height_min_cm', filters.maxHeight);
      }

      if (filters.minSpread) {
        queryBuilder = queryBuilder.gte('spread_max_cm', filters.minSpread);
      }

      if (filters.maxSpread) {
        queryBuilder = queryBuilder.lte('spread_min_cm', filters.maxSpread);
      }

      // Safety filters
      if (filters.isSafe) {
        queryBuilder = queryBuilder
          .eq('poisonous_to_humans', 0)
          .eq('poisonous_to_pets', 0);
      }

      // Special features
      if (filters.specialFeatures && filters.specialFeatures.length > 0) {
        for (const feature of filters.specialFeatures) {
          if (feature === 'Drought Tolerant') {
            queryBuilder = queryBuilder.eq('drought_tolerant', true);
          }
          if (feature === 'Salt Tolerant') {
            queryBuilder = queryBuilder.eq('salt_tolerant', true);
          }
          if (feature === 'Fast Growing') {
            queryBuilder = queryBuilder.eq('growth_rate', 'fast');
          }
        }
      }

      const { data, error } = await queryBuilder.order('common_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in advanced plant search:', error);
      return [];
    }
  }

  async createPlant(plant: InsertPlant): Promise<Plant> {
    try {
      const plantData: any = {
        id: this.generateId(),
        ...plant,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('plants')
        .insert(plantData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating plant:', error);
      throw error;
    }
  }

  async updatePlant(id: string, plant: Partial<InsertPlant>): Promise<Plant> {
    try {
      const updateData: any = {
        ...plant,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('plants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating plant:', error);
      throw error;
    }
  }

  async getPendingPlants(): Promise<Plant[]> {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending plants:', error);
      return [];
    }
  }

  async verifyPlant(id: string): Promise<Plant> {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error verifying plant:', error);
      throw error;
    }
  }

  async deletePlant(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('plants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting plant:', error);
      throw error;
    }
  }

  // ==================== USER PLANT COLLECTION OPERATIONS ====================

  async getUserPlantCollection(userId: string): Promise<UserPlantCollection[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_plant_collections')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user plant collection:', error);
      return [];
    }
  }

  async getUserCollectionCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('user_plant_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting collection count:', error);
      return 0;
    }
  }

  async canAddToCollection(userId: string): Promise<{ canAdd: boolean; limit: number; current: number }> {
    try {
      // Get user tier
      const { data: user, error: userError } = await this.supabase
        .from('profiles')
        .select('user_tier')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get current count
      const current = await this.getUserCollectionCount(userId);
      
      // Determine limit based on tier
      const limit = user?.user_tier === 'premium' ? 1000 : 
                   user?.user_tier === 'pay_per_design' ? 100 : 50;

      return {
        canAdd: current < limit,
        limit,
        current
      };
    } catch (error) {
      console.error('Error checking collection limits:', error);
      return { canAdd: false, limit: 50, current: 0 };
    }
  }

  async addToUserCollection(collection: InsertUserPlantCollection): Promise<UserPlantCollection> {
    try {
      const collectionData: any = {
        id: this.generateId(),
        user_id: collection.userId,
        plant_id: collection.plantId,
        notes: collection.notes,
        quantity: collection.quantity || 1,
        added_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_plant_collections')
        .insert(collectionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding to collection:', error);
      throw error;
    }
  }

  async removeFromUserCollection(userId: string, plantId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_plant_collections')
        .delete()
        .eq('user_id', userId)
        .eq('plant_id', plantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing from collection:', error);
      throw error;
    }
  }

  // ==================== GARDEN PLANT OPERATIONS ====================

  async getGardenPlants(gardenId: string): Promise<GardenPlant[]> {
    try {
      const { data, error } = await this.supabase
        .from('garden_plants')
        .select('*')
        .eq('garden_id', gardenId)
        .order('planted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching garden plants:', error);
      return [];
    }
  }

  async addPlantToGarden(gardenPlant: InsertGardenPlant): Promise<GardenPlant> {
    try {
      const plantData: any = {
        id: this.generateId(),
        garden_id: gardenPlant.gardenId,
        plant_id: gardenPlant.plantId,
        x_position: gardenPlant.xPosition,
        y_position: gardenPlant.yPosition,
        quantity: gardenPlant.quantity || 1,
        planting_date: gardenPlant.plantingDate || new Date().toISOString(),
        notes: gardenPlant.notes,
        planted_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('garden_plants')
        .insert(plantData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding plant to garden:', error);
      throw error;
    }
  }

  async updateGardenPlant(id: string, gardenPlant: Partial<InsertGardenPlant>): Promise<GardenPlant> {
    try {
      const updateData: any = {};
      
      if (gardenPlant.xPosition !== undefined) updateData.x_position = gardenPlant.xPosition;
      if (gardenPlant.yPosition !== undefined) updateData.y_position = gardenPlant.yPosition;
      if (gardenPlant.quantity !== undefined) updateData.quantity = gardenPlant.quantity;
      if (gardenPlant.plantingDate !== undefined) updateData.planting_date = gardenPlant.plantingDate;
      if (gardenPlant.notes !== undefined) updateData.notes = gardenPlant.notes;

      const { data, error } = await this.supabase
        .from('garden_plants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating garden plant:', error);
      throw error;
    }
  }

  async removePlantFromGarden(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('garden_plants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing plant from garden:', error);
      throw error;
    }
  }

  // ==================== PLANT DOCTOR OPERATIONS ====================

  async createPlantDoctorSession(session: InsertPlantDoctorSession): Promise<PlantDoctorSession> {
    try {
      const sessionData: any = {
        id: this.generateId(),
        user_id: session.userId,
        plant_id: session.plantId,
        symptoms: session.symptoms,
        image_url: session.imageUrl,
        diagnosis: session.diagnosis,
        treatment: session.treatment,
        severity: session.severity,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('plant_doctor_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating plant doctor session:', error);
      throw error;
    }
  }

  async getUserPlantDoctorSessions(userId: string): Promise<PlantDoctorSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('plant_doctor_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching plant doctor sessions:', error);
      return [];
    }
  }

  async updatePlantDoctorSession(id: string, session: Partial<InsertPlantDoctorSession>): Promise<PlantDoctorSession> {
    try {
      const updateData: any = {};
      
      if (session.diagnosis !== undefined) updateData.diagnosis = session.diagnosis;
      if (session.treatment !== undefined) updateData.treatment = session.treatment;
      if (session.severity !== undefined) updateData.severity = session.severity;
      if (session.followUpDate !== undefined) updateData.follow_up_date = session.followUpDate;
      if (session.resolved !== undefined) updateData.resolved = session.resolved;

      const { data, error } = await this.supabase
        .from('plant_doctor_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating plant doctor session:', error);
      throw error;
    }
  }

  // ==================== DESIGN GENERATION OPERATIONS ====================

  async getUserDesignGenerations(userId: string): Promise<DesignGeneration[]> {
    try {
      const { data, error } = await this.supabase
        .from('design_generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching design generations:', error);
      return [];
    }
  }

  async createDesignGeneration(generation: InsertDesignGeneration): Promise<DesignGeneration> {
    try {
      const generationData: any = {
        id: this.generateId(),
        user_id: generation.userId,
        garden_id: generation.gardenId,
        style_id: generation.styleId,
        prompt: generation.prompt,
        image_url: generation.imageUrl,
        metadata: generation.metadata,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('design_generations')
        .insert(generationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating design generation:', error);
      throw error;
    }
  }

  async getDesignGenerationsByStyle(userId: string, styleId: string): Promise<DesignGeneration[]> {
    try {
      const { data, error } = await this.supabase
        .from('design_generations')
        .select('*')
        .eq('user_id', userId)
        .eq('style_id', styleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching design generations by style:', error);
      return [];
    }
  }

  // ==================== CLIMATE DATA OPERATIONS ====================

  async getClimateData(location: string): Promise<ClimateData | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('climate_data')
        .select('*')
        .eq('location', location)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching climate data:', error);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error in getClimateData:', error);
      return undefined;
    }
  }

  async createClimateData(climate: InsertClimateData): Promise<ClimateData> {
    try {
      const climateData: any = {
        id: this.generateId(),
        location: climate.location,
        hardiness_zone: climate.hardinessZone,
        usda_zone: climate.usdaZone,
        rhs_zone: climate.rhsZone,
        koppen_climate: climate.koppenClimate,
        average_rainfall: climate.averageRainfall,
        average_temperature: climate.averageTemperature,
        frost_dates: climate.frostDates,
        growing_season: climate.growingSeason,
        metadata: climate.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('climate_data')
        .insert(climateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating climate data:', error);
      throw error;
    }
  }

  async updateClimateData(location: string, climate: Partial<InsertClimateData>): Promise<ClimateData> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (climate.hardinessZone !== undefined) updateData.hardiness_zone = climate.hardinessZone;
      if (climate.usdaZone !== undefined) updateData.usda_zone = climate.usdaZone;
      if (climate.rhsZone !== undefined) updateData.rhs_zone = climate.rhsZone;
      if (climate.koppenClimate !== undefined) updateData.koppen_climate = climate.koppenClimate;
      if (climate.averageRainfall !== undefined) updateData.average_rainfall = climate.averageRainfall;
      if (climate.averageTemperature !== undefined) updateData.average_temperature = climate.averageTemperature;
      if (climate.frostDates !== undefined) updateData.frost_dates = climate.frostDates;
      if (climate.growingSeason !== undefined) updateData.growing_season = climate.growingSeason;
      if (climate.metadata !== undefined) updateData.metadata = climate.metadata;

      const { data, error } = await this.supabase
        .from('climate_data')
        .update(updateData)
        .eq('location', location)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating climate data:', error);
      throw error;
    }
  }

  // ==================== FILE VAULT OPERATIONS ====================

  async createVaultItem(vaultItem: InsertFileVault): Promise<FileVault> {
    try {
      const vaultData: any = {
        id: this.generateId(),
        user_id: vaultItem.userId,
        file_type: vaultItem.fileType,
        file_name: vaultItem.fileName,
        file_path: vaultItem.filePath,
        file_size: vaultItem.fileSize,
        mime_type: vaultItem.mimeType,
        metadata: vaultItem.metadata,
        expires_at: vaultItem.expiresAt,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('file_vault')
        .insert(vaultData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating vault item:', error);
      throw error;
    }
  }

  async getUserVaultItems(userId: string): Promise<FileVault[]> {
    try {
      const { data, error } = await this.supabase
        .from('file_vault')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user vault items:', error);
      return [];
    }
  }

  async getVaultItem(id: string): Promise<FileVault | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('file_vault')
        .select('*')
        .eq('id', id)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching vault item:', error);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error in getVaultItem:', error);
      return undefined;
    }
  }

  async updateVaultAccessTime(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('file_vault')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating vault access time:', error);
      throw error;
    }
  }

  async deleteExpiredVaultItems(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('file_vault')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error deleting expired vault items:', error);
      return 0;
    }
  }

  // ==================== VISUALIZATION DATA OPERATIONS ====================

  async getVisualizationData(gardenId: string): Promise<Record<string, any> | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('gardens')
        .select('layout_data')
        .eq('id', gardenId)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching visualization data:', error);
        return undefined;
      }

      return data?.layout_data || undefined;
    } catch (error) {
      console.error('Error in getVisualizationData:', error);
      return undefined;
    }
  }

  async updateVisualizationData(gardenId: string, data: Record<string, any>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('gardens')
        .update({ 
          layout_data: data,
          updated_at: new Date().toISOString()
        })
        .eq('id', gardenId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating visualization data:', error);
      throw error;
    }
  }

  // ==================== SCRAPING PROGRESS OPERATIONS ====================

  async getScrapingProgress(url: string): Promise<ScrapingProgress | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('scraping_progress')
        .select('*')
        .eq('url', url)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching scraping progress:', error);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error in getScrapingProgress:', error);
      return undefined;
    }
  }

  async createScrapingProgress(progress: InsertScrapingProgress): Promise<ScrapingProgress> {
    try {
      const progressData: any = {
        id: this.generateId(),
        url: progress.url,
        status: progress.status,
        current_page: progress.currentPage || 1,
        total_pages: progress.totalPages,
        processed_plants: progress.processedPlants || 0,
        error_message: progress.errorMessage,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('scraping_progress')
        .insert(progressData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating scraping progress:', error);
      throw error;
    }
  }

  async updateScrapingProgress(id: string, progress: Partial<InsertScrapingProgress>): Promise<ScrapingProgress> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (progress.status !== undefined) updateData.status = progress.status;
      if (progress.currentPage !== undefined) updateData.current_page = progress.currentPage;
      if (progress.totalPages !== undefined) updateData.total_pages = progress.totalPages;
      if (progress.processedPlants !== undefined) updateData.processed_plants = progress.processedPlants;
      if (progress.errorMessage !== undefined) updateData.error_message = progress.errorMessage;

      const { data, error } = await this.supabase
        .from('scraping_progress')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating scraping progress:', error);
      throw error;
    }
  }

  async finalizeScrapingProgress(id: string, stats: { totalPlants: number; savedPlants: number; duplicatePlants: number; failedPlants: number }): Promise<ScrapingProgress> {
    try {
      const { data, error } = await this.supabase
        .from('scraping_progress')
        .update({
          status: 'completed',
          total_plants: stats.totalPlants,
          saved_plants: stats.savedPlants,
          duplicate_plants: stats.duplicatePlants,
          failed_plants: stats.failedPlants,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finalizing scraping progress:', error);
      throw error;
    }
  }

  async getPlantByScientificName(scientificName: string): Promise<Plant | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .select('*')
        .eq('scientific_name', scientificName)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching plant by scientific name:', error);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlantByScientificName:', error);
      return undefined;
    }
  }

  async getPlantByExternalId(externalId: string): Promise<Plant | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .select('*')
        .eq('external_id', externalId)
        .single();

      if (error?.code === 'PGRST116') return undefined;
      if (error) {
        console.error('Error fetching plant by external ID:', error);
        return undefined;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlantByExternalId:', error);
      return undefined;
    }
  }

  async bulkCreatePlants(plants: InsertPlant[]): Promise<{ saved: number; duplicates: number; errors: number }> {
    let saved = 0;
    let duplicates = 0;
    let errors = 0;

    for (const plant of plants) {
      try {
        // Check for duplicate
        const existing = await this.getPlantByScientificName(plant.scientificName);
        if (existing) {
          duplicates++;
          continue;
        }

        // Create plant
        await this.createPlant(plant);
        saved++;
      } catch (error) {
        console.error('Error creating plant in bulk:', error);
        errors++;
      }
    }

    return { saved, duplicates, errors };
  }

  // ==================== TODO TASK OPERATIONS ====================

  async getAllTodoTasks(): Promise<TodoTask[]> {
    try {
      const { data, error } = await this.supabase
        .from('todo_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching todo tasks:', error);
      return [];
    }
  }

  async createTodoTask(task: InsertTodoTask): Promise<TodoTask> {
    try {
      const taskData: any = {
        id: this.generateId(),
        title: task.title,
        description: task.description,
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        category: task.category,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('todo_tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating todo task:', error);
      throw error;
    }
  }

  async deleteTodoTask(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('todo_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting todo task:', error);
      throw error;
    }
  }

  // ==================== SECURITY OPERATIONS ====================

  async createSecurityAuditLog(log: InsertSecurityAuditLog): Promise<SecurityAuditLog> {
    try {
      const logData: any = {
        id: this.generateId(),
        user_id: log.userId,
        event_type: log.eventType,
        severity: log.severity,
        description: log.description,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        metadata: log.metadata,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('security_audit_logs')
        .insert(logData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating security audit log:', error);
      throw error;
    }
  }

  async getSecurityAuditLogs(filters?: { userId?: string; eventType?: string; severity?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<SecurityAuditLog[]> {
    try {
      let queryBuilder = this.supabase
        .from('security_audit_logs')
        .select('*');

      if (filters?.userId) {
        queryBuilder = queryBuilder.eq('user_id', filters.userId);
      }

      if (filters?.eventType) {
        queryBuilder = queryBuilder.eq('event_type', filters.eventType);
      }

      if (filters?.severity) {
        queryBuilder = queryBuilder.eq('severity', filters.severity);
      }

      if (filters?.startDate) {
        queryBuilder = queryBuilder.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        queryBuilder = queryBuilder.lte('created_at', filters.endDate.toISOString());
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      if (filters?.limit) {
        queryBuilder = queryBuilder.limit(filters.limit);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching security audit logs:', error);
      return [];
    }
  }

  async recordFailedLoginAttempt(attempt: InsertFailedLoginAttempt): Promise<FailedLoginAttempt> {
    try {
      // Check for existing record
      const { data: existing, error: fetchError } = await this.supabase
        .from('failed_login_attempts')
        .select('*')
        .eq('ip_address', attempt.ipAddress)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing record
        const { data, error } = await this.supabase
          .from('failed_login_attempts')
          .update({
            attempt_count: existing.attempt_count + 1,
            last_attempt: new Date().toISOString(),
            email: attempt.email || existing.email,
            user_agent: attempt.userAgent || existing.user_agent
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new record
        const attemptData: any = {
          id: this.generateId(),
          ip_address: attempt.ipAddress,
          email: attempt.email,
          attempt_count: 1,
          last_attempt: new Date().toISOString(),
          user_agent: attempt.userAgent,
          created_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
          .from('failed_login_attempts')
          .insert(attemptData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error recording failed login attempt:', error);
      throw error;
    }
  }

  async getFailedLoginAttempts(ipAddress?: string): Promise<FailedLoginAttempt[]> {
    try {
      let queryBuilder = this.supabase
        .from('failed_login_attempts')
        .select('*');

      if (ipAddress) {
        queryBuilder = queryBuilder.eq('ip_address', ipAddress);
      }

      const { data, error } = await queryBuilder.order('last_attempt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching failed login attempts:', error);
      return [];
    }
  }

  async clearFailedLoginAttempts(ipAddress: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('failed_login_attempts')
        .delete()
        .eq('ip_address', ipAddress);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing failed login attempts:', error);
      throw error;
    }
  }

  async createActiveSession(session: InsertActiveSession): Promise<ActiveSession> {
    try {
      const sessionData: any = {
        id: this.generateId(),
        session_id: session.sessionId,
        user_id: session.userId,
        ip_address: session.ipAddress,
        user_agent: session.userAgent,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        expires_at: session.expiresAt,
        is_active: true,
        revoked_by: null,
        revoked_at: null
      };

      const { data, error } = await this.supabase
        .from('active_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating active session:', error);
      throw error;
    }
  }

  async getActiveSessions(userId?: string): Promise<ActiveSession[]> {
    try {
      let queryBuilder = this.supabase
        .from('active_sessions')
        .select('*')
        .eq('is_active', true);

      if (userId) {
        queryBuilder = queryBuilder.eq('user_id', userId);
      }

      const { data, error } = await queryBuilder.order('last_activity', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('active_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating session activity:', error);
      throw error;
    }
  }

  async revokeSession(sessionId: string, revokedBy: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('active_sessions')
        .update({
          is_active: false,
          revoked_by: revokedBy,
          revoked_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error revoking session:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('active_sessions')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  async addIpAccessControl(control: InsertIpAccessControl): Promise<IpAccessControl> {
    try {
      const controlData: any = {
        id: this.generateId(),
        ip_address: control.ipAddress,
        type: control.type,
        reason: control.reason,
        added_by: control.addedBy,
        expires_at: control.expiresAt,
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('ip_access_control')
        .insert(controlData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding IP access control:', error);
      throw error;
    }
  }

  async getIpAccessControl(type?: 'block' | 'allow'): Promise<IpAccessControl[]> {
    try {
      let queryBuilder = this.supabase
        .from('ip_access_control')
        .select('*')
        .eq('is_active', true);

      if (type) {
        queryBuilder = queryBuilder.eq('type', type);
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching IP access control:', error);
      return [];
    }
  }

  async checkIpAccess(ipAddress: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const { data: controls, error } = await this.supabase
        .from('ip_access_control')
        .select('*')
        .eq('ip_address', ipAddress)
        .eq('is_active', true);

      if (error) throw error;

      const blockedControl = controls?.find(c => c.type === 'block');
      if (blockedControl) {
        return { allowed: false, reason: blockedControl.reason };
      }

      const allowedControl = controls?.find(c => c.type === 'allow');
      if (allowedControl) {
        return { allowed: true };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking IP access:', error);
      return { allowed: true }; // Default to allowed on error
    }
  }

  async removeIpAccessControl(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ip_access_control')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing IP access control:', error);
      throw error;
    }
  }

  async getSecuritySettings(): Promise<SecuritySetting[]> {
    try {
      const { data, error } = await this.supabase
        .from('security_settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching security settings:', error);
      return [];
    }
  }

  async updateSecuritySetting(key: string, value: any, updatedBy: string): Promise<SecuritySetting> {
    try {
      // Check if setting exists
      const { data: existing, error: fetchError } = await this.supabase
        .from('security_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing setting
        const { data, error } = await this.supabase
          .from('security_settings')
          .update({
            value: value,
            updated_by: updatedBy,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new setting
        const settingData: any = {
          id: this.generateId(),
          key: key,
          value: value,
          description: `Setting for ${key}`,
          updated_by: updatedBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
          .from('security_settings')
          .insert(settingData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating security setting:', error);
      throw error;
    }
  }

  async recordRateLimitViolation(violation: InsertRateLimitViolation): Promise<RateLimitViolation> {
    try {
      const violationData: any = {
        id: this.generateId(),
        ip_address: violation.ipAddress,
        endpoint: violation.endpoint,
        attempts: violation.attempts,
        window_start: violation.windowStart,
        user_id: violation.userId,
        user_agent: violation.userAgent,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('rate_limit_violations')
        .insert(violationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording rate limit violation:', error);
      throw error;
    }
  }

  async getRateLimitViolations(filters?: { ipAddress?: string; endpoint?: string; startDate?: Date }): Promise<RateLimitViolation[]> {
    try {
      let queryBuilder = this.supabase
        .from('rate_limit_violations')
        .select('*');

      if (filters?.ipAddress) {
        queryBuilder = queryBuilder.eq('ip_address', filters.ipAddress);
      }

      if (filters?.endpoint) {
        queryBuilder = queryBuilder.eq('endpoint', filters.endpoint);
      }

      if (filters?.startDate) {
        queryBuilder = queryBuilder.gte('created_at', filters.startDate.toISOString());
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rate limit violations:', error);
      return [];
    }
  }

  async getSecurityRecommendations(status?: string): Promise<SecurityRecommendation[]> {
    try {
      let queryBuilder = this.supabase
        .from('security_recommendations')
        .select('*');

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      const { data, error } = await queryBuilder.order('priority', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching security recommendations:', error);
      return [];
    }
  }

  async updateRecommendationStatus(id: string, status: string, dismissedBy?: string): Promise<SecurityRecommendation> {
    try {
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (dismissedBy) {
        updateData.dismissed_by = dismissedBy;
        updateData.dismissed_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('security_recommendations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      throw error;
    }
  }

  async createSecurityRecommendation(recommendation: InsertSecurityRecommendation): Promise<SecurityRecommendation> {
    try {
      const recommendationData: any = {
        id: this.generateId(),
        title: recommendation.title,
        description: recommendation.description,
        severity: recommendation.severity,
        category: recommendation.category,
        status: 'pending',
        priority: recommendation.priority || 0,
        implementation_guide: recommendation.implementationGuide,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('security_recommendations')
        .insert(recommendationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating security recommendation:', error);
      throw error;
    }
  }

  async getSecurityStats(): Promise<{
    totalUsers: number;
    activeSessionsCount: number;
    failedLoginsLast24h: number;
    blockedIpsCount: number;
    securityScore: number;
    recentEvents: SecurityAuditLog[];
  }> {
    try {
      // Get total users
      const { count: totalUsers, error: usersError } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Get active sessions count
      const { count: activeSessionsCount, error: sessionsError } = await this.supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (sessionsError) throw sessionsError;

      // Get failed logins in last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { count: failedLoginsLast24h, error: failedError } = await this.supabase
        .from('failed_login_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('last_attempt', twentyFourHoursAgo.toISOString());

      if (failedError) throw failedError;

      // Get blocked IPs count
      const { count: blockedIpsCount, error: blockedError } = await this.supabase
        .from('ip_access_control')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'block')
        .eq('is_active', true);

      if (blockedError) throw blockedError;

      // Calculate security score
      let securityScore = 100;
      if ((failedLoginsLast24h || 0) > 10) securityScore -= 10;
      if ((failedLoginsLast24h || 0) > 50) securityScore -= 20;
      if ((blockedIpsCount || 0) > 5) securityScore -= 5;
      if ((blockedIpsCount || 0) > 20) securityScore -= 10;

      // Get recent events
      const { data: recentEvents, error: eventsError } = await this.supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;

      return {
        totalUsers: totalUsers || 0,
        activeSessionsCount: activeSessionsCount || 0,
        failedLoginsLast24h: failedLoginsLast24h || 0,
        blockedIpsCount: blockedIpsCount || 0,
        securityScore: Math.max(0, securityScore),
        recentEvents: recentEvents || []
      };
    } catch (error) {
      console.error('Error getting security stats:', error);
      return {
        totalUsers: 0,
        activeSessionsCount: 0,
        failedLoginsLast24h: 0,
        blockedIpsCount: 0,
        securityScore: 0,
        recentEvents: []
      };
    }
  }
}