import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize2, 
  Minimize2, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flower2,
  TreePine,
  Leaf,
  Snowflake,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Volume2,
  VolumeX,
  Settings,
  Info,
  Download,
  X,
  Plus,
  Loader2,
  ZoomIn,
  Target
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { format, parse } from 'date-fns';
import SeasonalDateSelector from './seasonal-date-selector';
import { LoadingSpinner, ProgressBar, LoadingSteps } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { SeasonalViewerErrorBoundary } from '@/components/ui/error-boundary';
import LazyImage from '@/components/ui/lazy-image';

interface SeasonalImage {
  dayOfYear: number;        // Day of year (1-365) - precise daily timing
  date: string;             // "2024-06-15" format - readable date
  imageUrl: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  description: string;
  bloomingPlants: string[];
  weatherCondition: string;
}

interface DateRange {
  startDay: number;         // Day of year (1-365)
  endDay: number;           // Day of year (can be < startDay for wrap-around)
  totalDays: number;
  isWrapAround: boolean;
  rangeId: string;          // Unique identifier for this range
  color: string;            // Color for timeline visualization
  label?: string;           // Optional label like "Spring Bloom"
}

interface GenerationProgress {
  isGenerating: boolean;
  currentImageIndex: number;
  totalImages: number;
  message: string;
}

interface SeasonalViewerProps {
  isOpen: boolean;
  onClose: () => void;
  gardenName: string;
  gardenId: string;         // Garden ID for API calls
  images: SeasonalImage[];
  dateRange: DateRange;     // Current primary date range
  additionalRanges?: DateRange[];  // Additional date ranges
  onAddDateRange?: (startDay: number, endDay: number) => void;
  onImagesGenerated?: (newImages: SeasonalImage[]) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Range color palette for multiple date ranges
const RANGE_COLORS = [
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#EC4899', // pink-500
];

// Quick date range presets
const QUICK_RANGES = [
  {
    name: "Spring Bloom",
    startDay: 75,  // Mid March
    endDay: 151,   // End May
    icon: <Flower2 className="h-4 w-4" />
  },
  {
    name: "Summer Glory", 
    startDay: 152, // June
    endDay: 243,   // August
    icon: <Sun className="h-4 w-4" />
  },
  {
    name: "Fall Colors",
    startDay: 244, // September
    endDay: 334,   // November
    icon: <Leaf className="h-4 w-4" />
  },
  {
    name: "Winter Structure",
    startDay: 335, // December
    endDay: 74,    // March (wrap-around)
    icon: <Snowflake className="h-4 w-4" />
  }
];

const SEASON_ICONS = {
  spring: <Flower2 className="h-4 w-4" />,
  summer: <Sun className="h-4 w-4" />,
  autumn: <Leaf className="h-4 w-4" />,
  winter: <Snowflake className="h-4 w-4" />
};

const SEASON_COLORS = {
  spring: 'bg-green-500',
  summer: 'bg-yellow-500',
  autumn: 'bg-orange-500',
  winter: 'bg-blue-500'
};

export default function SeasonalViewer({
  isOpen,
  onClose,
  gardenName,
  gardenId,
  images,
  dateRange,
  additionalRanges = [],
  onAddDateRange,
  onImagesGenerated
}: SeasonalViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    isGenerating: false,
    currentImageIndex: 0,
    totalImages: 0,
    message: ''
  });
  const [zoomLevel, setZoomLevel] = useState(1); // For timeline zoom
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Calculate timeline position
  const getTimelinePosition = (index: number) => {
    if (images.length <= 1) return 0;
    return (index / (images.length - 1)) * 100;
  };

  // Helper functions for daily precision
  const dayOfYearToDate = useCallback((dayOfYear: number) => {
    const year = new Date().getFullYear();
    const date = new Date(year, 0, dayOfYear);
    return format(date, 'MMM d, yyyy');
  }, []);

  const dayOfYearToMonthDay = useCallback((dayOfYear: number) => {
    const year = new Date().getFullYear();
    const date = new Date(year, 0, dayOfYear);
    return format(date, 'MMM d');
  }, []);

  const getTimelinePositionForDay = useCallback((dayOfYear: number) => {
    if (images.length <= 1) return 0;
    
    // Find the image with this dayOfYear
    const imageIndex = images.findIndex(img => img.dayOfYear === dayOfYear);
    if (imageIndex === -1) return 0;
    
    return (imageIndex / (images.length - 1)) * 100;
  }, [images]);

  const getDayRangeInfo = useCallback(() => {
    if (!dateRange) return { startDate: '', endDate: '', totalDays: 0 };
    
    const startDate = dayOfYearToMonthDay(dateRange.startDay);
    const endDate = dayOfYearToMonthDay(dateRange.endDay);
    
    return {
      startDate,
      endDate: dateRange.isWrapAround ? `${endDate} (+1 year)` : endDate,
      totalDays: dateRange.totalDays
    };
  }, [dateRange, dayOfYearToMonthDay]);

  const rangeInfo = getDayRangeInfo();

  // Handle playback
  useEffect(() => {
    if (isPlaying && images.length > 1) {
      const duration = 2000 / playbackSpeed; // 2 seconds per image at 1x speed
      
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= images.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          setIsTransitioning(true);
          setTimeout(() => setIsTransitioning(false), 300);
          return prev + 1;
        });
      }, duration);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, images.length, playbackSpeed]);

  // Keyboard controls with daily precision
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen || showDateSelector) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Home':
          // Jump to first image
          if (images.length > 0) {
            setCurrentIndex(0);
            setIsPlaying(false);
          }
          break;
        case 'End':
          // Jump to last image
          if (images.length > 0) {
            setCurrentIndex(images.length - 1);
            setIsPlaying(false);
          }
          break;
        case 'PageUp':
          // Jump backward by 7 days (week)
          setCurrentIndex(prev => Math.max(0, prev - 7));
          setIsPlaying(false);
          break;
        case 'PageDown':
          // Jump forward by 7 days (week)
          setCurrentIndex(prev => Math.min(images.length - 1, prev + 7));
          setIsPlaying(false);
          break;
        case 'n':
          // New date range
          if (onAddDateRange && !generationProgress.isGenerating) {
            setShowDateSelector(true);
          }
          break;
        case 'r':
          // Reset timeline zoom
          setZoomLevel(1);
          break;
        case 'Escape':
          if (showDateSelector) {
            setShowDateSelector(false);
          } else if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'f':
          if (!showDateSelector) {
            setIsFullscreen(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isFullscreen, showDateSelector, generationProgress.isGenerating, onClose, onAddDateRange, images.length]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(false);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) / zoomLevel; // Account for zoom level
    const newIndex = Math.round(percentage * (images.length - 1));
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
      setCurrentIndex(newIndex);
      setIsPlaying(false);
      
      toast({
        title: "Jumped to Date",
        description: `Viewing ${images[newIndex]?.date}`,
      });
    }
  };

  const handleDownload = () => {
    const currentImage = images[currentIndex];
    if (currentImage) {
      const link = document.createElement('a');
      link.download = `${gardenName}-${currentImage.date.replace(/[^\w\d-]/g, '-')}.png`;
      link.href = currentImage.imageUrl;
      link.click();
      
      toast({
        title: "Download Started",
        description: `Downloading ${currentImage.date} image`,
      });
    }
  };

  // Generate additional seasonal images for a new date range
  const handleGenerateAdditionalImages = async (startDay: number, endDay: number) => {
    if (!gardenId) return;
    
    setGenerationProgress({
      isGenerating: true,
      currentImageIndex: 0,
      totalImages: 0,
      message: 'Preparing to generate seasonal images...'
    });

    try {
      const response = await apiRequest('POST', `/api/gardens/${gardenId}/generate-seasonal`, {
        startDay,
        endDay,
        imageCount: Math.min(5, Math.floor(Math.abs(endDay - startDay) / 30) + 1),
        season: 'auto' // Let the API determine season based on dates
      });
      
      const data = await response.json();

      if (data.images && data.images.length > 0) {
        onImagesGenerated?.(data.images);
        
        toast({
          title: "Images Generated!",
          description: `Generated ${data.images.length} new seasonal images`,
        });
      }
      
      onAddDateRange?.(startDay, endDay);
      
    } catch (error: any) {
      console.error('Error generating additional images:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate seasonal images",
        variant: "destructive"
      });
    } finally {
      setGenerationProgress({
        isGenerating: false,
        currentImageIndex: 0,
        totalImages: 0,
        message: ''
      });
    }
  };

  const handleQuickRangeSelect = (range: typeof QUICK_RANGES[0]) => {
    handleGenerateAdditionalImages(range.startDay, range.endDay);
  };

  const currentImage = images[currentIndex];
  const allRanges = [dateRange, ...(additionalRanges || [])].filter(Boolean);

  // Reset current index if images change
  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  if (!isOpen || !currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 border-0",
          isFullscreen ? "max-w-full w-screen h-screen" : "max-w-7xl w-[95vw] h-[90vh]"
        )}
        aria-describedby="seasonal-viewer-description"
      >
        <DialogDescription id="seasonal-viewer-description" className="sr-only">
          Interactive seasonal garden viewer showing daily precision timeline of garden images across different seasons.
        </DialogDescription>
        <div 
          ref={containerRef}
          className="relative w-full h-full bg-black flex flex-col"
          data-testid="seasonal-viewer"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                  {gardenName} - Seasonal Journey
                  <Badge variant="secondary" className="ml-2">
                    {currentImage.season}
                  </Badge>
                </h2>
                <p className="text-white/70 text-sm">
                  {currentImage.date} • Day {currentImage.dayOfYear} • {currentImage.weatherCondition}
                </p>
              </div>
              
              <div className="flex gap-2">
                {/* Add Date Range Button */}
                {onAddDateRange && (
                  <Button
                    size="icon"
                    className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                    onClick={() => setShowDateSelector(true)}
                    data-testid="button-add-date-range"
                    disabled={generationProgress.isGenerating}
                  >
                    {generationProgress.isGenerating ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </Button>
                )}
                <Button
                  size="icon"
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                  onClick={() => setZoomLevel(prev => Math.min(prev * 1.5, 3))}
                  data-testid="button-timeline-zoom"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                  onClick={() => setShowInfo(prev => !prev)}
                  data-testid="button-toggle-info"
                >
                  <Info className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                  onClick={handleDownload}
                  data-testid="button-download-image"
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                  onClick={() => setIsFullscreen(prev => !prev)}
                  data-testid="button-toggle-fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
                <Button
                  size="icon"
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                  onClick={onClose}
                  data-testid="button-close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Image Display */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <LazyImage
              src={currentImage.imageUrl}
              alt={`${gardenName} in ${currentImage.season}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-opacity duration-300",
                isTransitioning ? "opacity-0" : "opacity-100"
              )}
              priority={true}
              aspectRatio="16/9"
              fadeIn={false}
            />
            
            {/* Side Navigation */}
            {currentIndex > 0 && (
              <Button
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-primary/30 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
                onClick={handlePrevious}
                data-testid="button-previous"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            
            {currentIndex < images.length - 1 && (
              <Button
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary/30 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
                onClick={handleNext}
                data-testid="button-next"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Generation Progress Overlay */}
          {generationProgress.isGenerating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="bg-black/80 rounded-lg p-6 max-w-sm mx-4">
                <LoadingSpinner 
                  size="lg" 
                  text="Generating Seasonal Images"
                  textPosition="right"
                  className="text-white mb-4"
                />
                <p className="text-white/70 text-sm mb-3">{generationProgress.message}</p>
                {generationProgress.totalImages > 0 && (
                  <ProgressBar
                    value={generationProgress.currentImageIndex}
                    max={generationProgress.totalImages}
                    text={`Image ${generationProgress.currentImageIndex} of ${generationProgress.totalImages}`}
                    showPercentage={true}
                    color="accent"
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Info Panel */}
          {showInfo && (
            <div className="absolute bottom-24 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-4 max-w-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    {SEASON_ICONS[currentImage.season]}
                    <span className="font-medium">{currentImage.season.charAt(0).toUpperCase() + currentImage.season.slice(1)}</span>
                  </div>
                  <Badge variant="outline" className="text-xs text-white/80 border-white/30">
                    Day {currentImage.dayOfYear}
                  </Badge>
                </div>
                <div className="text-white text-sm font-medium">
                  {dayOfYearToDate(currentImage.dayOfYear)}
                </div>
                {currentImage.bloomingPlants.length > 0 && (
                  <div className="text-white/80 text-sm">
                    <p className="font-medium mb-1">Blooming:</p>
                    <div className="flex flex-wrap gap-1">
                      {currentImage.bloomingPlants.map((plant, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {plant}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-white/70 text-xs mt-2">{currentImage.description}</p>
                <div className="text-white/60 text-xs pt-2 border-t border-white/20">
                  <div className="flex justify-between">
                    <span>Range: {rangeInfo.startDate} - {rangeInfo.endDate}</span>
                    <span>{rangeInfo.totalDays} days</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent">
            {/* Enhanced Timeline with Daily Precision */}
            <div className="px-4 pb-2">
              {/* Date Range Indicator */}
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{rangeInfo.startDate} — {rangeInfo.endDate}</span>
                  {dateRange?.isWrapAround && (
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-300">
                      Wrap-around
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{rangeInfo.totalDays} days</span>
                </div>
              </div>
              
              {/* Main Timeline */}
              <div 
                className="relative h-2 bg-white/20 rounded-full cursor-pointer group overflow-hidden"
                onClick={handleTimelineClick}
                data-testid="timeline-bar"
                style={{ transform: `scaleX(${zoomLevel})`, transformOrigin: 'left center' }}
              >
                {/* Timeline segments by date with daily precision */}
                <div className="absolute inset-0 flex rounded-full overflow-hidden">
                  {images.map((img, idx) => {
                    const width = 100 / images.length;
                    const isActive = idx <= currentIndex;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "h-full transition-all duration-300 border-r border-white/10 hover:opacity-90", 
                          SEASON_COLORS[img.season]
                        )}
                        style={{ 
                          width: `${width}%`, 
                          opacity: isActive ? 0.9 : 0.4,
                          filter: isActive ? 'brightness(1.1)' : 'brightness(0.8)'
                        }}
                        title={`${img.date} (Day ${img.dayOfYear})`}
                      />
                    );
                  })}
                </div>
                
                {/* Current position indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-canary transition-all duration-300 hover:scale-110"
                  style={{ left: `${getTimelinePosition(currentIndex)}%` }}
                />
                
                {/* Additional Range Indicators */}
                {additionalRanges?.map((range, idx) => {
                  const startPos = getTimelinePositionForDay(range.startDay);
                  const endPos = getTimelinePositionForDay(range.endDay);
                  const color = RANGE_COLORS[idx % RANGE_COLORS.length];
                  
                  return (
                    <div
                      key={range.rangeId}
                      className="absolute bottom-0 h-1 rounded-full opacity-60"
                      style={{
                        left: `${Math.min(startPos, endPos)}%`,
                        width: `${Math.abs(endPos - startPos)}%`,
                        backgroundColor: color
                      }}
                    />
                  );
                })}
                
                {/* Hover tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none">
                  Click to jump to date
                </div>
              </div>
              
              {/* Date markers */}
              <div className="relative mt-2">
                <div className="flex justify-between text-xs text-white/40">
                  {images.length > 0 && (
                    <>
                      <span>{dayOfYearToMonthDay(images[0].dayOfYear)}</span>
                      {images.length > 2 && (
                        <span>{dayOfYearToMonthDay(images[Math.floor(images.length / 2)].dayOfYear)}</span>
                      )}
                      <span>{dayOfYearToMonthDay(images[images.length - 1].dayOfYear)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between px-4 py-3 mt-8">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-skip-back"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                
                <Button
                  size="icon"
                  onClick={() => setIsPlaying(prev => !prev)}
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                
                <Button
                  size="icon"
                  onClick={handleNext}
                  disabled={currentIndex === images.length - 1}
                  className="bg-primary/20 text-white hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-skip-forward"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                
                <div className="text-white/70 text-sm ml-4">
                  {currentIndex + 1} / {images.length}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Speed Control */}
                <Select
                  value={playbackSpeed.toString()}
                  onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                >
                  <SelectTrigger className="w-20 h-8 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                  </SelectContent>
                </Select>

                {/* Daily Timeline Controls */}
                <div className="flex items-center gap-3">
                  {/* Timeline Zoom Reset */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => setZoomLevel(1)}
                    disabled={zoomLevel === 1}
                  >
                    Reset Zoom
                  </Button>
                  
                  {/* Current Date Range Display */}
                  <div className="text-white/70 text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{rangeInfo.startDate} — {rangeInfo.endDate}</span>
                    <Badge variant="secondary" className="text-xs">
                      {rangeInfo.totalDays} days
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Date Range Selector Dialog */}
      {showDateSelector && (
        <Dialog open={showDateSelector} onOpenChange={setShowDateSelector}>
          <DialogContent className="max-w-4xl w-[95vw]" aria-describedby="date-selector-description">
            <DialogHeader>
              <DialogTitle>Select Date Range for Garden Visualization</DialogTitle>
              <DialogDescription id="date-selector-description">
                Choose a custom date range or select from quick preset options to generate additional seasonal images for your garden.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Add New Date Range</h3>
                <div className="flex gap-2">
                  {/* Quick Range Buttons */}
                  {QUICK_RANGES.map((range, idx) => (
                    <Button
                      key={range.name}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 hover:bg-primary hover:text-white"
                      onClick={() => {
                        handleQuickRangeSelect(range);
                        setShowDateSelector(false);
                      }}
                      disabled={generationProgress.isGenerating}
                      data-testid={`button-quick-range-${range.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {range.icon}
                      <span>{range.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              <SeasonalDateSelector
                onDateRangeSelected={(startDay, endDay) => {
                  handleGenerateAdditionalImages(startDay, endDay);
                  setShowDateSelector(false);
                }}
                isLoading={generationProgress.isGenerating}
                className="border-0 shadow-none"
              />
              
              {/* Generation Status */}
              {generationProgress.isGenerating && (
                <div className="bg-muted rounded-lg p-4">
                  <LoadingSpinner 
                    size="base" 
                    text="Generating Seasonal Images"
                    textPosition="right"
                    className="mb-3"
                  />
                  <p className="text-sm text-muted-foreground mb-3">{generationProgress.message}</p>
                  {generationProgress.totalImages > 0 && (
                    <ProgressBar
                      value={generationProgress.currentImageIndex}
                      max={generationProgress.totalImages}
                      showPercentage={true}
                    />
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}