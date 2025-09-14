import { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';

// Re-export the garden schema and types from the main file
export const gardenSchema = z.object({
  name: z.string().min(1, 'Garden name is required'),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  usdaZone: z.string().optional(),
  rhsZone: z.string().optional(),
  heatZone: z.string().optional(),
  shape: z.enum(['rectangle', 'square', 'circle', 'oval', 'triangle', 'l_shaped', 'r_shaped']),
  dimensions: z.record(z.number()).default({}),
  units: z.enum(['feet', 'meters']),
  sunExposure: z.enum(['full_sun', 'partial_sun', 'partial_shade', 'full_shade']).optional(),
  soilType: z.enum(['clay', 'sand', 'loam', 'silt', 'chalk']).optional(),
  soilPh: z.enum(['acidic', 'neutral', 'alkaline']).optional(),
  hasSoilAnalysis: z.boolean().optional(),
  slopeDirection: z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']).default('N'),
  slopePercentage: z.number().min(0).max(100).default(0),
  design_approach: z.enum(['ai', 'manual']).optional(),
  selectedStyle: z.string().optional(),
  soilTestId: z.string().optional(),
  spacingPreference: z.enum(['minimum', 'maximum', 'balanced']).default('balanced').optional(),
  soilAnalysis: z.object({
    ph: z.number().optional(),
    texture: z.string().optional(),
    nitrogen: z.number().optional(),
    phosphorus: z.number().optional(),
    potassium: z.number().optional(),
    calcium: z.number().optional(),
    magnesium: z.number().optional(),
    sulfur: z.number().optional(),
    iron: z.number().optional(),
    manganese: z.number().optional(),
    zinc: z.number().optional(),
    copper: z.number().optional(),
    boron: z.number().optional(),
    molybdenum: z.number().optional(),
    organicMatter: z.number().optional(),
    cec: z.number().optional(),
    salinity: z.number().optional(),
    baseSaturation: z.number().optional(),
    calciumSaturation: z.number().optional(),
    magnesiumSaturation: z.number().optional(),
    potassiumSaturation: z.number().optional(),
    sodiumSaturation: z.number().optional(),
  }).optional(),
  preferences: z.object({
    style: z.string().optional(),
    colors: z.array(z.string()).optional(),
    bloomTime: z.array(z.string()).optional(),
    maintenance: z.enum(['low', 'medium', 'high']).optional(),
    features: z.array(z.string()).optional(),
    avoidFeatures: z.array(z.string()).optional(),
    toxicityLevel: z.enum(['none', 'low', 'moderate', 'all']).optional(),
    plantAvailability: z.enum(['common', 'mixed', 'exotic']).optional(),
    noThorns: z.boolean().optional(),
    lowAllergen: z.boolean().optional(),
    nativeOnly: z.boolean().optional(),
    droughtTolerant: z.boolean().optional(),
    specialRequests: z.string().optional(),
  }).optional(),
});

export type GardenFormValues = z.infer<typeof gardenSchema>;

// Common props for all step components
export interface StepComponentProps {
  form: UseFormReturn<GardenFormValues>;
  onNext?: () => void;
  onPrev?: () => void;
  isLoading?: boolean;
}

// Step-specific props interfaces
export interface Step1Props extends StepComponentProps {
  user?: any;
  isPaidUser?: boolean;
  autoSaveEnabled?: boolean;
  setAutoSaveEnabled?: (enabled: boolean) => void;
  showClimateModal: boolean;
  setShowClimateModal: (show: boolean) => void;
  showSoilTestingModal: boolean;
  setShowSoilTestingModal: (show: boolean) => void;
  locationToFetch?: string | null;
  setLocationToFetch?: (location: string | null) => void;
  climateData: any;
  setClimateData: (data: any) => void;
}

export interface Step2Props extends StepComponentProps {
  user?: any;
  hasUploadedPhotos: boolean;
  setHasUploadedPhotos: (uploaded: boolean) => void;
  hasSetOrientation: boolean;
  setHasSetOrientation: (set: boolean) => void;
  analysis: any;
  setAnalysis: (analysis: any) => void;
  recommendedStyleIds: string[];
  setRecommendedStyleIds: (ids: string[]) => void;
}

export interface Step3Props extends StepComponentProps {
  localDesignApproach: 'ai' | 'manual' | undefined;
  setLocalDesignApproach: (approach: 'ai' | 'manual' | undefined) => void;
  selectedGardenStyle: string | null;
  setSelectedGardenStyle: (style: string | null) => void;
  generatedStyles: any[];
  analysis: any;
}

export interface Step4Props extends StepComponentProps {
  inventoryPlants: any[];
  setInventoryPlants: (plants: any[]) => void;
  placedPlants: any[];
  setPlacedPlants: (plants: any[]) => void;
  showPlantSearch: boolean;
  setShowPlantSearch: (show: boolean) => void;
  gardenId: string | null;
  localDesignApproach: 'ai' | 'manual' | undefined;
  selectedGardenStyle: string | null;
  user: any;
  isGeneratingDesign: boolean;
  setIsGeneratingDesign: (generating: boolean) => void;
  completeDesign: any;
  setCompleteDesign: (design: any) => void;
  generatedVisualization: string | null;
  setGeneratedVisualization: (visualization: string | null) => void;
}

export interface Step5Props extends StepComponentProps {
  placedPlants: any[];
  selectedGardenStyle: string | null;
  generatedVisualization: string | null;
  seasonalImages: any;
  setSeasonalImages: (images: any) => void;
  isGeneratingSeasonalImages: boolean;
  setIsGeneratingSeasonalImages: (generating: boolean) => void;
  seasonalProgress: number;
  setSeasonalProgress: (progress: number) => void;
  showSeasonalDateSelector: boolean;
  setShowSeasonalDateSelector: (show: boolean) => void;
  showSeasonalViewer: boolean;
  setShowSeasonalViewer: (show: boolean) => void;
  handleGenerateSeasonalImages: () => Promise<void>;
}

export interface Step6Props extends StepComponentProps {
  gardenId: string | null;
  placedPlants: any[];
  seasonalImages: any;
  generatedVisualization: string | null;
  completeDesign: any;
  user: any;
}

// Step details configuration
export const stepDetails = [
  { 
    title: 'Welcome', 
    subtitle: 'Start your garden journey',
    description: 'Tell us about your garden location',
    buttonLabel: 'Next: Site Details'
  },
  { 
    title: 'Site Details', 
    subtitle: 'Define your space',
    description: 'Define your garden space',
    buttonLabel: 'Next: Design Approach'
  },
  { 
    title: 'Design Approach', 
    subtitle: 'Choose your design method',
    description: 'AI-assisted or manual design',
    buttonLabel: 'Next: Design Your Garden'
  },
  { 
    title: 'Interactive Design', 
    subtitle: 'Choose and place your plants',
    description: 'Choose and place your plants',
    buttonLabel: 'Next: Generate Seasonal Views'
  },
  { 
    title: 'Seasonal Garden', 
    subtitle: 'Year-round garden views',
    description: 'Generate your seasonal visualization',
    buttonLabel: 'Next: Review & Download'
  },
  { 
    title: 'Review & Download', 
    subtitle: 'Complete your design',
    description: 'Save and share your garden',
    buttonLabel: 'Complete Garden Design'
  }
];