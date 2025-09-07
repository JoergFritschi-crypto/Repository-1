import { useState, useCallback } from 'react';
import { Upload, X, Camera, Loader2, TreePine, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PhotoUploadProps {
  onPhotosChange?: (photos: File[]) => void;
  onAnalysisComplete?: (analysis: GardenPhotoAnalysis) => void;
  onRecommendedStyles?: (styles: string[]) => void;
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
  recommendedStyles?: string[]; // Style IDs that Claude recommends
}

export default function PhotoUpload({ 
  onPhotosChange,
  onAnalysisComplete,
  onRecommendedStyles,
  maxPhotos = 6,
  gardenData
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<GardenPhotoAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
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
      if (data.recommendedStyles && onRecommendedStyles) {
        onRecommendedStyles(data.recommendedStyles);
      }
      toast({
        title: 'Analysis Complete',
        description: 'Claude has analyzed your garden photos successfully!'
      });
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Unable to analyze photos. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addPhotos(files);
  }, []);

  const addPhotos = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    );

    if (validFiles.length !== newFiles.length) {
      toast({
        title: 'Some files were skipped',
        description: 'Only image files under 10MB are accepted.',
        variant: 'destructive'
      });
    }

    const availableSlots = maxPhotos - photos.length;
    const filesToAdd = validFiles.slice(0, availableSlots);

    if (filesToAdd.length < validFiles.length) {
      toast({
        title: 'Photo limit reached',
        description: `You can only upload ${maxPhotos} photos total.`,
        variant: 'destructive'
      });
    }

    if (filesToAdd.length > 0) {
      const newPhotos = [...photos, ...filesToAdd];
      setPhotos(newPhotos);
      
      // Create previews
      filesToAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Reset analysis when new photos are added
      setAnalysis(null);
      setShowAnalysis(false);
      if (onPhotosChange) {
        onPhotosChange(newPhotos);
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
    
    // Reset analysis when photos are removed
    setAnalysis(null);
    setShowAnalysis(false);
    if (onPhotosChange) {
      onPhotosChange(newPhotos);
    }
  };

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
    
    const files = Array.from(e.dataTransfer.files);
    addPhotos(files);
  }, [photos.length, maxPhotos]);

  return (
    <div className="space-y-3">
      {/* Photo Upload Section */}
      <Card className="border-2 border-purple-300 bg-purple-50/30 shadow-sm" data-testid="photo-upload">
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-600" />
            Garden Photos (Optional but Recommended)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-xs text-muted-foreground">
            Upload photos of your garden for AI analysis. Claude will assess current conditions, identify plants, and provide personalized recommendations.
          </p>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-300 hover:border-purple-400'
            } ${photos.length >= maxPhotos ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (photos.length < maxPhotos) {
                document.getElementById('photo-upload-input')?.click();
              }
            }}
            data-testid="photo-upload-area"
          >
            <input
              id="photo-upload-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={photos.length >= maxPhotos}
              data-testid="input-photo-upload"
            />
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium">
              {photos.length >= maxPhotos 
                ? `Maximum ${maxPhotos} photos reached`
                : 'Click or drag photos here to upload'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {photos.length}/{maxPhotos} photos uploaded
            </p>
          </div>

          {/* Photo Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={preview} 
                    alt={`Garden photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-remove-photo-${index}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Analyze Button */}
          {photos.length > 0 && !showAnalysis && (
            <Button
              onClick={() => analyzePhotosMutation.mutate()}
              disabled={analyzePhotosMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              data-testid="button-analyze-photos"
            >
              {analyzePhotosMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing with Claude AI...
                </>
              ) : (
                <>
                  <TreePine className="w-4 h-4 mr-2" />
                  Analyze Garden with Claude AI
                </>
              )}
            </Button>
          )}
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
              <p className="text-xs text-gray-600">{analysis.overallCondition}</p>
            </div>

            {/* Existing Plants */}
            {analysis.existingPlants.length > 0 && (
              <div className="p-3 bg-white rounded-lg border border-green-200">
                <h4 className="font-semibold text-sm mb-1">🌿 Existing Plants Identified</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.existingPlants.map((plant, i) => (
                    <span key={i} className="text-xs bg-green-100 px-2 py-0.5 rounded">
                      {plant}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Soil Observations */}
            <div className="p-3 bg-white rounded-lg border border-amber-200">
              <h4 className="font-semibold text-sm mb-1">🌱 Soil Observations</h4>
              <p className="text-xs text-gray-600">{analysis.soilObservations}</p>
            </div>

            {/* Sunlight Patterns */}
            <div className="p-3 bg-white rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-sm mb-1">☀️ Sunlight Patterns</h4>
              <p className="text-xs text-gray-600">{analysis.sunlightPatterns}</p>
            </div>

            {/* Structures */}
            {analysis.structures.length > 0 && (
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <h4 className="font-semibold text-sm mb-1">🏠 Structures & Features</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.structures.map((structure, i) => (
                    <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {structure}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Three-Column Grid for Recommendations, Challenges, Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {analysis.recommendations.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-sm mb-1">💡 Recommendations</h4>
                  <ul className="text-xs space-y-0.5">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.challenges.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-red-200">
                  <h4 className="font-semibold text-sm mb-1">⚠️ Challenges</h4>
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

            {/* Brief mention of recommended styles */}
            {analysis.recommendedStyles && analysis.recommendedStyles.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-300">
                <h4 className="font-semibold text-sm mb-1 text-purple-800">
                  🌟 Style Recommendations Preview
                </h4>
                <p className="text-xs text-purple-700">
                  Based on your garden analysis, Claude recommends {analysis.recommendedStyles.length} styles that would work beautifully with your space. 
                  You'll see detailed recommendations and can choose from these or other styles in the next step.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}