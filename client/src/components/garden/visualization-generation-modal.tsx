import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, AlertCircle, Eye, TreePine, Flower2, ArrowRight, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { PlacedPlant } from './garden-layout-canvas';

interface VisualizationGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  gardenData: {
    gardenId?: string;
    gardenName: string;
    shape: string;
    dimensions: Record<string, number>;
    units: string;
    style?: string;
    sunExposure?: string;
    soilType?: string;
    season?: string;
  };
  placedPlants: PlacedPlant[];
}

export default function VisualizationGenerationModal({
  isOpen,
  onClose,
  onComplete,
  gardenData,
  placedPlants
}: VisualizationGenerationModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Progress simulation
  useEffect(() => {
    if (isGenerating && progress < 90) {
      const timer = setTimeout(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15 + 5, 90));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, progress]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setGeneratedImage(null);
      setError(null);
      setProgress(0);
      setStatusMessage('');
      
      // Auto-start generation when modal opens
      handleGenerateVisualization();
    }
  }, [isOpen]);

  const handleGenerateVisualization = async () => {
    if (placedPlants.length === 0) {
      setError('Please place at least one plant on the canvas before generating visualization.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(10);
    setStatusMessage('Preparing garden data...');

    try {
      // Prepare plant list with names and positions
      const plantList = placedPlants.map(plant => ({
        name: plant.plantName,
        scientificName: plant.scientificName,
        x: plant.x,
        y: plant.y,
        quantity: plant.quantity
      }));

      setProgress(25);
      setStatusMessage('Analyzing garden layout...');

      // Generate visualization prompt based on garden data
      const gardenDescription = `${gardenData.style || 'cottage'} garden, ${gardenData.shape} shape, ${
        Math.round(gardenData.dimensions.width || gardenData.dimensions.radius * 2 || 10)
      } by ${
        Math.round(gardenData.dimensions.height || gardenData.dimensions.radius * 2 || 10)
      } ${gardenData.units}`;

      const plantNames = Array.from(new Set(placedPlants.map(p => p.plantName))).join(', ');

      setProgress(40);
      setStatusMessage('Generating 3D visualization with AI...');

      // Call API to generate visualization
      const response = await apiRequest('POST', '/api/gardens/generate-visualization', {
        gardenDescription,
        plantList,
        plantNames,
        style: gardenData.style || 'cottage',
        season: gardenData.season || 'summer',
        sunExposure: gardenData.sunExposure,
        gardenId: gardenData.gardenId
      });

      // Parse the JSON response
      const data = await response.json();

      setProgress(70);
      setStatusMessage('Rendering photorealistic garden...');

      // Simulate additional processing time for realistic effect
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgress(90);
      setStatusMessage('Finalizing visualization...');

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setProgress(100);
        setStatusMessage('Visualization complete!');
        
        toast({
          title: "3D Visualization Generated",
          description: "Your garden visualization is ready!",
        });
      } else {
        throw new Error('No image URL returned from API');
      }
    } catch (error: any) {
      console.error('Error generating visualization:', error);
      setError(error.message || 'Failed to generate visualization. Please try again.');
      setStatusMessage('');
      
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate visualization",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = () => {
    if (generatedImage) {
      onComplete();
    }
  };

  const handleRetry = () => {
    setGeneratedImage(null);
    setError(null);
    handleGenerateVisualization();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            3D Garden Visualization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Section */}
          {!generatedImage && !error && (
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {isGenerating ? 'Generating Visualization' : 'Ready to Generate'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {statusMessage || `${placedPlants.length} plants to visualize`}
                      </p>
                    </div>
                  </div>
                  {isGenerating && (
                    <Badge variant="secondary" className="animate-pulse">
                      Processing
                    </Badge>
                  )}
                </div>

                {isGenerating && (
                  <>
                    <Progress value={progress} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TreePine className="h-3 w-3" />
                        Analyzing layout
                      </div>
                      <div className="flex items-center gap-1">
                        <Flower2 className="h-3 w-3" />
                        Placing plants
                      </div>
                      <div className="flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        Rendering scene
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Generated Image Display */}
          {generatedImage && (
            <div className="space-y-4">
              <Card className="p-2 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="relative">
                  <img
                    src={generatedImage}
                    alt="Garden Visualization"
                    className="w-full h-auto rounded-lg shadow-lg"
                    onError={() => {
                      setError('Failed to load generated image');
                      setGeneratedImage(null);
                    }}
                  />
                  <Badge className="absolute top-2 right-2 bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Generated
                  </Badge>
                </div>
              </Card>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Visualization Complete!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your 3D garden visualization has been generated successfully. 
                      This photorealistic view shows how your garden will look with the selected plants and layout.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="p-4 bg-muted/50">
                <h4 className="font-semibold text-sm mb-2">Garden Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Style:</span>{' '}
                    <span className="font-medium">{gardenData.style || 'Cottage Garden'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plants:</span>{' '}
                    <span className="font-medium">{placedPlants.length} varieties</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shape:</span>{' '}
                    <span className="font-medium capitalize">{gardenData.shape}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Season:</span>{' '}
                    <span className="font-medium">{gardenData.season || 'Summer'}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {!generatedImage && !isGenerating && error && (
              <Button
                onClick={handleRetry}
                variant="outline"
                data-testid="button-retry-visualization"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Retry Generation
              </Button>
            )}
            
            {!generatedImage && !error && !isGenerating && (
              <Button
                onClick={handleGenerateVisualization}
                data-testid="button-generate-visualization"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Visualization
              </Button>
            )}

            {generatedImage && (
              <>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  data-testid="button-regenerate"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleContinue}
                  className="bg-gradient-to-r from-primary to-accent"
                  data-testid="button-continue-to-step-5"
                >
                  Continue to Step 5
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}