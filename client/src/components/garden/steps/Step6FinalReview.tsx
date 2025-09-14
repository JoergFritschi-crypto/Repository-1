import { memo } from 'react';
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
        title: "Garden Not Saved",
        description: "Please save your garden before downloading",
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
          title: "Download Complete",
          description: "Your garden design PDF has been downloaded",
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle sharing
  const handleShare = async () => {
    if (!gardenId) {
      toast({
        title: "Garden Not Saved",
        description: "Please save your garden before sharing",
        variant: "destructive"
      });
      return;
    }

    const shareUrl = `${window.location.origin}/garden/${gardenId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: gardenData.name || 'My Garden Design',
          text: `Check out my ${gardenData.selectedStyle || 'garden'} design!`,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Garden link has been copied to clipboard",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-lg">Garden Design Complete!</AlertTitle>
        <AlertDescription>
          Your {gardenData.selectedStyle || 'garden'} design is ready. Review your design below and download or share it.
        </AlertDescription>
      </Alert>

      {/* Garden Summary Card */}
      <Card className="border-2 border-primary shadow-sm" data-testid="garden-summary">
        <CardHeader className="py-7 flower-band-final rounded-t-lg">
          <CardTitle className="text-base flex items-center gap-2">
            <TreePine className="w-5 h-5" />
            {gardenData.name || 'Your Garden'}
          </CardTitle>
          <CardDescription>
            Complete garden design summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location & Climate */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location & Climate
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {gardenData.city && (
                <div>
                  <span className="text-gray-500">City:</span> {gardenData.city}
                </div>
              )}
              {gardenData.country && (
                <div>
                  <span className="text-gray-500">Country:</span> {gardenData.country}
                </div>
              )}
              {gardenData.usdaZone && (
                <div>
                  <span className="text-gray-500">USDA Zone:</span> {gardenData.usdaZone}
                </div>
              )}
              {gardenData.rhsZone && (
                <div>
                  <span className="text-gray-500">RHS Zone:</span> {gardenData.rhsZone}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Garden Specifications */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Garden Specifications
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Shape:</span> {gardenData.shape}
              </div>
              <div>
                <span className="text-gray-500">Area:</span> {gardenStats.area.toFixed(1)} {gardenStats.units}²
              </div>
              <div>
                <span className="text-gray-500">Style:</span> {gardenData.selectedStyle || 'cottage'}
              </div>
              <div>
                <span className="text-gray-500">Design Method:</span> {gardenData.design_approach === 'ai' ? 'AI-Generated' : 'Manual'}
              </div>
            </div>
          </div>

          <Separator />

          {/* Plant Statistics */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Plant Summary</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {gardenStats.totalPlants} Total Plants
              </Badge>
              <Badge variant="secondary">
                {gardenStats.uniqueSpecies} Unique Species
              </Badge>
              {gardenData.preferences?.toxicityLevel && (
                <Badge variant="outline">
                  {gardenData.preferences.toxicityLevel === 'low' ? 'Low Toxicity' : 
                   gardenData.preferences.toxicityLevel === 'moderate' ? 'Moderate Toxicity' :
                   gardenData.preferences.toxicityLevel === 'all' ? 'All Toxicity Levels' : 'No Restriction'}
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
            <CardTitle className="text-base">Design Visualizations</CardTitle>
            <CardDescription>
              Your garden through the seasons
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
              Download PDF
            </Button>
            
            <Button
              onClick={handleShare}
              size="lg"
              variant="outline"
              className="w-full"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Design
            </Button>
            
            <Button
              onClick={() => window.location.href = '/home'}
              size="lg"
              variant="secondary"
              className="w-full"
              data-testid="button-go-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Additional Options */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 text-center mb-3">
              Want to make changes or create another design?
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="link"
                onClick={() => window.location.href = `/garden/${gardenId}/edit`}
                className="text-sm"
              >
                Edit This Design
              </Button>
              <Button
                variant="link"
                onClick={() => window.location.href = '/garden-design'}
                className="text-sm"
              >
                Create New Garden
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Tier Notice */}
      {user?.userTier === 'free' && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Upgrade for More Features</AlertTitle>
          <AlertDescription>
            Premium users get unlimited designs, advanced AI features, and priority support.
            <Button variant="link" className="pl-1" onClick={() => window.location.href = '/pricing'}>
              View Plans →
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
});

Step6FinalReview.displayName = 'Step6FinalReview';

export default Step6FinalReview;