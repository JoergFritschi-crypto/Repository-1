export interface Plant {
  id: string;
  perenual_id?: string;
  scientific_name: string;
  common_name: string;
  family?: string;
  genus?: string;
  species?: string;
  cultivar?: string;
  type?: string;
  hardiness?: string;
  sunlight?: any; // Can be array or string from JSON column
  soil?: any; // JSON array
  watering?: string;
  watering_general_benchmark?: any;
  dimension?: any; // JSON object with height/spread
  cycle?: string;
  growth_rate?: string;
  flowering_season?: string;
  flower_color?: any; // JSON array
  leaf?: any; // JSON object
  leaf_color?: any; // JSON array
  drought_tolerant?: boolean;
  salt_tolerant?: boolean;
  thorny?: boolean;
  tropical?: boolean;
  medicinal?: boolean;
  cuisine?: boolean;
  poisonous_to_humans?: number;
  poisonous_to_pets?: number;
  attracts?: any; // JSON array
  propagation?: any; // JSON array
  pruning_month?: any; // JSON array
  pest_susceptibility?: any; // JSON array
  care_level?: string;
  maintenance?: string;
  description?: string;
  care_guides?: string;
  generated_image_url?: string;
  thumbnail_image?: string;
  full_image?: string;
  detail_image?: string;
  image_generation_status?: string;
  data_source?: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface PlantSearchFilters {
  type?: string;
  hardiness_zone?: string;
  sun_requirements?: string;
  pet_safe?: boolean;
  drought_tolerant?: boolean;
  fragrant?: boolean;
  attracts_pollinators?: boolean;
}

export interface UserPlantCollection {
  id: string;
  userId: string;
  plantId: string;
  plant?: Plant;
  notes?: string;
  isFavorite?: boolean;
  createdAt: string;
}

export interface PlantDoctorSession {
  id: string;
  userId?: string;
  sessionType: 'identification' | 'disease' | 'weed';
  imageUrl?: string;
  aiAnalysis?: any;
  confidence?: number;
  identifiedPlantId?: string;
  identifiedPlant?: Plant;
  userFeedback?: any;
  createdAt: string;
}
