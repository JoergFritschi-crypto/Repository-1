export interface Garden {
  id: string;
  userId: string;
  name: string;
  location: string;
  units: 'metric' | 'imperial';
  shape: 'rectangle' | 'circle' | 'oval' | 'rhomboid' | 'l_shaped';
  dimensions: GardenDimensions;
  slopePercentage?: number;
  slopeDirection?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  sunExposure?: 'full_sun' | 'partial_sun' | 'partial_shade' | 'full_shade';
  soilType?: 'clay' | 'loam' | 'sand' | 'silt' | 'chalk';
  soilPh?: number;
  hardiness_zone?: string;
  climate_data?: ClimateData;
  preferences?: GardenPreferences;
  design_approach?: 'ai' | 'manual' | 'hybrid';
  layout_data?: any;
  ai_generated?: boolean;
  status?: 'draft' | 'completed' | 'exported';
  createdAt: string;
  updatedAt: string;
}

export interface GardenDimensions {
  // Rectangle
  length?: number;
  width?: number;
  
  // Circle
  radius?: number;
  
  // Oval
  majorAxis?: number;
  minorAxis?: number;
  
  // Rhomboid
  sideA?: number;
  sideB?: number;
  angle?: number;
  
  // L-shaped
  length1?: number;
  width1?: number;
  length2?: number;
  width2?: number;
}

export interface GardenPreferences {
  colors?: string[];
  plantTypes?: string[];
  bloomTimes?: string[];
  petSafe?: boolean;
  childSafe?: boolean;
  noThorns?: boolean;
  lowAllergen?: boolean;
  fragrant?: boolean;
  deerResistant?: boolean;
  droughtTolerant?: boolean;
}

export interface ClimateData {
  hardiness_zone?: string;
  annual_rainfall?: number;
  avg_temp_min?: number;
  avg_temp_max?: number;
  frost_dates?: {
    first_frost?: string;
    last_frost?: string;
  };
  growing_season?: {
    start?: string;
    end?: string;
    length_days?: number;
  };
  monthly_data?: Record<string, any>;
}

export interface GardenStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export const GARDEN_STEPS: GardenStep[] = [
  {
    id: 1,
    title: "Setup & Location",
    description: "Set measurement units, name, and location for climate data",
    completed: false,
  },
  {
    id: 2,
    title: "Shape & Orientation",
    description: "Garden shape, dimensions, slope, and direction",
    completed: false,
  },
  {
    id: 3,
    title: "Interactive Canvas",
    description: "Design your garden layout with drag-and-drop tools",
    completed: false,
  },
  {
    id: 4,
    title: "Design Approach",
    description: "Choose how you want to design your garden",
    completed: false,
  },
  {
    id: 5,
    title: "Sun & Soil",
    description: "Configure sun exposure and soil properties",
    completed: false,
  },
  {
    id: 6,
    title: "Plant Preferences",
    description: "Set your plant preferences and design approach",
    completed: false,
  },
];
