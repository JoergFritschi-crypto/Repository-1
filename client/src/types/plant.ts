export interface Plant {
  id: string;
  scientificName: string;
  commonName: string;
  family?: string;
  genus?: string;
  species?: string;
  type?: string;
  hardiness_zones?: string;
  sun_requirements?: 'full_sun' | 'partial_sun' | 'partial_shade' | 'full_shade';
  soil_requirements?: any;
  water_requirements?: string;
  mature_height?: string;
  mature_width?: string;
  bloom_time?: string;
  bloom_color?: string;
  foliage_color?: string;
  fragrant?: boolean;
  deer_resistant?: boolean;
  drought_tolerant?: boolean;
  pet_safe?: boolean;
  toxic_to_children?: boolean;
  attracts_pollinators?: boolean;
  native_regions?: string;
  care_notes?: string;
  planting_instructions?: string;
  image_url?: string;
  thumbnailImage?: string;
  fullImage?: string;
  detailImage?: string;
  data_source?: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
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
