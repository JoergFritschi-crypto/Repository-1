import { memo } from 'react';
import { useTranslation } from 'react-i18next';
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

  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Seasonal Generation Card */}
      <Card className="border-2 border-primary shadow-sm" data-testid="step-seasonal-generation">
        <CardHeader className="py-7 flower-band-seasonal rounded-t-lg">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('garden.workflow.step5.title')}
          </CardTitle>
          <CardDescription>
            {t('garden.workflow.step5.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Garden Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">{t('garden.workflow.step5.gardenSummary.title')}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {selectedGardenStyle || watchedSelectedStyle || t('garden.workflow.step5.gardenSummary.defaultStyle')} {t('garden.workflow.step5.gardenSummary.style')}
              </Badge>
              <Badge variant="secondary">
                {watchedShape} {t('garden.workflow.step5.gardenSummary.shape')}
              </Badge>
              <Badge variant="secondary">
                {placedPlants.length} {t('garden.workflow.step5.gardenSummary.plants')}
              </Badge>
            </div>
            {placedPlants.length > 0 && (
              <p className="text-sm text-gray-600">
                {t('garden.workflow.step5.gardenSummary.including')}: {Array.from(new Set(placedPlants.map(p => p.plantName))).slice(0, 5).join(', ')}
                {placedPlants.length > 5 && ` ${t('garden.workflow.step5.gardenSummary.andMore', { count: placedPlants.length - 5 })}`}
              </p>
            )}
          </div>

          {/* Generation Controls */}
          {!seasonalImages && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {t('garden.workflow.step5.aiDescription')}
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t('garden.workflow.step5.seasons.spring')}</li>
                  <li>{t('garden.workflow.step5.seasons.summer')}</li>
                  <li>{t('garden.workflow.step5.seasons.autumn')}</li>
                  <li>{t('garden.workflow.step5.seasons.winter')}</li>
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
                    {t('garden.workflow.step5.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('garden.workflow.step5.generateButton')}
                  </>
                )}
              </Button>

              {isGeneratingSeasonalImages && (
                <div className="space-y-2">
                  <Progress value={seasonalProgress} className="w-full" />
                  <p className="text-xs text-center text-gray-500">
                    {seasonalProgress < 25 && t('garden.workflow.step5.progress.preparing')}
                    {seasonalProgress >= 25 && seasonalProgress < 50 && t('garden.workflow.step5.progress.spring')}
                    {seasonalProgress >= 50 && seasonalProgress < 75 && t('garden.workflow.step5.progress.variations')}
                    {seasonalProgress >= 75 && seasonalProgress < 100 && t('garden.workflow.step5.progress.winter')}
                    {seasonalProgress === 100 && t('garden.workflow.step5.progress.complete')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {seasonalImages && (
            <Alert className="border-green-500 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle>{t('garden.workflow.step5.success.title')}</AlertTitle>
              <AlertDescription>
                {t('garden.workflow.step5.success.description')}
              </AlertDescription>
            </Alert>
          )}

          {/* Warning if no plants */}
          {placedPlants.length === 0 && (
            <Alert className="border-orange-400 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle>{t('garden.workflow.step5.warning.title')}</AlertTitle>
              <AlertDescription>
                {t('garden.workflow.step5.warning.description')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Seasonal Viewer */}
      {seasonalImages && (
        <Card className="border-2 border-primary shadow-sm">
          <CardHeader className="py-7 flower-band-seasons rounded-t-lg">
            <CardTitle className="text-base">{t('garden.workflow.step5.viewer.title')}</CardTitle>
            <CardDescription>
              {t('garden.workflow.step5.viewer.description')}
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
            <CardTitle className="text-base">{t('garden.workflow.step5.dateSelector.title')}</CardTitle>
            <CardDescription>
              {t('garden.workflow.step5.dateSelector.description')}
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
                {t('garden.workflow.step5.dateSelector.close')}
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