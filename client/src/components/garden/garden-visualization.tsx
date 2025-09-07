import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  RotateCcw,
  Download,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GardenVisualizationProps {
  gardenId: string;
  userTier: 'free' | 'pay_per_design' | 'premium';
  onReturn?: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Map period indices to season and specific time
const getPeriodDetails = (periodIndex: number) => {
  const monthIndex = Math.floor(periodIndex / 2);
  const isLate = periodIndex % 2 === 1;
  const month = MONTHS[monthIndex];
  
  // Determine season
  let season = 'spring';
  if (monthIndex >= 2 && monthIndex <= 4) season = 'spring';
  else if (monthIndex >= 5 && monthIndex <= 7) season = 'summer';
  else if (monthIndex >= 8 && monthIndex <= 10) season = 'autumn';
  else season = 'winter';
  
  return {
    month,
    period: isLate ? 'late' : 'early',
    fullPeriod: `${isLate ? 'Late' : 'Early'} ${month}`,
    season
  };
};

export function GardenVisualization({ gardenId, userTier, onReturn }: GardenVisualizationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [imageCount, setImageCount] = useState(2);
  const [periodRange, setPeriodRange] = useState([4, 21]); // Default: Early March to Late October
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; period: string; season: string }>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Tier-based limits
  const maxImages = userTier === 'free' ? 2 : 6;
  const maxIterations = userTier === 'free' ? 3 : Infinity;
  const canIterate = iterationCount < maxIterations;
  
  // Query to get existing iteration count and saved images from storage
  const { data: visualizationData } = useQuery<{
    iterationCount: number;
    savedImages?: Array<{ url: string; period: string; season: string }>;
    lastSaved?: string;
  }>({
    queryKey: [`/api/gardens/${gardenId}/visualization-data`],
    enabled: !!gardenId
  });
  
  useEffect(() => {
    if (visualizationData) {
      if (visualizationData.iterationCount) {
        setIterationCount(visualizationData.iterationCount);
      }
      if (visualizationData.savedImages && visualizationData.savedImages.length > 0) {
        setGeneratedImages(visualizationData.savedImages);
      }
    }
  }, [visualizationData]);
  
  // Calculate distributed periods
  const getDistributedPeriods = useCallback(() => {
    const startPeriod = periodRange[0];
    const endPeriod = periodRange[1];
    
    if (imageCount === 1) {
      // Single image at midpoint
      const midPoint = Math.floor((startPeriod + endPeriod) / 2);
      return [midPoint];
    }
    
    // Distribute evenly - ALWAYS include first and last periods
    const periods: number[] = [];
    
    // For 2 images: just start and end
    if (imageCount === 2) {
      return [startPeriod, endPeriod];
    }
    
    // For 3+ images: distribute evenly with first at start, last at end
    const range = endPeriod - startPeriod;
    const step = range / (imageCount - 1);
    
    for (let i = 0; i < imageCount; i++) {
      if (i === 0) {
        // First image ALWAYS at the very start
        periods.push(startPeriod);
      } else if (i === imageCount - 1) {
        // Last image ALWAYS at the very end
        periods.push(endPeriod);
      } else {
        // Middle images distributed evenly
        const position = startPeriod + (step * i);
        periods.push(Math.round(position));
      }
    }
    
    return periods;
  }, [imageCount, periodRange]);
  
  // Generate images mutation
  const generateImagesMutation = useMutation({
    mutationFn: async () => {
      const periods = getDistributedPeriods();
      setGenerationProgress(0);
      
      // Get canvas design from current garden
      const gardenResponse = await apiRequest('GET', `/api/gardens/${gardenId}`);
      const gardenData = await gardenResponse.json();
      
      if (!gardenData.canvasDesign || !gardenData.canvasDesign.plants || gardenData.canvasDesign.plants.length === 0) {
        throw new Error('Please add plants to your garden design before generating visualizations');
      }
      
      // Generate images one by one to show progress
      const images = [];
      for (let i = 0; i < periods.length; i++) {
        const periodIndex = periods[i];
        const details = getPeriodDetails(periodIndex);
        
        // Update progress
        setGenerationProgress((i / periods.length) * 100);
        
        const response = await apiRequest('POST', `/api/gardens/${gardenId}/generate-seasonal-images`, {
          season: details.season,
          specificTime: details.fullPeriod,
          canvasDesign: gardenData.canvasDesign
        });
        
        const image = await response.json();
        images.push({
          url: image.imageUrl || image.imageData,
          period: details.fullPeriod,
          season: details.season
        });
        
        // Update progress after each image
        setGenerationProgress(((i + 1) / periods.length) * 100);
      }
      
      // Update iteration count
      await apiRequest('POST', `/api/gardens/${gardenId}/update-visualization-data`, {
        iterationCount: iterationCount + 1
      });
      
      return images;
    },
    onSuccess: (images) => {
      setGeneratedImages(images);
      setIterationCount(prev => prev + 1);
      setCurrentImageIndex(0);
      setGenerationProgress(0);
      toast({
        title: "Images Generated",
        description: `Successfully generated ${images.length} seasonal visualizations`
      });
    },
    onError: (error) => {
      setGenerationProgress(0);
      toast({
        title: "Generation Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });
  
  // Playback control
  useEffect(() => {
    if (isPlaying && generatedImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % generatedImages.length);
      }, 3000); // 3 seconds per image
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, generatedImages.length]);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (generatedImages.length === 0) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          setCurrentImageIndex(prev => prev > 0 ? prev - 1 : generatedImages.length - 1);
          break;
        case 'ArrowRight':
          setCurrentImageIndex(prev => (prev + 1) % generatedImages.length);
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'Escape':
          setIsFullscreen(false);
          break;
        case 'f':
          setIsFullscreen(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [generatedImages.length]);
  
  const handleDownload = () => {
    if (generatedImages[currentImageIndex]) {
      const link = document.createElement('a');
      link.href = generatedImages[currentImageIndex].url;
      link.download = `garden-${generatedImages[currentImageIndex].period.replace(' ', '-')}.png`;
      link.click();
    }
  };
  
  const handleDownloadAll = async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      const image = generatedImages[i];
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `garden-${image.period.replace(' ', '-')}.png`;
      link.click();
      // Small delay between downloads to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast({
      title: "Downloads Started",
      description: `Downloading ${generatedImages.length} images to your downloads folder`
    });
  };
  
  const handleSaveToGarden = async () => {
    try {
      await apiRequest('POST', `/api/gardens/${gardenId}/save-seasonal-images`, {
        images: generatedImages
      });
      
      toast({
        title: "Images Saved",
        description: "Seasonal images have been saved to your garden"
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save images to garden",
        variant: "destructive"
      });
    }
  };
  
  const formatPeriodRange = () => {
    const start = getPeriodDetails(periodRange[0]);
    const end = getPeriodDetails(periodRange[1]);
    return `${start.fullPeriod} - ${end.fullPeriod}`;
  };
  
  return (
    <>
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Garden Seasonal Visualization</CardTitle>
          <CardDescription>
            Generate photorealistic views of your garden throughout the year
            {userTier === 'free' && (
              <span className="block mt-1 text-orange-600">
                Free tier: {maxImages} images, {maxIterations - iterationCount} iterations remaining
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Image Count Selection */}
          <div className="space-y-2">
            <Label>Number of Images</Label>
            <RadioGroup 
              value={imageCount.toString()} 
              onValueChange={(val) => setImageCount(parseInt(val))}
              disabled={generateImagesMutation.isPending}
            >
              <div className="flex gap-4 flex-wrap">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <div key={num} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={num.toString()} 
                      id={`count-${num}`}
                      disabled={num > maxImages}
                    />
                    <Label 
                      htmlFor={`count-${num}`}
                      className={num > maxImages ? 'text-gray-400' : ''}
                    >
                      {num}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
          
          {/* Time Period Selection - Draggable Timeline */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Drag to Select Time Period</Label>
            
            {/* Draggable Visual Timeline */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-sm font-medium mb-3">Selected: {formatPeriodRange()}</div>
              <div 
                className="relative h-12 bg-gray-300 rounded-full cursor-pointer select-none"
                onMouseDown={(e) => {
                  if (generateImagesMutation.isPending) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const width = rect.width;
                  const clickPosition = (x / width) * 23;
                  
                  // Determine if clicking near start or end of range
                  const distToStart = Math.abs(clickPosition - periodRange[0]);
                  const distToEnd = Math.abs(clickPosition - periodRange[1]);
                  
                  const isDraggingStart = distToStart < distToEnd;
                  
                  const handleDrag = (moveEvent: MouseEvent) => {
                    const newX = moveEvent.clientX - rect.left;
                    const newPosition = Math.round((newX / width) * 23);
                    const clampedPosition = Math.max(0, Math.min(23, newPosition));
                    
                    if (isDraggingStart) {
                      setPeriodRange([Math.min(clampedPosition, periodRange[1]), periodRange[1]]);
                    } else {
                      setPeriodRange([periodRange[0], Math.max(periodRange[0], clampedPosition)]);
                    }
                  };
                  
                  const handleRelease = () => {
                    document.removeEventListener('mousemove', handleDrag);
                    document.removeEventListener('mouseup', handleRelease);
                  };
                  
                  document.addEventListener('mousemove', handleDrag);
                  document.addEventListener('mouseup', handleRelease);
                }}
              >
                {/* Selected Range Bar */}
                <div 
                  className="absolute h-full bg-green-500 rounded-full pointer-events-none"
                  style={{
                    left: `${(periodRange[0] / 23) * 100}%`,
                    width: `${((periodRange[1] - periodRange[0] + 1) / 23) * 100}%`
                  }}
                >
                  {/* Start Handle */}
                  <div 
                    className="absolute w-4 h-full bg-green-600 rounded-l-full left-0 cursor-ew-resize pointer-events-auto"
                    style={{ marginLeft: '-2px' }}
                  />
                  {/* End Handle */}
                  <div 
                    className="absolute w-4 h-full bg-green-600 rounded-r-full right-0 cursor-ew-resize pointer-events-auto"
                    style={{ marginRight: '-2px' }}
                  />
                </div>
              </div>
              
              {/* Month Labels */}
              <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                  <span key={i} className="text-center" style={{ width: '8.33%' }}>{m}</span>
                ))}
              </div>
              
              {/* Help Text */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                Click and drag the green bar to adjust your time period
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          {generateImagesMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Generating images...</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {generationProgress > 0 && generationProgress < 100 && 
                  `Processing image ${Math.ceil((generationProgress / 100) * imageCount)} of ${imageCount}...`
                }
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => generateImagesMutation.mutate()}
              disabled={generateImagesMutation.isPending || !canIterate}
              className="flex-1"
            >
              {generateImagesMutation.isPending ? `Generating... ${Math.round(generationProgress)}%` : 'Generate Images'}
            </Button>
            
            {generatedImages.length > 0 && (
              <>
                <Button
                  onClick={() => setIsFullscreen(true)}
                  variant="outline"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  View Fullscreen
                </Button>
                
                <Button
                  onClick={handleDownloadAll}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
                
                <Button
                  onClick={handleSaveToGarden}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to Garden
                </Button>
              </>
            )}
            
            {onReturn && (
              <Button
                onClick={onReturn}
                variant="outline"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Return to Design
              </Button>
            )}
          </div>
          
          {/* Image Viewer (inline) */}
          {generatedImages.length > 0 && !isFullscreen && (
            <div className="space-y-3">
              <div className="relative aspect-[3/2] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={generatedImages[currentImageIndex].url}
                  alt={generatedImages[currentImageIndex].period}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded">
                  {generatedImages[currentImageIndex].period}
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentImageIndex(prev => 
                    prev > 0 ? prev - 1 : generatedImages.length - 1
                  )}
                  disabled={generatedImages.length <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={generatedImages.length <= 1}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentImageIndex(prev => 
                    (prev + 1) % generatedImages.length
                  )}
                  disabled={generatedImages.length <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                <span className="mx-2 text-sm">
                  {currentImageIndex + 1} / {generatedImages.length}
                </span>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Fullscreen Viewer */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-full h-full p-0 bg-black">
          {generatedImages.length > 0 && (
            <div className="relative w-full h-full flex flex-col">
              {/* Close button */}
              <Button
                className="absolute top-4 right-4 z-50"
                size="icon"
                variant="ghost"
                onClick={() => setIsFullscreen(false)}
              >
                <X className="w-6 h-6 text-white" />
              </Button>
              
              {/* Image */}
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={generatedImages[currentImageIndex].url}
                  alt={generatedImages[currentImageIndex].period}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              {/* Period label */}
              <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded">
                <p className="text-lg font-semibold">{generatedImages[currentImageIndex].period}</p>
                <p className="text-sm opacity-80">Season: {generatedImages[currentImageIndex].season}</p>
              </div>
              
              {/* YouTube-style controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => setCurrentImageIndex(prev => 
                      prev > 0 ? prev - 1 : generatedImages.length - 1
                    )}
                    disabled={generatedImages.length <= 1}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={generatedImages.length <= 1}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => setCurrentImageIndex(prev => 
                      (prev + 1) % generatedImages.length
                    )}
                    disabled={generatedImages.length <= 1}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                  
                  <span className="mx-4 text-white text-lg">
                    {currentImageIndex + 1} / {generatedImages.length}
                  </span>
                  
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={handleDownload}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="w-6 h-6" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => setIsFullscreen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <Minimize2 className="w-6 h-6" />
                  </Button>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4 bg-white/20 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-white h-full transition-all duration-300"
                    style={{ width: `${((currentImageIndex + 1) / generatedImages.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}