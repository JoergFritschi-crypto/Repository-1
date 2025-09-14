import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  Share2, 
  CheckCircle, 
  Home,
  Sparkles,
  TreePine,
  Calendar,
  MapPin
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import FinalReviewGallery from '@/components/garden/final-review-gallery';
import type { Step6Props } from './types';

const Step6FinalReview = memo(({
  form,
  gardenId,
  placedPlants,
  seasonalImages,
  generatedVisualization,
  completeDesign,
  user,
}: Step6Props) => {
  const { t } = useTranslation();
  const gardenData = form.getValues();

  // Calculate garden statistics
  const gardenStats = {
    totalPlants: placedPlants.length,
    uniqueSpecies: new Set(placedPlants.map(p => p.scientificName || p.plantName)).size,
    area: (() => {
      const dims = gardenData.dimensions || {};
      switch (gardenData.shape) {
        case 'rectangle':
        case 'l_shaped':
        case 'r_shaped':
          return (dims.width || 0) * (dims.length || 0);
        case 'square':
          return (dims.width || 0) * (dims.width || 0);
        case 'circle':
          return Math.PI * (dims.radius || 0) * (dims.radius || 0);
        case 'oval':
          return Math.PI * (dims.width || 0) * (dims.length || 0) / 4;
        case 'triangle':
          return ((dims.base || 0) * (dims.height || 0)) / 2;
        default:
          return 0;
      }
    })(),
    units: gardenData.units || 'meters',
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!gardenId) {
      toast({
        title: t('garden.workflow.step6.download.errors.notSaved'),
        description: t('garden.workflow.step6.download.errors.saveFirst'),
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest('POST', `/api/gardens/${gardenId}/download-pdf`, {
        includeSeasonalViews: !!seasonalImages,
        includeVisualization: !!generatedVisualization,
        includePlantList: true,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${gardenData.name || 'garden'}-design.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: t('garden.workflow.step6.download.success.title'),
          description: t('garden.workflow.step6.download.success.description'),
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: t('garden.workflow.step6.download.errors.failed'),
        description: t('garden.workflow.step6.download.errors.tryAgain'),
        variant: "destructive"
      });
    }
  };

  // Handle sharing
  const handleShare = async () => {
    if (!gardenId) {
      toast({
        title: t('garden.workflow.step6.share.errors.notSaved'),
        description: t('garden.workflow.step6.share.errors.saveFirst'),
        variant: "destructive"
      });
      return;
    }

    const shareUrl = `${window.location.origin}/garden/${gardenId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: gardenData.name || t('garden.workflow.step6.share.defaultTitle'),
          text: t('garden.workflow.step6.share.defaultText', { style: gardenData.selectedStyle || t('garden.workflow.step6.share.defaultStyle') }),
          url: shareUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: t('garden.workflow.step6.share.copied.title'),
        description: t('garden.workflow.step6.share.copied.description'),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-lg">{t('garden.workflow.step6.complete.title')}</AlertTitle>
        <AlertDescription>
          {t('garden.workflow.step6.complete.description', { style: gardenData.selectedStyle || t('garden.workflow.step6.complete.defaultStyle') })}
        </AlertDescription>
      </Alert>

      {/* Garden Summary Card */}
      <Card className="border-2 border-primary shadow-sm" data-testid="garden-summary">
        <CardHeader className="py-7 flower-band-final rounded-t-lg">
          <CardTitle className="text-base flex items-center gap-2">
            <TreePine className="w-5 h-5" />
            {gardenData.name || t('garden.workflow.step6.summary.defaultName')}
          </CardTitle>
          <CardDescription>
            {t('garden.workflow.step6.summary.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location & Climate */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('garden.workflow.step6.summary.location.title')}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {gardenData.city && (
                <div>
                  <span className="text-gray-500">{t('garden.workflow.step6.summary.location.city')}:</span> {gardenData.city}
                </div>
              )}
              {gardenData.country && (
                <div>
                  <span className="text-gray-500">{t('garden.workflow.step6.summary.location.country')}:</span> {gardenData.country}
                </div>
              )}
              {gardenData.usdaZone && (
                <div>
                  <span className="text-gray-500">{t('garden.workflow.step6.summary.location.usdaZone')}:</span> {gardenData.usdaZone}
                </div>
              )}
              {gardenData.rhsZone && (
                <div>
                  <span className="text-gray-500">{t('garden.workflow.step6.summary.location.rhsZone')}:</span> {gardenData.rhsZone}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Garden Specifications */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('garden.workflow.step6.summary.specifications.title')}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">{t('garden.workflow.step6.summary.specifications.shape')}:</span> {gardenData.shape}
              </div>
              <div>
                <span className="text-gray-500">{t('garden.workflow.step6.summary.specifications.area')}:</span> {gardenStats.area.toFixed(1)} {gardenStats.units}²
              </div>
              <div>
                <span className="text-gray-500">{t('garden.workflow.step6.summary.specifications.style')}:</span> {gardenData.selectedStyle || t('garden.workflow.step6.summary.specifications.defaultStyle')}
              </div>
              <div>
                <span className="text-gray-500">{t('garden.workflow.step6.summary.specifications.designMethod')}:</span> {gardenData.design_approach === 'ai' ? t('garden.workflow.step6.summary.specifications.aiGenerated') : t('garden.workflow.step6.summary.specifications.manual')}
              </div>
            </div>
          </div>

          <Separator />

          {/* Plant Statistics */}
          <div>
            <h3 className="font-semibold text-sm mb-2">{t('garden.workflow.step6.summary.plants.title')}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {gardenStats.totalPlants} {t('garden.workflow.step6.summary.plants.totalPlants')}
              </Badge>
              <Badge variant="secondary">
                {gardenStats.uniqueSpecies} {t('garden.workflow.step6.summary.plants.uniqueSpecies')}
              </Badge>
              {gardenData.preferences?.toxicityLevel && (
                <Badge variant="outline">
                  {gardenData.preferences.toxicityLevel === 'low' ? t('garden.workflow.step6.summary.plants.toxicity.low') : 
                   gardenData.preferences.toxicityLevel === 'moderate' ? t('garden.workflow.step6.summary.plants.toxicity.moderate') :
                   gardenData.preferences.toxicityLevel === 'all' ? t('garden.workflow.step6.summary.plants.toxicity.all') : t('garden.workflow.step6.summary.plants.toxicity.none')}
              </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Gallery */}
      {(seasonalImages || generatedVisualization) && (
        <Card className="border-2 border-primary shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('garden.workflow.step6.visualizations.title')}</CardTitle>
            <CardDescription>
              {t('garden.workflow.step6.visualizations.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinalReviewGallery
              seasonalImages={seasonalImages}
              visualization={generatedVisualization}
              gardenName={gardenData.name}
            />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="border-2 border-primary shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={handleDownloadPDF}
              size="lg"
              className="w-full"
              data-testid="button-download-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('garden.workflow.step6.actions.downloadPdf')}
            </Button>
            
            <Button
              onClick={handleShare}
              size="lg"
              variant="outline"
              className="w-full"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t('garden.workflow.step6.actions.shareDesign')}
            </Button>
            
            <Button
              onClick={() => window.location.href = '/home'}
              size="lg"
              variant="secondary"
              className="w-full"
              data-testid="button-go-home"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('garden.workflow.step6.actions.goToDashboard')}
            </Button>
          </div>

          {/* Additional Options */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 text-center mb-3">
              {t('garden.workflow.step6.additionalOptions.question')}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="link"
                onClick={() => window.location.href = `/garden/${gardenId}/edit`}
                className="text-sm"
              >
                {t('garden.workflow.step6.additionalOptions.editDesign')}
              </Button>
              <Button
                variant="link"
                onClick={() => window.location.href = '/garden-design'}
                className="text-sm"
              >
                {t('garden.workflow.step6.additionalOptions.createNew')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Tier Notice */}
      {user?.userTier === 'free' && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>{t('garden.workflow.step6.upgrade.title')}</AlertTitle>
          <AlertDescription>
            {t('garden.workflow.step6.upgrade.description')}
            <Button variant="link" className="pl-1" onClick={() => window.location.href = '/pricing'}>
              {t('garden.workflow.step6.upgrade.viewPlans')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
});

Step6FinalReview.displayName = 'Step6FinalReview';

export default Step6FinalReview;