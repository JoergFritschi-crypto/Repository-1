export interface Plant {
  id: string;
  perenualId?: string;
  scientificName: string;
  commonName: string;
  family?: string;
  genus?: string;
  species?: string;
  cultivar?: string;
  type?: string;
  hardiness?: string;
  sunlight?: any; // Can be array or string from JSON column
  soil?: any; // JSON array
  watering?: string;
  wateringGeneralBenchmark?: any;
  dimension?: any; // JSON object with height/spread - DEPRECATED
  // Numeric dimensions for proper filtering and garden design
  heightMinCm?: number | null;
  heightMaxCm?: number | null;
  spreadMinCm?: number | null;
  spreadMaxCm?: number | null;
  heightMinInches?: number | null;
  heightMaxInches?: number | null;
  spreadMinInches?: number | null;
  spreadMaxInches?: number | null;
  cycle?: string;
  growthRate?: string;
  floweringSeason?: string;
  flowerColor?: any; // JSON array
  leaf?: any; // JSON object
  leafColor?: any; // JSON array
  droughtTolerant?: boolean;
  saltTolerant?: boolean;
  thorny?: boolean;
  tropical?: boolean;
  medicinal?: boolean;
  cuisine?: boolean;
  poisonousToHumans?: number;
  poisonousToPets?: number;
  attracts?: any; // JSON array
  propagation?: any; // JSON array
  pruningMonth?: any; // JSON array
  pestSusceptibility?: any; // JSON array
  careLevel?: string;
  maintenance?: string;
  description?: string;
  careGuides?: string;
  generatedImageUrl?: string;
  thumbnailImage?: string;
  fullImage?: string;
  detailImage?: string;
  imageGenerationStatus?: string;
  dataSource?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
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
