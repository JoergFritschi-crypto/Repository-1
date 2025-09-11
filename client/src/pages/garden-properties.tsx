import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast, useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Thermometer, Droplets, TreePine, ArrowLeft, ArrowRight, MapPin, Sun, Cloud, CloudRain, Wind, Snowflake, Beaker, Sparkles, Shield, Wand2, Palette, AlertCircle } from 'lucide-react';
import GardenSketch from '@/components/garden/garden-sketch';
import GardenLayoutCanvas, { type PlacedPlant } from '@/components/garden/garden-layout-canvas';
import PlantSearchModal from '@/components/plant/plant-search-modal';
import ClimateReportModal from '@/components/garden/climate-report-modal';
import SoilTestingModal from '@/components/garden/soil-testing-modal';
import PhotoUpload from '@/components/garden/photo-upload';
import StyleSelector from '@/components/garden/style-selector';
import SafetyPreferences from '@/components/garden/safety-preferences';
import Navigation from '@/components/layout/navigation';
import { GARDEN_STYLES, CORE_GARDEN_STYLES, ADDITIONAL_GARDEN_STYLES } from '@shared/gardenStyles';
import { useAuthWithTesting } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Lock, Crown, CreditCard } from 'lucide-react';

const gardenSchema = z.object({
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

type GardenFormValues = z.infer<typeof gardenSchema>;

const stepDetails = [
  { 
    title: 'Welcome', 
    subtitle: 'Start your garden journey',
    description: 'Enter location and climate information'
  },
  { 
    title: 'Site Details', 
    subtitle: 'Define your space',
    description: 'Shape, dimensions, photos & soil'
  },
  { 
    title: 'Design Approach', 
    subtitle: 'Choose your path',
    description: 'AI-powered or manual design'
  },
  { 
    title: 'Garden Design', 
    subtitle: 'Create your vision',
    description: 'Interactive canvas & styling'
  },
  { 
    title: 'Generate', 
    subtitle: 'Finalize your design',
    description: 'Review and create blueprint'
  }
];

export default function GardenProperties() {
  const [currentStep, setCurrentStep] = useState(1);
  const [inventoryPlants, setInventoryPlants] = useState<any[]>([]);
  const [placedPlants, setPlacedPlants] = useState<PlacedPlant[]>([]);
  const [showPlantSearch, setShowPlantSearch] = useState(false);
  const [showClimateModal, setShowClimateModal] = useState(false);
  const [showSoilTestingModal, setShowSoilTestingModal] = useState(false);
  const [gardenId, setGardenId] = useState<string | null>(null); // Track saved garden ID
  const [locationToFetch, setLocationToFetch] = useState<string | null>(null);
  const [climateData, setClimateData] = useState<any>(null);
  const [hasUploadedPhotos, setHasUploadedPhotos] = useState(false);
  const [generatedStyles, setGeneratedStyles] = useState<any[]>([]);
  const [hasSetOrientation, setHasSetOrientation] = useState(false);
  const [selectedStyleFromAI, setSelectedStyleFromAI] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [recommendedStyleIds, setRecommendedStyleIds] = useState<string[]>([]);
  const [completeDesign, setCompleteDesign] = useState<any>(null);
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false);
  const [selectedGardenStyle, setSelectedGardenStyle] = useState<string | null>(null);
  const [localDesignApproach, setLocalDesignApproach] = useState<"ai" | "manual" | undefined>(undefined);
  const [, setLocation] = useLocation();
  
  // Get user data and design generation history
  const { user } = useAuthWithTesting();
  const { data: designHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/design-generations'],
    enabled: !!user
  });
  
  // Auto-save is always enabled for paying users, optional for free users
  const isPaidUser = user?.userTier === 'pay_per_design' || user?.userTier === 'premium';
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true); // Default to checked for free users too
  

  const form = useForm<GardenFormValues>({
    resolver: zodResolver(gardenSchema),
    defaultValues: {
      name: '',
      shape: 'rectangle',
      units: undefined, // User MUST choose units
      dimensions: {},
      slopeDirection: 'N',
      slopePercentage: 0,
      design_approach: undefined,
      preferences: {
        toxicityLevel: 'low',
        plantAvailability: 'common',
        noThorns: false,
        lowAllergen: false,
        nativeOnly: false,
        droughtTolerant: false,
      }
    }
  });

  // Watch country to show/hide Perplexity search button
  const watchedCountry = form.watch("country");
  const watchedCity = form.watch("city");
  const watchedZipCode = form.watch("zipCode");
  const watchedDesignApproach = form.watch("design_approach");
  
  // Watch values for GardenSketch to prevent re-render loops
  const watchedShape = form.watch("shape");
  const watchedDimensions = form.watch("dimensions") || {};
  const watchedUnits = form.watch("units");
  const watchedSlopeDirection = form.watch("slopeDirection");
  const watchedSlopePercentage = form.watch("slopePercentage");
  const watchedUsdaZone = form.watch("usdaZone");
  const watchedRhsZone = form.watch("rhsZone");
  const watchedName = form.watch("name");
  const watchedSunExposure = form.watch("sunExposure");
  const watchedSelectedStyle = form.watch("selectedStyle");
  const watchedToxicityLevel = form.watch("preferences.toxicityLevel");
  const watchedPlantAvailability = form.watch("preferences.plantAvailability");

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const nextStep = async () => {
    // Skip validation for admin users
    const isAdmin = user?.isAdmin === true;
    
    // Validate required fields for Step 1 before proceeding (unless admin)
    if (currentStep === 1 && !isAdmin) {
      const values = form.getValues();
      const errors: string[] = [];
      
      // Check required fields
      if (!values.name) errors.push("Garden Name");
      if (!values.usdaZone && !values.rhsZone) errors.push("At least one Hardiness Zone (USDA or RHS)");
      if (!values.sunExposure) errors.push("Sun Exposure");
      if (!values.soilType) errors.push("Soil Type");
      if (!values.soilPh) errors.push("Soil pH");
      
      if (errors.length > 0) {
        toast({
          title: "Required Fields Missing",
          description: `Please fill in the following required fields: ${errors.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
      
      // Auto-save if enabled (always true for paid users)
      const shouldAutoSave = isPaidUser || autoSaveEnabled;
      if (shouldAutoSave && user) {
        try {
          const gardenData = {
            name: values.name,
            city: values.city || undefined,
            zipCode: values.zipCode || undefined,
            country: values.country || undefined,
            usdaZone: values.usdaZone || undefined,
            rhsZone: values.rhsZone || undefined,
            heatZone: values.heatZone || undefined,
            shape: values.shape,
            dimensions: values.dimensions,
            units: values.units,
            sunExposure: values.sunExposure || undefined,
            soilType: values.soilType || undefined,
            soilPh: values.soilPh || undefined,
            slopeDirection: values.slopeDirection,
            slopePercentage: values.slopePercentage,
            hasSoilAnalysis: values.hasSoilAnalysis || false,
            soilAnalysis: values.soilAnalysis || {}
          };
          
          if (gardenId) {
            // Update existing garden
            await updateGardenMutation.mutateAsync({ id: gardenId, data: gardenData });
          } else {
            // Create new garden
            await createGardenMutation.mutateAsync(gardenData);
          }
        } catch (error) {
          console.error("Failed to save garden:", error);
          // Continue to next step even if save fails
        }
      }
    }
    
    // Auto-save on other steps if garden exists and auto-save is enabled
    const shouldAutoSaveLater = isPaidUser || autoSaveEnabled;
    if (currentStep > 1 && shouldAutoSaveLater && gardenId && user) {
      try {
        const values = form.getValues();
        await updateGardenMutation.mutateAsync({ 
          id: gardenId, 
          data: values 
        });
      } catch (error) {
        console.error("Failed to update garden:", error);
        // Continue to next step even if save fails
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const createGardenMutation = useMutation({
    mutationFn: async (data: GardenFormValues) => {
      const response = await apiRequest('POST', '/api/gardens', data);
      return response.json();
    },
    onSuccess: (data) => {
      setGardenId(data.id);
      if (currentStep === 5) {
        // Only redirect on final submission
        toast({
          title: 'Garden Created',
          description: 'Your garden design has been saved successfully!',
        });
        setLocation('/gardens');
      } else {
        // Silent save during progress (for paid users and opted-in free users)
        console.log('Garden auto-saved with ID:', data.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create garden',
        variant: 'destructive',
      });
    },
  });
  
  const updateGardenMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/gardens/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      if (currentStep === 5) {
        toast({
          title: 'Garden Updated',
          description: 'Your garden has been updated successfully!',
        });
      } else {
        // Silent save during progress (for paid users and opted-in free users)
        console.log('Garden auto-updated');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update garden',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: GardenFormValues) => {
    console.log('Form submitted:', data);
    createGardenMutation.mutate(data);
  };

  // Fetch climate data when needed
  const fetchClimateData = async () => {
    if (!locationToFetch) return;
    
    try {
      const response = await apiRequest('GET', `/api/climate?location=${encodeURIComponent(locationToFetch)}`);
      const data = await response.json();
      setClimateData(data);
      
      if (data.usdaZone) {
        form.setValue('usdaZone', data.usdaZone);
      }
      
      toast({
        title: 'Climate Data Retrieved',
        description: `USDA Zone ${data.usdaZone || 'unknown'} for ${locationToFetch}`,
      });
    } catch (error) {
      console.error('Failed to fetch climate data:', error);
      toast({
        title: 'Error',
        description: 'Could not retrieve climate data. Please enter manually.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (locationToFetch) {
      fetchClimateData();
    }
  }, [locationToFetch]);

  // Handler for adding plants to inventory
  const handleAddPlantToInventory = (plant: any) => {
    setInventoryPlants(prev => [...prev, plant]);
    toast({
      title: "Plant Added",
      description: `${plant.commonName} added to inventory`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-green-50">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Card className="border-2 border-primary shadow-sm mb-2">
            <CardHeader className="py-6 flower-band-studio rounded-t-lg">
              <CardTitle className="text-2xl md:text-3xl">Garden Design Studio</CardTitle>
            </CardHeader>
          </Card>
          <p className="text-sm md:text-base text-gray-600">Create your personalized garden with AI assistance</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {stepDetails.map((step, index) => (
              <div 
                key={index} 
                className={`flex-1 text-center ${index < stepDetails.length - 1 ? 'relative' : ''}`}
              >
                <div 
                  className={`w-8 h-8 md:w-10 md:h-10 mx-auto rounded-full flex items-center justify-center text-sm md:text-base font-semibold transition-colors relative z-10 ${
                    currentStep > index + 1 
                      ? 'bg-primary text-white' 
                      : currentStep === index + 1 
                      ? 'bg-primary text-white ring-4 ring-primary/20' 
                      : 'bg-gray-200 text-gray-600'
                  }`}
                  data-testid={`step-indicator-${index + 1}`}
                >
                  {currentStep > index + 1 ? '✓' : index + 1}
                </div>
                <p className="text-xs mt-1 font-medium hidden md:block">{step.title}</p>
                <p className="text-xs text-gray-500 hidden lg:block">{step.subtitle}</p>
                {index < stepDetails.length - 1 && (
                  <div 
                    className={`absolute top-4 md:top-5 left-[calc(50%+20px)] right-0 h-0.5 transition-colors -z-10 ${
                      currentStep > index + 1 ? 'bg-primary' : 'bg-gray-300'
                    }`} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Info */}
        <Card className="mb-4 border-2 border-primary shadow-sm">
          <CardHeader className={`py-5 ${
            currentStep === 1 ? 'flower-band-wildflower' :
            currentStep === 2 ? 'flower-band-tropical' :
            currentStep === 3 ? 'flower-band-cottage' :
            currentStep === 4 ? 'flower-band-modern' :
            'flower-band-zen'
          } rounded-t-lg`}>
            <CardTitle className="text-base md:text-lg">
              Step {currentStep}: {stepDetails[currentStep - 1].title}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {stepDetails[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1: Welcome & Location */}
            {currentStep === 1 && (
              <Card className="border-2 border-primary shadow-sm" data-testid="step-welcome-location">
                <CardHeader className="py-7 flower-band-spring rounded-t-lg">
                  <CardTitle className="text-base">Welcome to Your Garden Journey</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* Admin mode indicator */}
                  {user?.isAdmin && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <p className="text-sm font-medium text-purple-800">
                          Admin Mode - All validation bypassed
                        </p>
                      </div>
                      <p className="text-xs text-purple-700 mt-1 ml-7">
                        You can navigate freely through all steps without field requirements.
                      </p>
                    </div>
                  )}
                  
                  {/* Auto-save preference - only shown for free users */}
                  {!isPaidUser && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="auto-save"
                          checked={autoSaveEnabled}
                          onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          data-testid="checkbox-auto-save"
                        />
                        <label htmlFor="auto-save" className="text-sm text-gray-700 cursor-pointer">
                          <span className="font-semibold">Save my garden data for future use</span>
                          <p className="text-xs text-gray-600 mt-1">
                            Your garden information will be automatically saved as you progress, allowing you to:
                          </p>
                          <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc">
                            <li>Return anytime to continue where you left off</li>
                            <li>Keep your designs and access them later</li>
                            <li>Upgrade to premium for unlimited design iterations</li>
                          </ul>
                          <p className="text-xs text-gray-500 mt-2 italic">
                            Uncheck this if you prefer to keep data only in your browser for this session
                          </p>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-save info for paid users */}
                  {isPaidUser && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm font-medium text-green-800">
                          {user?.userTier === 'premium' ? 'Premium' : 'Pay-Per-Design'} Member - All data automatically saved
                        </p>
                      </div>
                      <p className="text-xs text-green-700 mt-1 ml-7">
                        Your garden designs and data are permanently stored and accessible anytime.
                      </p>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Garden Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="My Beautiful Garden" {...field} data-testid="input-garden-name" />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Give your garden a memorable name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location Information */}
                  <div className="space-y-4">
                    <Label>Location Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Enter your location details for accurate climate data and plant recommendations
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="New York" {...field} data-testid="input-city" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ZIP/Postal Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="10001" {...field} data-testid="input-zip-code" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-country">
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="AF">Afghanistan</SelectItem>
                                  <SelectItem value="AL">Albania</SelectItem>
                                  <SelectItem value="DZ">Algeria</SelectItem>
                                  <SelectItem value="AD">Andorra</SelectItem>
                                  <SelectItem value="AO">Angola</SelectItem>
                                  <SelectItem value="AG">Antigua and Barbuda</SelectItem>
                                  <SelectItem value="AR">Argentina</SelectItem>
                                  <SelectItem value="AM">Armenia</SelectItem>
                                  <SelectItem value="AU">Australia</SelectItem>
                                  <SelectItem value="AT">Austria</SelectItem>
                                  <SelectItem value="AZ">Azerbaijan</SelectItem>
                                  <SelectItem value="BS">Bahamas</SelectItem>
                                  <SelectItem value="BH">Bahrain</SelectItem>
                                  <SelectItem value="BD">Bangladesh</SelectItem>
                                  <SelectItem value="BB">Barbados</SelectItem>
                                  <SelectItem value="BY">Belarus</SelectItem>
                                  <SelectItem value="BE">Belgium</SelectItem>
                                  <SelectItem value="BZ">Belize</SelectItem>
                                  <SelectItem value="BJ">Benin</SelectItem>
                                  <SelectItem value="BT">Bhutan</SelectItem>
                                  <SelectItem value="BO">Bolivia</SelectItem>
                                  <SelectItem value="BA">Bosnia and Herzegovina</SelectItem>
                                  <SelectItem value="BW">Botswana</SelectItem>
                                  <SelectItem value="BR">Brazil</SelectItem>
                                  <SelectItem value="BN">Brunei</SelectItem>
                                  <SelectItem value="BG">Bulgaria</SelectItem>
                                  <SelectItem value="BF">Burkina Faso</SelectItem>
                                  <SelectItem value="BI">Burundi</SelectItem>
                                  <SelectItem value="CV">Cabo Verde</SelectItem>
                                  <SelectItem value="KH">Cambodia</SelectItem>
                                  <SelectItem value="CM">Cameroon</SelectItem>
                                  <SelectItem value="CA">Canada</SelectItem>
                                  <SelectItem value="CF">Central African Republic</SelectItem>
                                  <SelectItem value="TD">Chad</SelectItem>
                                  <SelectItem value="CL">Chile</SelectItem>
                                  <SelectItem value="CN">China</SelectItem>
                                  <SelectItem value="CO">Colombia</SelectItem>
                                  <SelectItem value="KM">Comoros</SelectItem>
                                  <SelectItem value="CG">Congo</SelectItem>
                                  <SelectItem value="CR">Costa Rica</SelectItem>
                                  <SelectItem value="HR">Croatia</SelectItem>
                                  <SelectItem value="CU">Cuba</SelectItem>
                                  <SelectItem value="CY">Cyprus</SelectItem>
                                  <SelectItem value="CZ">Czech Republic</SelectItem>
                                  <SelectItem value="DK">Denmark</SelectItem>
                                  <SelectItem value="DJ">Djibouti</SelectItem>
                                  <SelectItem value="DM">Dominica</SelectItem>
                                  <SelectItem value="DO">Dominican Republic</SelectItem>
                                  <SelectItem value="EC">Ecuador</SelectItem>
                                  <SelectItem value="EG">Egypt</SelectItem>
                                  <SelectItem value="SV">El Salvador</SelectItem>
                                  <SelectItem value="GQ">Equatorial Guinea</SelectItem>
                                  <SelectItem value="ER">Eritrea</SelectItem>
                                  <SelectItem value="EE">Estonia</SelectItem>
                                  <SelectItem value="SZ">Eswatini</SelectItem>
                                  <SelectItem value="ET">Ethiopia</SelectItem>
                                  <SelectItem value="FJ">Fiji</SelectItem>
                                  <SelectItem value="FI">Finland</SelectItem>
                                  <SelectItem value="FR">France</SelectItem>
                                  <SelectItem value="GA">Gabon</SelectItem>
                                  <SelectItem value="GM">Gambia</SelectItem>
                                  <SelectItem value="GE">Georgia</SelectItem>
                                  <SelectItem value="DE">Germany</SelectItem>
                                  <SelectItem value="GH">Ghana</SelectItem>
                                  <SelectItem value="GR">Greece</SelectItem>
                                  <SelectItem value="GD">Grenada</SelectItem>
                                  <SelectItem value="GT">Guatemala</SelectItem>
                                  <SelectItem value="GN">Guinea</SelectItem>
                                  <SelectItem value="GW">Guinea-Bissau</SelectItem>
                                  <SelectItem value="GY">Guyana</SelectItem>
                                  <SelectItem value="HT">Haiti</SelectItem>
                                  <SelectItem value="HN">Honduras</SelectItem>
                                  <SelectItem value="HU">Hungary</SelectItem>
                                  <SelectItem value="IS">Iceland</SelectItem>
                                  <SelectItem value="IN">India</SelectItem>
                                  <SelectItem value="ID">Indonesia</SelectItem>
                                  <SelectItem value="IR">Iran</SelectItem>
                                  <SelectItem value="IQ">Iraq</SelectItem>
                                  <SelectItem value="IE">Ireland</SelectItem>
                                  <SelectItem value="IL">Israel</SelectItem>
                                  <SelectItem value="IT">Italy</SelectItem>
                                  <SelectItem value="JM">Jamaica</SelectItem>
                                  <SelectItem value="JP">Japan</SelectItem>
                                  <SelectItem value="JO">Jordan</SelectItem>
                                  <SelectItem value="KZ">Kazakhstan</SelectItem>
                                  <SelectItem value="KE">Kenya</SelectItem>
                                  <SelectItem value="KI">Kiribati</SelectItem>
                                  <SelectItem value="KP">North Korea</SelectItem>
                                  <SelectItem value="KR">South Korea</SelectItem>
                                  <SelectItem value="KW">Kuwait</SelectItem>
                                  <SelectItem value="KG">Kyrgyzstan</SelectItem>
                                  <SelectItem value="LA">Laos</SelectItem>
                                  <SelectItem value="LV">Latvia</SelectItem>
                                  <SelectItem value="LB">Lebanon</SelectItem>
                                  <SelectItem value="LS">Lesotho</SelectItem>
                                  <SelectItem value="LR">Liberia</SelectItem>
                                  <SelectItem value="LY">Libya</SelectItem>
                                  <SelectItem value="LI">Liechtenstein</SelectItem>
                                  <SelectItem value="LT">Lithuania</SelectItem>
                                  <SelectItem value="LU">Luxembourg</SelectItem>
                                  <SelectItem value="MG">Madagascar</SelectItem>
                                  <SelectItem value="MW">Malawi</SelectItem>
                                  <SelectItem value="MY">Malaysia</SelectItem>
                                  <SelectItem value="MV">Maldives</SelectItem>
                                  <SelectItem value="ML">Mali</SelectItem>
                                  <SelectItem value="MT">Malta</SelectItem>
                                  <SelectItem value="MH">Marshall Islands</SelectItem>
                                  <SelectItem value="MR">Mauritania</SelectItem>
                                  <SelectItem value="MU">Mauritius</SelectItem>
                                  <SelectItem value="MX">Mexico</SelectItem>
                                  <SelectItem value="FM">Micronesia</SelectItem>
                                  <SelectItem value="MD">Moldova</SelectItem>
                                  <SelectItem value="MC">Monaco</SelectItem>
                                  <SelectItem value="MN">Mongolia</SelectItem>
                                  <SelectItem value="ME">Montenegro</SelectItem>
                                  <SelectItem value="MA">Morocco</SelectItem>
                                  <SelectItem value="MZ">Mozambique</SelectItem>
                                  <SelectItem value="MM">Myanmar</SelectItem>
                                  <SelectItem value="NA">Namibia</SelectItem>
                                  <SelectItem value="NR">Nauru</SelectItem>
                                  <SelectItem value="NP">Nepal</SelectItem>
                                  <SelectItem value="NL">Netherlands</SelectItem>
                                  <SelectItem value="NZ">New Zealand</SelectItem>
                                  <SelectItem value="NI">Nicaragua</SelectItem>
                                  <SelectItem value="NE">Niger</SelectItem>
                                  <SelectItem value="NG">Nigeria</SelectItem>
                                  <SelectItem value="MK">North Macedonia</SelectItem>
                                  <SelectItem value="NO">Norway</SelectItem>
                                  <SelectItem value="OM">Oman</SelectItem>
                                  <SelectItem value="PK">Pakistan</SelectItem>
                                  <SelectItem value="PW">Palau</SelectItem>
                                  <SelectItem value="PS">Palestine</SelectItem>
                                  <SelectItem value="PA">Panama</SelectItem>
                                  <SelectItem value="PG">Papua New Guinea</SelectItem>
                                  <SelectItem value="PY">Paraguay</SelectItem>
                                  <SelectItem value="PE">Peru</SelectItem>
                                  <SelectItem value="PH">Philippines</SelectItem>
                                  <SelectItem value="PL">Poland</SelectItem>
                                  <SelectItem value="PT">Portugal</SelectItem>
                                  <SelectItem value="QA">Qatar</SelectItem>
                                  <SelectItem value="RO">Romania</SelectItem>
                                  <SelectItem value="RU">Russia</SelectItem>
                                  <SelectItem value="RW">Rwanda</SelectItem>
                                  <SelectItem value="KN">Saint Kitts and Nevis</SelectItem>
                                  <SelectItem value="LC">Saint Lucia</SelectItem>
                                  <SelectItem value="VC">Saint Vincent and the Grenadines</SelectItem>
                                  <SelectItem value="WS">Samoa</SelectItem>
                                  <SelectItem value="SM">San Marino</SelectItem>
                                  <SelectItem value="ST">Sao Tome and Principe</SelectItem>
                                  <SelectItem value="SA">Saudi Arabia</SelectItem>
                                  <SelectItem value="SN">Senegal</SelectItem>
                                  <SelectItem value="RS">Serbia</SelectItem>
                                  <SelectItem value="SC">Seychelles</SelectItem>
                                  <SelectItem value="SL">Sierra Leone</SelectItem>
                                  <SelectItem value="SG">Singapore</SelectItem>
                                  <SelectItem value="SK">Slovakia</SelectItem>
                                  <SelectItem value="SI">Slovenia</SelectItem>
                                  <SelectItem value="SB">Solomon Islands</SelectItem>
                                  <SelectItem value="SO">Somalia</SelectItem>
                                  <SelectItem value="ZA">South Africa</SelectItem>
                                  <SelectItem value="SS">South Sudan</SelectItem>
                                  <SelectItem value="ES">Spain</SelectItem>
                                  <SelectItem value="LK">Sri Lanka</SelectItem>
                                  <SelectItem value="SD">Sudan</SelectItem>
                                  <SelectItem value="SR">Suriname</SelectItem>
                                  <SelectItem value="SE">Sweden</SelectItem>
                                  <SelectItem value="CH">Switzerland</SelectItem>
                                  <SelectItem value="SY">Syria</SelectItem>
                                  <SelectItem value="TW">Taiwan</SelectItem>
                                  <SelectItem value="TJ">Tajikistan</SelectItem>
                                  <SelectItem value="TZ">Tanzania</SelectItem>
                                  <SelectItem value="TH">Thailand</SelectItem>
                                  <SelectItem value="TL">Timor-Leste</SelectItem>
                                  <SelectItem value="TG">Togo</SelectItem>
                                  <SelectItem value="TO">Tonga</SelectItem>
                                  <SelectItem value="TT">Trinidad and Tobago</SelectItem>
                                  <SelectItem value="TN">Tunisia</SelectItem>
                                  <SelectItem value="TR">Turkey</SelectItem>
                                  <SelectItem value="TM">Turkmenistan</SelectItem>
                                  <SelectItem value="TV">Tuvalu</SelectItem>
                                  <SelectItem value="UG">Uganda</SelectItem>
                                  <SelectItem value="UA">Ukraine</SelectItem>
                                  <SelectItem value="AE">United Arab Emirates</SelectItem>
                                  <SelectItem value="GB">United Kingdom</SelectItem>
                                  <SelectItem value="US">United States</SelectItem>
                                  <SelectItem value="UY">Uruguay</SelectItem>
                                  <SelectItem value="UZ">Uzbekistan</SelectItem>
                                  <SelectItem value="VU">Vanuatu</SelectItem>
                                  <SelectItem value="VA">Vatican City</SelectItem>
                                  <SelectItem value="VE">Venezuela</SelectItem>
                                  <SelectItem value="VN">Vietnam</SelectItem>
                                  <SelectItem value="YE">Yemen</SelectItem>
                                  <SelectItem value="ZM">Zambia</SelectItem>
                                  <SelectItem value="ZW">Zimbabwe</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const city = form.getValues('city');
                            const zipCode = form.getValues('zipCode');
                            const country = form.getValues('country');
                            if (city && country) {
                              // Include zip code for more accurate geocoding if available
                              const locationString = zipCode 
                                ? `${city}, ${zipCode}, ${country}`
                                : `${city}, ${country}`;
                              setLocationToFetch(locationString);
                              setShowClimateModal(true);
                            } else {
                              toast({
                                title: 'Missing Information',
                                description: 'Please enter both city and country',
                                variant: 'destructive'
                              });
                            }
                          }}
                          disabled={!watchedCity || !watchedCountry}
                          className="w-full"
                          data-testid="button-get-climate"
                        >
                          <Thermometer className="w-4 h-4 mr-2" />
                          Get Climate Data
                        </Button>

                        <div className="space-y-4 mt-4">
                          <div className="text-sm text-muted-foreground">
                            Climate zones (auto-filled after getting climate data)
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="usdaZone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                USDA Hardiness Zone <span className="text-red-500">*</span>
                                <span className="text-xs text-muted-foreground ml-2">(at least one zone required)</span>
                              </FormLabel>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Clear RHS zone when USDA is selected (mutually exclusive)
                                      if (value) {
                                        form.setValue("rhsZone", "");
                                      }
                                    }} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-usda-zone">
                                        <SelectValue placeholder="Select zone" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="3a">Zone 3a (-40 to -35°F)</SelectItem>
                                      <SelectItem value="3b">Zone 3b (-35 to -30°F)</SelectItem>
                                      <SelectItem value="4a">Zone 4a (-30 to -25°F)</SelectItem>
                                      <SelectItem value="4b">Zone 4b (-25 to -20°F)</SelectItem>
                                      <SelectItem value="5a">Zone 5a (-20 to -15°F)</SelectItem>
                                      <SelectItem value="5b">Zone 5b (-15 to -10°F)</SelectItem>
                                      <SelectItem value="6a">Zone 6a (-10 to -5°F)</SelectItem>
                                      <SelectItem value="6b">Zone 6b (-5 to 0°F)</SelectItem>
                                      <SelectItem value="7a">Zone 7a (0 to 5°F)</SelectItem>
                                      <SelectItem value="7b">Zone 7b (5 to 10°F)</SelectItem>
                                      <SelectItem value="8a">Zone 8a (10 to 15°F)</SelectItem>
                                      <SelectItem value="8b">Zone 8b (15 to 20°F)</SelectItem>
                                      <SelectItem value="9a">Zone 9a (20 to 25°F)</SelectItem>
                                      <SelectItem value="9b">Zone 9b (25 to 30°F)</SelectItem>
                                      <SelectItem value="10a">Zone 10a (30 to 35°F)</SelectItem>
                                      <SelectItem value="10b">Zone 10b (35 to 40°F)</SelectItem>
                                      <SelectItem value="11">Zone 11 (Above 40°F)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription className="text-xs">
                                    Primary cold hardiness zone
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="rhsZone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    RHS Hardiness Rating <span className="text-red-500">*</span>
                                    <span className="text-xs text-muted-foreground ml-2">(at least one zone required)</span>
                                  </FormLabel>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Clear USDA zone when RHS is selected (mutually exclusive)
                                      if (value) {
                                        form.setValue("usdaZone", "");
                                      }
                                    }} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-rhs-zone">
                                        <SelectValue placeholder="Select rating" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="H1">H1 - Tropical (Above 15°C)</SelectItem>
                                      <SelectItem value="H2">H2 - Subtropical (10-15°C)</SelectItem>
                                      <SelectItem value="H3">H3 - Warm temperate (5-10°C)</SelectItem>
                                      <SelectItem value="H4">H4 - Cool temperate (-5 to 5°C)</SelectItem>
                                      <SelectItem value="H5">H5 - Cold (-10 to -5°C)</SelectItem>
                                      <SelectItem value="H6">H6 - Very cold (-15 to -10°C)</SelectItem>
                                      <SelectItem value="H7">H7 - Extremely cold (Below -15°C)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription className="text-xs">
                                    Temperature hardiness rating
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="heatZone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>AHS Heat Zone</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-heat-zone">
                                      <SelectValue placeholder="Select heat zone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1">Zone 1 (Less than 1 day above 86°F)</SelectItem>
                                    <SelectItem value="2">Zone 2 (1-7 days above 86°F)</SelectItem>
                                    <SelectItem value="3">Zone 3 (8-14 days above 86°F)</SelectItem>
                                    <SelectItem value="4">Zone 4 (15-30 days above 86°F)</SelectItem>
                                    <SelectItem value="5">Zone 5 (31-45 days above 86°F)</SelectItem>
                                    <SelectItem value="6">Zone 6 (46-60 days above 86°F)</SelectItem>
                                    <SelectItem value="7">Zone 7 (61-90 days above 86°F)</SelectItem>
                                    <SelectItem value="8">Zone 8 (91-120 days above 86°F)</SelectItem>
                                    <SelectItem value="9">Zone 9 (121-150 days above 86°F)</SelectItem>
                                    <SelectItem value="10">Zone 10 (151-180 days above 86°F)</SelectItem>
                                    <SelectItem value="11">Zone 11 (181-210 days above 86°F)</SelectItem>
                                    <SelectItem value="12">Zone 12 (More than 210 days above 86°F)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                  American Horticultural Society heat tolerance zone
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="sunExposure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Sun Exposure <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-sun-exposure">
                              <SelectValue placeholder="Select sun exposure" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full_sun">
                              <div className="flex items-center">
                                <Sun className="w-4 h-4 mr-2 text-yellow-500" />
                                Full Sun (6+ hours)
                              </div>
                            </SelectItem>
                            <SelectItem value="partial_sun">
                              <div className="flex items-center">
                                <Sun className="w-4 h-4 mr-2 text-yellow-300" />
                                Partial Sun (4-6 hours)
                              </div>
                            </SelectItem>
                            <SelectItem value="partial_shade">
                              <div className="flex items-center">
                                <Cloud className="w-4 h-4 mr-2 text-gray-400" />
                                Partial Shade (2-4 hours)
                              </div>
                            </SelectItem>
                            <SelectItem value="full_shade">
                              <div className="flex items-center">
                                <CloudRain className="w-4 h-4 mr-2 text-gray-600" />
                                Full Shade (Less than 2 hours)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Average daily sun exposure in your garden
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Soil Information</h3>
                    
                    <FormField
                      control={form.control}
                      name="soilType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soil Type <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-soil-type">
                                <SelectValue placeholder="Select soil type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="clay">Clay - Heavy, holds moisture</SelectItem>
                              <SelectItem value="sand">Sandy - Light, drains quickly</SelectItem>
                              <SelectItem value="loam">Loam - Ideal mix, well-balanced</SelectItem>
                              <SelectItem value="silt">Silt - Smooth, retains moisture</SelectItem>
                              <SelectItem value="chalk">Chalk - Alkaline, free-draining</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Your garden's primary soil composition
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="soilPh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soil pH <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-soil-ph">
                                <SelectValue placeholder="Select pH level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="acidic">Acidic (below 7.0)</SelectItem>
                              <SelectItem value="neutral">Neutral (around 7.0)</SelectItem>
                              <SelectItem value="alkaline">Alkaline (above 7.0)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            General soil acidity level
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasSoilAnalysis"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-soil-analysis"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>I have professional soil test results</FormLabel>
                            <FormDescription className="text-xs">
                              Check this if you have detailed soil analysis data
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch("hasSoilAnalysis") && (
                      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-semibold mb-3">Enter Soil Test Results</h4>
                        <Tabs defaultValue="basic" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic</TabsTrigger>
                            <TabsTrigger value="nutrients">Nutrients</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="basic" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="soilAnalysis.ph"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>pH Value</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="6.5" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      3.0 - 11.0
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.organicMatter"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Organic Matter (%)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="3.5" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Target: 3-5%
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="soilAnalysis.texture"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Soil Texture</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select texture" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="sandy">Sandy</SelectItem>
                                      <SelectItem value="sandy_loam">Sandy Loam</SelectItem>
                                      <SelectItem value="loam">Loam</SelectItem>
                                      <SelectItem value="silt_loam">Silt Loam</SelectItem>
                                      <SelectItem value="clay_loam">Clay Loam</SelectItem>
                                      <SelectItem value="clay">Clay</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                          
                          <TabsContent value="nutrients" className="space-y-4 mt-4">
                            <div className="grid grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="soilAnalysis.nitrogen"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nitrogen (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="40" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.phosphorus"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phosphorus (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="30" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.potassium"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Potassium (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="150" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="soilAnalysis.calcium"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Calcium (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="1200" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.magnesium"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Magnesium (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="200" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.sulfur"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Sulfur (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="20" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="advanced" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="soilAnalysis.cec"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>CEC (meq/100g)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="15" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Cation Exchange Capacity
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.salinity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Salinity (dS/m)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="0.5" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Electrical Conductivity
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4">
                              <FormField
                                control={form.control}
                                name="soilAnalysis.iron"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Iron (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="10" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.zinc"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Zinc (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="2" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.copper"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Copper (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="1" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="soilAnalysis.boron"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Boron (ppm)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="0.5" 
                                        {...field}
                                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setLocationToFetch(watchedCountry || watchedCity || '');
                        setShowSoilTestingModal(true);
                      }}
                      className="w-full"
                      data-testid="button-find-soil-testing"
                    >
                      <Beaker className="w-4 h-4 mr-2" />
                      Find Soil Testing in Your Region
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Shape & Orientation - Combined */}
            {currentStep === 2 && (
              <div className="space-y-3">
                {/* Garden Shape & Dimensions - FIRST */}
                <Card className="border-2 border-primary shadow-sm" data-testid="step-shape-orientation">
                  <CardHeader className="py-7 flower-band-summer rounded-t-lg">
                    <CardTitle className="text-base">Garden Shape & Dimensions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <FormField
                      control={form.control}
                      name="shape"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Garden Shape <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-shape">
                                <SelectValue placeholder="Select garden shape" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rectangle">Rectangle</SelectItem>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="circle">Circle</SelectItem>
                              <SelectItem value="oval">Oval</SelectItem>
                              <SelectItem value="triangle">Triangle</SelectItem>
                              <SelectItem value="l_shaped">L-Shaped</SelectItem>
                              <SelectItem value="r_shaped">R-Shaped (Mirrored L)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="units"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Measurement Units <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-units">
                                  <SelectValue placeholder="Select units" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="feet">Feet (Imperial)</SelectItem>
                                <SelectItem value="meters">Meters (Metric)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Your choice of units will be used throughout the entire design process
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchedShape === 'rectangle' && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dimensions.length"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="10" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    data-testid="input-dimension-length"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dimensions.width"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Width ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="8" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    data-testid="input-dimension-width"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {watchedShape === 'square' && (
                        <FormField
                          control={form.control}
                          name="dimensions.side"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Side Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="10" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  data-testid="input-dimension-side"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {watchedShape === 'circle' && (
                        <FormField
                          control={form.control}
                          name="dimensions.radius"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Radius ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="5" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  data-testid="input-dimension-radius"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {watchedShape === 'oval' && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dimensions.majorAxis"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Major Axis ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="12" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    data-testid="input-dimension-major"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dimensions.minorAxis"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Minor Axis ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="8" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    data-testid="input-dimension-minor"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {watchedShape === 'triangle' && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dimensions.base"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Base ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="10" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    data-testid="input-dimension-base"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dimensions.height"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Height ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="8" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    data-testid="input-dimension-height"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {['l_shaped', 'r_shaped'].includes(watchedShape) && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Define the main body and the cutout dimensions
                          </p>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="dimensions.mainLength"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Main Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="15" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                      data-testid="input-dimension-main-length"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="dimensions.mainWidth"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Main Width ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="10" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                      data-testid="input-dimension-main-width"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="dimensions.cutoutLength"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cutout Length ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="8" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                      data-testid="input-dimension-cutout-length"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="dimensions.cutoutWidth"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cutout Width ({watchedUnits}) <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="5" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                      data-testid="input-dimension-cutout-width"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Slope & Orientation</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="slopeDirection"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slope Direction</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-slope-direction">
                                    <SelectValue placeholder="Select direction" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="N">North</SelectItem>
                                  <SelectItem value="NE">Northeast</SelectItem>
                                  <SelectItem value="E">East</SelectItem>
                                  <SelectItem value="SE">Southeast</SelectItem>
                                  <SelectItem value="S">South</SelectItem>
                                  <SelectItem value="SW">Southwest</SelectItem>
                                  <SelectItem value="W">West</SelectItem>
                                  <SelectItem value="NW">Northwest</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Direction the slope faces
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="slopePercentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slope Percentage (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  min="0"
                                  max="100"
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  data-testid="input-slope-percentage"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                0% = flat, 100% = 45° angle
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Garden Sketch with rotatable rings */}
                <Card className="border-2 border-primary shadow-sm" data-testid="step-garden-sketch">
                  <CardHeader className="py-7 flower-band-autumn rounded-t-lg">
                    <CardTitle className="text-base">Garden Orientation & View <span className="text-red-500">*</span></CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Set north direction and viewing point using the interactive controls below</p>
                  </CardHeader>
                  <CardContent>
                    <GardenSketch
                      shape={watchedShape}
                      dimensions={watchedDimensions}
                      units={watchedUnits === 'feet' ? 'imperial' : 'metric'}
                      slopeDirection={watchedSlopeDirection}
                      slopePercentage={watchedSlopePercentage}
                      usdaZone={watchedUsdaZone}
                      rhsZone={watchedRhsZone}
                      onOrientationChange={(isComplete) => setHasSetOrientation(isComplete)}
                    />
                  </CardContent>
                </Card>

                {/* Orientation Warning if not set */}
                {!hasSetOrientation && (
                  <Card className="border-2 border-orange-400 bg-orange-50 shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-orange-800">
                            Garden Orientation Not Set
                          </p>
                          <p className="text-sm text-orange-700">
                            Please set your garden's actual north direction and viewing point above. 
                            These are critical for accurate sun exposure calculations and proper plant placement in your design.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Photo Upload Section - LAST, after defining garden shape and dimensions */}
                <PhotoUpload 
                  maxPhotos={6}
                  onPhotosChange={(photos) => {
                    setHasUploadedPhotos(photos.length > 0);
                    console.log(`Uploaded ${photos.length} photos`);
                  }}
                  gardenData={form.getValues()}
                  onAnalysisComplete={(analysis) => {
                    console.log('Garden analysis complete', analysis);
                    setAnalysis(analysis);
                  }}
                  onRecommendedStyles={(styleIds) => {
                    console.log('Recommended styles:', styleIds);
                    setRecommendedStyleIds(styleIds);
                  }}
                />
              </div>
            )}

            {/* Step 3: Choose Your Design Approach - Workflow Decision Point */}
            {currentStep === 3 && (
              <div className="space-y-3">
                {/* If user selected a style from AI in Step 2, show it and ask how to proceed */}
                {selectedStyleFromAI ? (
                  <>
                    {/* Show the selected style */}
                    <Card className="border-2 border-indigo-500 bg-indigo-50/30 shadow-sm" data-testid="selected-ai-style">
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          Your Selected Design Style
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="p-3 bg-white rounded-lg border-2 border-indigo-300">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-sm">{selectedStyleFromAI.styleName}</h4>
                            <Badge className="bg-indigo-100 text-indigo-700">
                              Match: {selectedStyleFromAI.suitabilityScore}/10
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{selectedStyleFromAI.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="font-medium">Maintenance:</span> {selectedStyleFromAI.maintenanceLevel}
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="font-medium">Colors:</span> {selectedStyleFromAI.colorScheme?.join(', ')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ask how to proceed with this style */}
                    <Card className="border-2 border-primary shadow-sm" data-testid="step-design-approach">
                      <CardHeader className="py-7 flower-band-green rounded-t-lg">
                        <CardTitle className="text-base">How would you like to proceed?</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                        <FormField
                          control={form.control}
                          name="design_approach"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Choose how to create your garden layout</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={localDesignApproach || field.value || ""}
                                  onValueChange={(value) => {
                                    const typedValue = value as "ai" | "manual";
                                    setLocalDesignApproach(typedValue);
                                    field.onChange(typedValue);
                                    form.setValue("design_approach", typedValue);
                                  }}
                                  className="space-y-3"
                                >
                                  <div className="flex items-start space-x-3">
                                    <RadioGroupItem value="ai" id="ai" />
                                    <div>
                                      <Label htmlFor="ai" className="font-medium">
                                        Continue with AI Layout Generation
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        Let AI create the complete garden layout using the {selectedStyleFromAI.styleName} style, with plant placement and design details
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-start space-x-3">
                                    <RadioGroupItem value="manual" id="manual" />
                                    <div>
                                      <Label htmlFor="manual" className="font-medium">
                                        Switch to Manual Design
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        Use the style as inspiration but manually place plants and design your garden on the interactive canvas
                                      </p>
                                    </div>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Safety Preferences for AI approach with selected style */}
                    {(localDesignApproach === "ai" || watchedDesignApproach === "ai") && (
                      <SafetyPreferences form={form} showAvailabilityPreference={true} />
                    )}
                    
                    {/* Generate Design Button when style was selected from AI analysis */}
                    {(localDesignApproach === "ai" || watchedDesignApproach === "ai") && (
                      <Card className="border-2 border-green-500 bg-green-50 shadow-sm">
                        <CardContent className="py-6">
                          <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Sparkles className="w-5 h-5 text-green-600" />
                              <h3 className="text-lg font-semibold text-green-800">
                                Ready to Generate Your Garden Design!
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 max-w-md mx-auto">
                              You've selected the <strong>{selectedStyleFromAI?.styleName}</strong> style based on Claude's analysis.
                              Click below to generate your personalized garden design.
                            </p>
                            <Button
                              type="button"
                              size="lg"
                              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                              onClick={() => {
                                // Advance to Step 4 where the design will be generated
                                setCurrentStep(4);
                              }}
                              data-testid="button-generate-ai-design"
                            >
                              <Wand2 className="w-5 h-5 mr-2" />
                              Generate My Garden Design
                            </Button>
                            <p className="text-xs text-gray-500">
                              This will create a complete garden layout with plant selections based on Claude's recommendations.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  /* Original flow if no AI style was selected */
                  <Card className="border-2 border-primary shadow-sm" data-testid="step-design-approach">
                    <CardHeader className="py-7 flower-band-green rounded-t-lg">
                      <CardTitle className="text-base">Choose Your Design Approach</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <FormField
                        control={form.control}
                        name="design_approach"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>How would you like to design your garden?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                value={localDesignApproach || field.value || ""}
                                onValueChange={(value) => {
                                  const typedValue = value as "ai" | "manual";
                                  setLocalDesignApproach(typedValue);
                                  field.onChange(typedValue);
                                  form.setValue("design_approach", typedValue);
                                }}
                                className="space-y-3"
                              >
                                <div className="flex items-start space-x-3">
                                  <RadioGroupItem value="ai" id="ai" />
                                  <div>
                                    <Label htmlFor="ai" className="font-medium">
                                      AI-Powered Design
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                      Choose from our curated garden styles and let AI create your complete design
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                  <RadioGroupItem value="manual" id="manual" />
                                  <div>
                                    <Label htmlFor="manual" className="font-medium">
                                      Manual Design
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                      Full control: Choose plants yourself and design your garden on the interactive canvas
                                    </p>
                                  </div>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Show AI Style options only if AI approach is chosen AND no style selected from Step 2 */}
                {(localDesignApproach === "ai" || watchedDesignApproach === "ai") && !selectedStyleFromAI && (
                  <>
                    {/* Garden Style Selection using StyleSelector component */}
                    <Card className="border-2 border-purple-300 bg-purple-50/30 shadow-sm" data-testid="ai-style-selection">
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          Select Your Garden Style
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <StyleSelector
                          gardenStyles={Object.values(GARDEN_STYLES)}
                          selectedStyle={selectedGardenStyle}
                          onStyleSelect={(styleId) => {
                            setSelectedGardenStyle(styleId);
                            form.setValue('style', styleId);
                          }}
                          analysisData={analysis}
                          showAIRecommendations={hasUploadedPhotos}
                        />
                      </CardContent>
                    </Card>
                  
                  {/* Safety Preferences for AI approach (after selecting a style from predefined list) */}
                  {selectedGardenStyle && (
                    <SafetyPreferences form={form} showAvailabilityPreference={true} />
                  )}
                  
                  {/* Generate Design Button - Manual trigger to proceed to Step 4 */}
                  {selectedGardenStyle && (
                    <Card className="border-2 border-green-500 bg-green-50 shadow-sm">
                      <CardContent className="py-6">
                        <div className="text-center space-y-3">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-green-800">
                              Ready to Generate Your Garden Design!
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 max-w-md mx-auto">
                            You've selected the <strong>{selectedGardenStyle}</strong> style.
                            Click below to generate your personalized garden design based on your preferences.
                          </p>
                          <Button
                            type="button"
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                            onClick={() => {
                              // Advance to Step 4 where the design will be generated
                              setCurrentStep(4);
                            }}
                            data-testid="button-generate-design"
                          >
                            <Wand2 className="w-5 h-5 mr-2" />
                            Generate My Garden Design
                          </Button>
                          <p className="text-xs text-gray-500">
                            This will create a complete garden layout with plant selections based on your chosen style and preferences.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  </>
                )}

                {/* Show Safety Preferences if Manual approach is chosen */}
                {(localDesignApproach === "manual" || watchedDesignApproach === "manual") && (
                  <>
                    <SafetyPreferences form={form} showAvailabilityPreference={true} />
                    
                    <Card className="border-2 border-primary shadow-sm" data-testid="step-plant-preferences">
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Additional Plant Preferences</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <h3 className="font-semibold mb-4">Other Considerations</h3>
                          <div className="grid grid-cols-2 gap-4">

                          <FormField
                            control={form.control}
                            name="preferences.noThorns"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-no-thorns"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  No thorny plants
                                </FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="preferences.lowAllergen"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-low-allergen"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Low-allergen plants
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-4">Growing Preferences</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="preferences.nativeOnly"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-native-only"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Native plants only
                                </FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="preferences.droughtTolerant"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-drought-tolerant"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Drought tolerant plants
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Generate Design Button for Manual approach */}
                  <Card className="border-2 border-green-500 bg-green-50 shadow-sm">
                    <CardContent className="py-6">
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Palette className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-semibold text-green-800">
                            Ready to Design Your Garden!
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                          You've chosen manual design mode.
                          Click below to proceed to the interactive garden canvas where you can place plants and design your garden.
                        </p>
                        <Button
                          type="button"
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                          onClick={() => {
                            // Advance to Step 4 for manual design
                            setCurrentStep(4);
                          }}
                          data-testid="button-proceed-to-canvas"
                        >
                          <Palette className="w-5 h-5 mr-2" />
                          Proceed to Garden Canvas
                        </Button>
                        <p className="text-xs text-gray-500">
                          You'll have full control to manually place plants and design your garden layout.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Interactive Design Canvas */}
            {currentStep === 4 && (
              <div className="space-y-3">
                {/* Generate Design Button for AI approach */}
                {watchedDesignApproach === "ai" && selectedGardenStyle && (
                  <Card className="border-2 border-green-500 bg-green-50 shadow-sm" data-testid="generate-ai-design-card">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-green-600" />
                        Ready to Generate AI Design
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <p className="text-sm text-gray-600">
                        Your safety preferences have been set in Step 3. Click below to generate your AI garden design.
                      </p>
                      <Button 
                        type="button"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                        onClick={async () => {
                          setIsGeneratingDesign(true);
                          try {
                            const selectedStyle = GARDEN_STYLES[selectedGardenStyle as keyof typeof GARDEN_STYLES];
                            
                            const response = await apiRequest('POST', '/api/generate-complete-design', {
                              selectedStyle: selectedStyle,
                              gardenData: form.getValues(),
                              safetyPreferences: {
                                toxicityLevel: watchedToxicityLevel,
                                plantAvailability: watchedPlantAvailability
                              }
                            });
                            
                            const design = await response.json();
                            setCompleteDesign(design);
                            
                            toast({
                              title: 'Garden Design Generated!',
                              description: `Your ${design.styleName} garden is ready with ${design.plantPlacements.length} plants.`
                            });
                          } catch (error) {
                            console.error('Failed to generate design:', error);
                            toast({
                              title: 'Generation Failed',
                              description: 'Could not generate garden design. Please try again.',
                              variant: 'destructive'
                            });
                          } finally {
                            setIsGeneratingDesign(false);
                          }
                        }}
                        disabled={isGeneratingDesign}
                        data-testid="button-generate-design"
                      >
                        {isGeneratingDesign ? (
                          <>
                            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                            Generating Design...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Complete Garden Design
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Main Design Canvas */}
                <Card className="border-2 border-primary shadow-sm" data-testid="step-interactive-canvas">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">
                      Garden Layout Canvas
                      {completeDesign && (
                        <Badge className="ml-2" variant="secondary">
                          AI Design Loaded
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GardenLayoutCanvas
                      shape={watchedShape}
                      dimensions={watchedDimensions}
                      units={watchedUnits === 'feet' ? 'imperial' : 'metric'}
                      gardenName={watchedName}
                      aiDesign={completeDesign}
                      inventoryPlants={inventoryPlants}
                      onOpenPlantSearch={() => setShowPlantSearch(true)}
                      onPlacedPlantsChange={setPlacedPlants}
                    />
                  </CardContent>
                </Card>

                {/* Show Design Details if AI design is generated */}
                {completeDesign && (
                  <Card className="border-2 border-purple-300 bg-purple-50/30 shadow-sm" data-testid="design-details">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TreePine className="w-4 h-4 text-purple-600" />
                        Your {completeDesign.styleName} Garden Design
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded-lg border">
                          <h4 className="font-semibold text-sm mb-2">Plant Count</h4>
                          <p className="text-2xl font-bold text-green-600">
                            {completeDesign.plantPlacements.length} plants
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <h4 className="font-semibold text-sm mb-2">Design Zones</h4>
                          <p className="text-xs">
                            {completeDesign.designZones.map((zone: any) => zone.name).join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border">
                        <h4 className="font-semibold text-sm mb-2">Color Palette</h4>
                        <div className="flex gap-2 flex-wrap">
                          {completeDesign.colorPalette.map((color: string, i: number) => (
                            <Badge key={i} variant="outline">{color}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border">
                        <h4 className="font-semibold text-sm mb-2">Maintenance Notes</h4>
                        <p className="text-xs">{completeDesign.maintenanceNotes}</p>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border border-purple-300">
                        <h4 className="font-semibold text-sm mb-2">Next Steps</h4>
                        <p className="text-xs">
                          Your design is now on the canvas above. You can proceed to Step 5 to generate 
                          the final blueprint and download your complete garden plan.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 5: Finale - Blueprint & Download */}
            {currentStep === 5 && (
              <Card className="border-2 border-primary shadow-sm" data-testid="step-finale-blueprint">
                <CardHeader className="py-7 flower-band-review rounded-t-lg">
                  <CardTitle className="text-base">Review & Generate Blueprint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Your Garden Summary</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {watchedName || "Not set"}</p>
                      <p><strong>Location:</strong> {watchedCity || "Not set"}</p>
                      <p><strong>Shape:</strong> {watchedShape || "Rectangle"}</p>
                      <p><strong>Sun Exposure:</strong> {watchedSunExposure?.replace("_", " ") || "Not set"}</p>
                      <p><strong>Design Approach:</strong> {watchedDesignApproach?.toUpperCase() || "Not set"}</p>
                      {watchedSelectedStyle && (
                        <p><strong>Selected Style:</strong> {watchedSelectedStyle}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">What Happens Next?</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>AI will generate your personalized garden design</li>
                      <li>Get a complete plant list with care instructions</li>
                      <li>Download your garden blueprint as PDF</li>
                      <li>Access planting calendar and maintenance schedule</li>
                      <li>Share your design with friends or professionals</li>
                    </ol>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      By clicking "Generate Garden Design", our AI will create a complete garden plan based on all your inputs, 
                      including climate data, soil conditions, and plant preferences.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                data-testid="button-previous"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Previous
              </Button>

              <Button
                type={currentStep === 5 ? "submit" : "button"}
                onClick={currentStep < 5 ? nextStep : undefined}
                disabled={createGardenMutation.isPending}
                variant={currentStep === 5 ? "default" : "default"}
                data-testid="button-next-or-create"
              >
                {createGardenMutation.isPending ? (
                  "Creating..."
                ) : currentStep === 5 ? (
                  "Generate Garden Design"
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Climate Report Modal */}
        <ClimateReportModal
          open={showClimateModal}
          onClose={() => setShowClimateModal(false)}
          location={locationToFetch || ''}
          climateData={climateData}
        />
        
        {/* Soil Testing Services Modal */}
        <SoilTestingModal
          open={showSoilTestingModal}
          onClose={() => setShowSoilTestingModal(false)}
          location={watchedCountry || locationToFetch || ''}
        />
        
        {/* Plant Search Modal */}
        <PlantSearchModal
          isOpen={showPlantSearch}
          onClose={() => setShowPlantSearch(false)}
          onSelectPlant={handleAddPlantToInventory}
          userTier={user?.userTier || 'free'}
        />
      </div>
    </div>
  );
}