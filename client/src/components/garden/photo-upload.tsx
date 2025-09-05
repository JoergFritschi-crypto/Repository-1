import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Camera, Sparkles, Loader2, TreePine, Palette } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  onPhotosChange?: (photos: File[]) => void;
  onAnalysisComplete?: (analysis: GardenPhotoAnalysis) => void;
  onStylesGenerated?: (styles: DesignStyleSuggestion[]) => void;
  maxPhotos?: number;
  gardenData?: any; // Full form data from Steps 2 and 3
}

interface GardenPhotoAnalysis {
  overallCondition: string;
  existingPlants: string[];
  soilObservations: string;
  sunlightPatterns: string;
  structures: string[];
  recommendations: string[];
  challenges: string[];
  opportunities: string[];
}

interface DesignStyleSuggestion {
  styleName: string;
  description: string;
  keyFeatures: string[];
  plantPalette: string[];
  colorScheme: string[];
  maintenanceLevel: string;
  suitabilityScore: number;
  reasoning: string;
}

export default function PhotoUpload({ 
  onPhotosChange,
  onAnalysisComplete,
  onStylesGenerated,
  maxPhotos = 6,
  gardenData
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<GardenPhotoAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [designStyles, setDesignStyles] = useState<DesignStyleSuggestion[]>([]);
  const [showStyles, setShowStyles] = useState(false);
  const { toast } = useToast();

  // Convert files to base64 for sending to Claude
  const convertToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Photo analysis mutation
  const analyzePhotosMutation = useMutation({
    mutationFn: async (): Promise<GardenPhotoAnalysis> => {
      if (photos.length === 0) {
        throw new Error('No photos to analyze');
      }

      // Convert photos to base64
      const base64Images = await Promise.all(photos.map(convertToBase64));

      // Prepare comprehensive garden info for Claude
      const gardenInfo = {
        // Step 2 Data
        shape: gardenData?.shape,
        dimensions: gardenData?.dimensions,
        units: gardenData?.units,
        slopeDirection: gardenData?.slopeDirection,
        slopePercentage: gardenData?.slopePercentage,
        usdaZone: gardenData?.usdaZone,
        rhsZone: gardenData?.rhsZone,
        location: gardenData?.location,
        // Step 3 Data - Plant Preferences
        style: gardenData?.style,
        colors: gardenData?.colors,
        bloomTime: gardenData?.bloomTime,
        maintenance: gardenData?.maintenance,
        features: gardenData?.features,
        avoidFeatures: gardenData?.avoidFeatures,
        specialRequests: gardenData?.specialRequests
      };

      const response = await apiRequest('POST', '/api/analyze-garden-photos', {
        images: base64Images,
        gardenInfo
      });

      return response.json();
    },
    onSuccess: async (data: GardenPhotoAnalysis) => {
      setAnalysis(data);
      setShowAnalysis(true);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
      toast({
        title: 'Analysis Complete',
        description: 'Claude has analyzed your garden photos successfully!'
      });

      // Automatically generate design styles after analysis
      if (photos.length > 0) {
        generateStylesMutation.mutate(data);
      }
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze photos. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Design styles generation mutation
  const generateStylesMutation = useMutation({
    mutationFn: async (photoAnalysis: GardenPhotoAnalysis): Promise<DesignStyleSuggestion[]> => {
      // Convert photos to base64
      const base64Images = await Promise.all(photos.map(convertToBase64));

      // Prepare comprehensive garden data
      const fullGardenData = {
        // Step 2 Data
        shape: gardenData?.shape,
        dimensions: gardenData?.dimensions,
        units: gardenData?.units,
        slopeDirection: gardenData?.slopeDirection,
        slopePercentage: gardenData?.slopePercentage,
        usdaZone: gardenData?.usdaZone,
        rhsZone: gardenData?.rhsZone,
        location: gardenData?.location,
        // Step 3 Data - Plant Preferences
        style: gardenData?.style,
        colors: gardenData?.colors,
        bloomTime: gardenData?.bloomTime,
        maintenance: gardenData?.maintenance,
        features: gardenData?.features,
        avoidFeatures: gardenData?.avoidFeatures,
        specialRequests: gardenData?.specialRequests
      };

      const response = await apiRequest('POST', '/api/generate-design-styles', {
        images: base64Images,
        gardenData: fullGardenData,
        photoAnalysis
      });

      return response.json();
    },
    onSuccess: (styles: DesignStyleSuggestion[]) => {
      setDesignStyles(styles);
      setShowStyles(true);
      if (onStylesGenerated) {
        onStylesGenerated(styles);
      }
      toast({
        title: 'Design Styles Generated!',
        description: `Claude has created ${styles.length} unique design options for your garden.`
      });
    },
    onError: (error) => {
      console.error('Style generation error:', error);
      toast({
        title: 'Style Generation Failed',
        description: 'Could not generate design styles. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newPhotos: File[] = [];
    const newPreviews: string[] = [];
    
    // Add existing photos first
    photos.forEach((photo, index) => {
      newPhotos.push(photo);
      newPreviews.push(previews[index]);
    });

    // Add new photos up to max limit
    for (let i = 0; i < files.length && newPhotos.length < maxPhotos; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          setPreviews(prev => [...prev, preview]);
        };
        reader.readAsDataURL(file);
      }
    }

    setPhotos(newPhotos);
    // Reset analysis when photos change
    setAnalysis(null);
    setShowAnalysis(false);
    setDesignStyles([]);
    setShowStyles(false);
    if (onPhotosChange) {
      onPhotosChange(newPhotos);
    }
  }, [photos, previews, maxPhotos, onPhotosChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
    // Reset analysis when photos change
    setAnalysis(null);
    setShowAnalysis(false);
    setDesignStyles([]);
    setShowStyles(false);
    if (onPhotosChange) {
      onPhotosChange(newPhotos);
    }
  }, [photos, previews, onPhotosChange]);

  return (
    <div className="space-y-3">
      <Card className="border-2 border-[#004025] shadow-sm" data-testid="photo-upload">
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Site Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-xs text-muted-foreground">
            Upload up to {maxPhotos} photos of your garden site from different angles. 
            Claude AI will analyze them and suggest personalized design styles.
          </p>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-4 text-center
              transition-colors cursor-pointer
              ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
              ${photos.length >= maxPhotos ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={photos.length >= maxPhotos}
              data-testid="file-input"
            />
            
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <div>
                <p className="text-sm font-medium">
                  {photos.length >= maxPhotos 
                    ? `Maximum ${maxPhotos} photos reached`
                    : 'Drag & drop photos here or click to browse'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {maxPhotos - photos.length} of {maxPhotos} slots available
                </p>
              </div>
            </div>
          </div>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded overflow-hidden bg-gray-100"
                >
                  <img
                    src={preview}
                    alt={`Garden photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index)}
                    data-testid={`remove-photo-${index}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                    Photo {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analyze Button */}
          {photos.length > 0 && (
            <Button
              onClick={() => analyzePhotosMutation.mutate()}
              disabled={analyzePhotosMutation.isPending || generateStylesMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              data-testid="button-analyze-photos"
            >
              {analyzePhotosMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing with Claude AI...
                </>
              ) : generateStylesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Design Styles...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Photos & Generate Designs
                </>
              )}
            </Button>
          )}

          {/* Photo Tips */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs font-medium mb-1">📸 Photo Tips:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
              <li>• Take photos from all four corners</li>
              <li>• Include existing features (trees, structures)</li>
              <li>• Show sun/shade patterns if possible</li>
              <li>• Capture any slopes or elevation changes</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {showAnalysis && analysis && (
        <Card className="border-2 border-purple-300 bg-purple-50/30 shadow-sm" data-testid="photo-analysis-results">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TreePine className="w-4 h-4 text-purple-600" />
              Claude's Garden Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Overall Condition */}
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-sm mb-1">Overall Condition</h4>
              <p className="text-xs">{analysis.overallCondition}</p>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Existing Plants */}
              {analysis.existingPlants.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <h4 className="font-semibold text-sm mb-1">🌿 Existing Plants</h4>
                  <ul className="text-xs space-y-0.5">
                    {analysis.existingPlants.map((plant, i) => (
                      <li key={i}>• {plant}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Structures */}
              {analysis.structures.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-sm mb-1">🏗️ Garden Features</h4>
                  <ul className="text-xs space-y-0.5">
                    {analysis.structures.map((structure, i) => (
                      <li key={i}>• {structure}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Soil & Sunlight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <h4 className="font-semibold text-sm mb-1">🪨 Soil Observations</h4>
                <p className="text-xs">{analysis.soilObservations}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-sm mb-1">☀️ Sunlight Patterns</h4>
                <p className="text-xs">{analysis.sunlightPatterns}</p>
              </div>
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-300">
                <h4 className="font-semibold text-sm mb-2">💡 Recommendations</h4>
                <ul className="text-xs space-y-1">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-600 mr-1">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Challenges & Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.challenges.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-sm mb-1">⚠️ Challenges to Address</h4>
                  <ul className="text-xs space-y-0.5">
                    {analysis.challenges.map((challenge, i) => (
                      <li key={i}>• {challenge}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.opportunities.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-sm mb-1">🎯 Opportunities</h4>
                  <ul className="text-xs space-y-0.5">
                    {analysis.opportunities.map((opp, i) => (
                      <li key={i}>• {opp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Design Style Suggestions */}
      {showStyles && designStyles.length > 0 && (
        <Card className="border-2 border-indigo-300 bg-indigo-50/30 shadow-sm" data-testid="design-styles">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              Personalized Design Styles by Claude
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground">
              Based on your preferences and site analysis, Claude has created {designStyles.length} unique design styles for your garden. 
              Each style is tailored to your specific conditions and requirements.
            </p>

            {designStyles.map((style, index) => (
              <Card key={index} className="border border-indigo-200 bg-white">
                <CardHeader className="py-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm">{style.styleName}</CardTitle>
                    <div className="text-xs bg-indigo-100 px-2 py-1 rounded">
                      Match: {style.suitabilityScore}/10
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs">{style.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Key Features */}
                    <div className="p-2 bg-gray-50 rounded">
                      <h5 className="text-xs font-semibold mb-1">Key Features</h5>
                      <ul className="text-xs space-y-0.5">
                        {style.keyFeatures.map((feature, i) => (
                          <li key={i}>• {feature}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Plant Palette */}
                    <div className="p-2 bg-green-50 rounded">
                      <h5 className="text-xs font-semibold mb-1">Plant Palette</h5>
                      <ul className="text-xs space-y-0.5">
                        {style.plantPalette.slice(0, 5).map((plant, i) => (
                          <li key={i}>• {plant}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {/* Color Scheme */}
                    <div className="p-2 bg-purple-50 rounded">
                      <h5 className="text-xs font-semibold mb-1">Colors</h5>
                      <div className="text-xs">{style.colorScheme.join(', ')}</div>
                    </div>

                    {/* Maintenance */}
                    <div className="p-2 bg-amber-50 rounded">
                      <h5 className="text-xs font-semibold mb-1">Maintenance</h5>
                      <div className="text-xs">{style.maintenanceLevel}</div>
                    </div>
                  </div>

                  {/* Why This Works */}
                  <div className="p-2 bg-blue-50 rounded">
                    <h5 className="text-xs font-semibold mb-1">Why This Works</h5>
                    <p className="text-xs">{style.reasoning}</p>
                  </div>

                  <Button 
                    className="w-full" 
                    variant="outline"
                    size="sm"
                    data-testid={`select-style-${index}`}
                  >
                    Select This Style
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}