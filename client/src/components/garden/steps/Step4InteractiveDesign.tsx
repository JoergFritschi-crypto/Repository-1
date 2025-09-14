import { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Search, 
  ChevronDown, 
  Database, 
  Filter,
  Wand2,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import GardenLayoutCanvas from '@/components/garden/garden-layout-canvas';
import PlantSearchModal from '@/components/plant/plant-search-modal';
import RecentlyViewedPlants from '@/components/plant/recently-viewed-plants';
import type { Step4Props } from './types';

const Step4InteractiveDesign = memo(({
  form,
  inventoryPlants,
  setInventoryPlants,
  placedPlants,
  setPlacedPlants,
  showPlantSearch,
  setShowPlantSearch,
  gardenId,
  localDesignApproach,
  selectedGardenStyle,
  user,
  isGeneratingDesign,
  setIsGeneratingDesign,
  completeDesign,
  setCompleteDesign,
  generatedVisualization,
  setGeneratedVisualization,
}: Step4Props) => {
  const { t } = useTranslation();
  const [plantFilters, setPlantFilters] = useState<any>({});
  const [showPlantResults, setShowPlantResults] = useState(false);
  const [searchSource, setSearchSource] = useState<'database' | 'collection'>('database');
  const [isSearchExpanded, setIsSearchExpanded] = useState(localDesignApproach === 'manual');
  const [generationProgress, setGenerationProgress] = useState(0);

  const watchedShape = form.watch("shape");
  const watchedDimensions = form.watch("dimensions") || {};
  const watchedUnits = form.watch("units");
  const watchedToxicityLevel = form.watch("preferences.toxicityLevel");
  const watchedPlantAvailability = form.watch("preferences.plantAvailability");

  // Update search card expansion based on design approach
  useEffect(() => {
    setIsSearchExpanded(localDesignApproach === 'manual');
  }, [localDesignApproach]);

  // Handle AI Design Generation
  const handleGenerateAIDesign = async () => {
    if (!gardenId) {
      toast({
        title: t('garden.workflow.step4.aiGeneration.errors.notSaved'),
        description: t('garden.workflow.step4.aiGeneration.errors.saveFirst'),
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingDesign(true);
    setGenerationProgress(0);

    try {
      const values = form.getValues();
      
      // Prepare design request
      const designRequest = {
        gardenId,
        shape: values.shape,
        dimensions: values.dimensions,
        units: values.units,
        style: selectedGardenStyle || values.selectedStyle || 'cottage',
        sunExposure: values.sunExposure,
        soilType: values.soilType,
        soilPh: values.soilPh,
        usdaZone: values.usdaZone,
        rhsZone: values.rhsZone,
        preferences: {
          toxicityLevel: values.preferences?.toxicityLevel || 'none',
          plantAvailability: values.preferences?.plantAvailability || 'common',
          spacingPreference: values.spacingPreference || 'balanced',
          ...values.preferences
        }
      };

      setGenerationProgress(25);

      // Call AI generation endpoint
      const response = await apiRequest('POST', '/api/gardens/generate-ai-design', designRequest);
      const design = await response.json();

      setGenerationProgress(50);

      if (design.error) {
        throw new Error(design.error);
      }

      // Set the complete design
      setCompleteDesign(design);
      
      // Convert AI plant placements to placed plants
      if (design.plantPlacements && Array.isArray(design.plantPlacements)) {
        setPlacedPlants(design.plantPlacements);
        setGenerationProgress(75);
      }

      // Generate visualization if available
      if (design.visualization) {
        setGeneratedVisualization(design.visualization);
      }

      setGenerationProgress(100);

      toast({
        title: t('garden.workflow.step4.aiGeneration.success.title'),
        description: t('garden.workflow.step4.aiGeneration.success.description', { style: selectedGardenStyle, count: design.plantPlacements?.length || 0 }),
      });

    } catch (error: any) {
      console.error('Error generating AI design:', error);
      toast({
        title: t('garden.workflow.step4.aiGeneration.errors.failed'),
        description: error.message || t('garden.workflow.step4.aiGeneration.errors.generalError'),
        variant: "destructive"
      });
    } finally {
      setIsGeneratingDesign(false);
      setGenerationProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Plant Search Modal */}
      {showPlantSearch && (
        <PlantSearchModal
          isOpen={showPlantSearch}
          onClose={() => setShowPlantSearch(false)}
          onSelectPlant={(plant: any) => {
            setInventoryPlants([...inventoryPlants, plant]);
            setShowPlantSearch(false);
            toast({
              title: t('garden.workflow.step4.plantSearch.plantAdded.title'),
              description: t('garden.workflow.step4.plantSearch.plantAdded.description', { plantName: plant.common_name }),
            });
          }}
          filters={plantFilters}
          searchSource={searchSource}
          toxicityLevel={watchedToxicityLevel}
          plantAvailability={watchedPlantAvailability}
        />
      )}

      {/* Recently Viewed Plants */}
      <RecentlyViewedPlants 
        showTimestamp={false}
        maxItems={8}
        compact={true}
        onPlantClick={(plant) => {
          // Add plant to inventory
          const plantWithQuantity = { ...plant, quantity: 1 };
          setInventoryPlants([...inventoryPlants, plantWithQuantity]);
          toast({
            title: t('garden.workflow.step4.plantSearch.plantAdded.title'),
            description: t('garden.workflow.step4.plantSearch.plantAdded.description', { plantName: plant.commonName }),
          });
        }}
      />

      {/* Collapsible Plant Search Card */}
      <Card className="border-2 border-primary/30 shadow-sm hover:border-[#FFD700]/50 hover:shadow-lg hover:shadow-[rgba(255,215,0,0.1)] transition-all duration-300" data-testid="plant-search-card">
        <CardHeader 
          className="py-3 cursor-pointer hover:bg-[#FFD700]/5 transition-all duration-300 border-b-2 border-transparent hover:border-[#FFD700]/20"
          onClick={() => setIsSearchExpanded(!isSearchExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t('garden.workflow.step4.plantSearch.title')}</CardTitle>
              {inventoryPlants.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-[#FFD700]/10 text-primary border-[#FFD700] hover:bg-[#FFD700] hover:text-white transition-all duration-300">
                  {t('garden.workflow.step4.plantSearch.inventory.count', { count: inventoryPlants.length })}
                </Badge>
              )}
              {Object.keys(plantFilters).filter(k => {
                const v = plantFilters[k];
                return v !== undefined && v !== '' && v !== 'all' && v !== null && 
                       !(Array.isArray(v) && v.length === 0);
              }).length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {Object.keys(plantFilters).filter(k => {
                    const v = plantFilters[k];
                    return v !== undefined && v !== '' && v !== 'all' && v !== null && 
                           !(Array.isArray(v) && v.length === 0);
                  }).length} filters active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isSearchExpanded && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlantSearch(true);
                  }}
                  data-testid="button-open-search-collapsed"
                >
                  <Search className="w-3 h-3 mr-2" />
                  {t('garden.workflow.step4.plantSearch.openAdvanced')}
                </Button>
              )}
              <ChevronDown 
                className={`w-4 h-4 text-gray-500 hover:text-[#FFD700] transition-all duration-300 ${
                  isSearchExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </CardHeader>
        
        {isSearchExpanded && (
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Quick Filter Options */}
            <div className="flex flex-wrap gap-3">
              {user?.userTier === 'premium' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={searchSource === 'collection'}
                    onCheckedChange={(checked) => {
                      setSearchSource(checked ? 'collection' : 'database');
                    }}
                  />
                  <span className="text-sm">{t('garden.workflow.step4.plantSearch.myCollectionOnly')}</span>
                </label>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPlantFilters({});
                  toast({
                    title: "Filters Cleared",
                    description: "All plant filters have been reset",
                  });
                }}
                disabled={Object.keys(plantFilters).length === 0}
              >
                <Filter className="w-3 h-3 mr-2" />
                Clear Filters
              </Button>
            </div>
            
            {/* Main Search Button */}
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => setShowPlantSearch(true)}
                data-testid="button-open-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Open Advanced Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPlantResults(!showPlantResults)}
              >
                <Database className="w-4 h-4 mr-2" />
                {showPlantResults ? 'Hide' : 'Show'} Results
              </Button>
            </div>
            
            {/* AI Design Generation Option */}
            {localDesignApproach === 'ai' && (
              <div className="pt-2 border-t">
                <Button
                  onClick={handleGenerateAIDesign}
                  disabled={isGeneratingDesign || !gardenId}
                  className="w-full"
                  variant="default"
                  data-testid="button-generate-ai-design"
                >
                  {isGeneratingDesign ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating AI Design...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate AI Garden Design
                    </>
                  )}
                </Button>
                {isGeneratingDesign && (
                  <Progress value={generationProgress} className="mt-2" />
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* AI Design Success Message */}
      {completeDesign && placedPlants.length > 0 && (
        <Alert className="border-green-500 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle>AI Design Complete</AlertTitle>
          <AlertDescription>
            Your {selectedGardenStyle} garden has been designed with {placedPlants.length} carefully selected plants. 
            You can now review and adjust the placement in the canvas below.
          </AlertDescription>
        </Alert>
      )}

      {/* Garden Layout Canvas */}
      <Card className="border-2 border-primary shadow-sm" data-testid="garden-canvas">
        <CardHeader className="py-7 flower-band-mixed rounded-t-lg">
          <CardTitle className="text-base">Garden Design Canvas</CardTitle>
        </CardHeader>
        <CardContent>
          <GardenLayoutCanvas
            shape={watchedShape}
            dimensions={watchedDimensions}
            units={watchedUnits === 'feet' ? 'imperial' : 'metric'}
            inventoryPlants={inventoryPlants}
            onInventoryUpdate={setInventoryPlants}
            placedPlants={placedPlants}
            onPlacedPlantsUpdate={setPlacedPlants}
            onSearchClick={() => setShowPlantSearch(true)}
            gardenId={gardenId}
          />
        </CardContent>
      </Card>

      {/* Plant Count Warning */}
      {placedPlants.length === 0 && (
        <Alert className="border-orange-400 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle>No Plants Placed</AlertTitle>
          <AlertDescription>
            {localDesignApproach === 'ai' 
              ? "Click 'Generate AI Garden Design' above to automatically design your garden"
              : "Use the plant search to find and add plants to your garden canvas"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
});

Step4InteractiveDesign.displayName = 'Step4InteractiveDesign';

export default Step4InteractiveDesign;