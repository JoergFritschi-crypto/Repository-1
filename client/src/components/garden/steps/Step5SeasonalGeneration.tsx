import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Loader2, Check, AlertCircle } from 'lucide-react';
import SeasonalViewer from '@/components/garden/seasonal-viewer';
import type { Step5Props } from './types';

const Step5SeasonalGeneration = memo(({
  form,
  placedPlants,
  selectedGardenStyle,
  generatedVisualization,
  seasonalImages,
  setSeasonalImages,
  isGeneratingSeasonalImages,
  setIsGeneratingSeasonalImages,
  seasonalProgress,
  setSeasonalProgress,
  showSeasonalDateSelector,
  setShowSeasonalDateSelector,
  showSeasonalViewer,
  setShowSeasonalViewer,
  handleGenerateSeasonalImages,
}: Step5Props) => {
  const watchedShape = form.watch("shape");
  const watchedSelectedStyle = form.watch("selectedStyle");

  return (
    <div className="space-y-4">
      {/* Seasonal Generation Card */}
      <Card className="border-2 border-primary shadow-sm" data-testid="step-seasonal-generation">
        <CardHeader className="py-7 flower-band-seasonal rounded-t-lg">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Seasonal Garden Visualization
          </CardTitle>
          <CardDescription>
            Generate photorealistic views of your garden throughout the year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Garden Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Your Garden Design</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {selectedGardenStyle || watchedSelectedStyle || 'cottage'} style
              </Badge>
              <Badge variant="secondary">
                {watchedShape} shape
              </Badge>
              <Badge variant="secondary">
                {placedPlants.length} plants
              </Badge>
            </div>
            {placedPlants.length > 0 && (
              <p className="text-sm text-gray-600">
                Including: {Array.from(new Set(placedPlants.map(p => p.plantName))).slice(0, 5).join(', ')}
                {placedPlants.length > 5 && ` and ${placedPlants.length - 5} more`}
              </p>
            )}
          </div>

          {/* Generation Controls */}
          {!seasonalImages && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Our AI will create four seasonal views of your garden showing how it will look in:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Spring - New growth and early blooms</li>
                  <li>Summer - Full bloom and lush foliage</li>
                  <li>Autumn - Fall colors and seed heads</li>
                  <li>Winter - Structure and evergreen interest</li>
                </ul>
              </div>

              <Button
                onClick={handleGenerateSeasonalImages}
                disabled={isGeneratingSeasonalImages || placedPlants.length === 0}
                className="w-full"
                size="lg"
                data-testid="button-generate-seasonal"
              >
                {isGeneratingSeasonalImages ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Seasonal Views...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Seasonal Views
                  </>
                )}
              </Button>

              {isGeneratingSeasonalImages && (
                <div className="space-y-2">
                  <Progress value={seasonalProgress} className="w-full" />
                  <p className="text-xs text-center text-gray-500">
                    {seasonalProgress < 25 && "Preparing garden data..."}
                    {seasonalProgress >= 25 && seasonalProgress < 50 && "Generating spring view..."}
                    {seasonalProgress >= 50 && seasonalProgress < 75 && "Creating seasonal variations..."}
                    {seasonalProgress >= 75 && seasonalProgress < 100 && "Finalizing winter view..."}
                    {seasonalProgress === 100 && "Complete!"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {seasonalImages && (
            <Alert className="border-green-500 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle>Seasonal Views Generated!</AlertTitle>
              <AlertDescription>
                Your garden has been visualized across all four seasons. 
                Click below to explore your year-round garden.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning if no plants */}
          {placedPlants.length === 0 && (
            <Alert className="border-orange-400 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle>No Plants in Garden</AlertTitle>
              <AlertDescription>
                Please go back to the previous step and add plants to your garden before generating seasonal views.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Seasonal Viewer */}
      {seasonalImages && (
        <Card className="border-2 border-primary shadow-sm">
          <CardHeader className="py-7 flower-band-seasons rounded-t-lg">
            <CardTitle className="text-base">Year-Round Garden Views</CardTitle>
            <CardDescription>
              Explore how your garden will look throughout the seasons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeasonalViewer
              seasonalImages={seasonalImages}
              gardenName={form.getValues('name')}
              style={selectedGardenStyle || watchedSelectedStyle || 'cottage'}
              plantCount={placedPlants.length}
            />
          </CardContent>
        </Card>
      )}

      {/* Interactive Date Selector (Optional) */}
      {showSeasonalDateSelector && (
        <Card className="border-2 border-primary/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Select Viewing Date</CardTitle>
            <CardDescription>
              Choose a specific date to see your garden at that time of year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => {
                  // Handle date selection
                  console.log('Selected date:', e.target.value);
                }}
              />
              <Button
                variant="outline"
                onClick={() => setShowSeasonalDateSelector(false)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

Step5SeasonalGeneration.displayName = 'Step5SeasonalGeneration';

export default Step5SeasonalGeneration;