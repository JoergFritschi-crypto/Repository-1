import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SeasonalImage {
  month: number;
  half: 'first' | 'second';
  imageUrl: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  description: string;
  bloomingPlants: string[];
  weatherCondition: string;
}

interface SeasonalViewerProps {
  isOpen: boolean;
  onClose: () => void;
  gardenName: string;
  images: SeasonalImage[];
  startPeriod: { month: number; half: 'first' | 'second' };
  endPeriod: { month: number; half: 'first' | 'second' };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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
  images,
  startPeriod,
  endPeriod
}: SeasonalViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Calculate timeline position
  const getTimelinePosition = (index: number) => {
    if (images.length <= 1) return 0;
    return (index / (images.length - 1)) * 100;
  };

  // Format period label
  const formatPeriod = (month: number, half: 'first' | 'second') => {
    return `${half === 'first' ? 'Early' : 'Late'} ${MONTHS[month - 1]}`;
  };

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

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
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
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'f':
          setIsFullscreen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isFullscreen, onClose]);

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
    const percentage = x / rect.width;
    const newIndex = Math.round(percentage * (images.length - 1));
    
    if (newIndex !== currentIndex) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
      setCurrentIndex(Math.max(0, Math.min(images.length - 1, newIndex)));
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    const currentImage = images[currentIndex];
    if (currentImage) {
      const link = document.createElement('a');
      link.download = `${gardenName}-${formatPeriod(currentImage.month, currentImage.half).replace(/\s+/g, '-')}.png`;
      link.href = currentImage.imageUrl;
      link.click();
      
      toast({
        title: "Download Started",
        description: `Downloading ${formatPeriod(currentImage.month, currentImage.half)} image`,
      });
    }
  };

  const currentImage = images[currentIndex];

  if (!isOpen || !currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 border-0",
          isFullscreen ? "max-w-full w-screen h-screen" : "max-w-7xl w-[95vw] h-[90vh]"
        )}
      >
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
                  {formatPeriod(currentImage.month, currentImage.half)} • {currentImage.weatherCondition}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInfo(prev => !prev)}
                  className="text-white hover:bg-white/20"
                  data-testid="button-toggle-info"
                >
                  <Info className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20"
                  data-testid="button-download-image"
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="text-white hover:bg-white/20"
                  data-testid="button-toggle-fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                  data-testid="button-close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Image Display */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <img
              src={currentImage.imageUrl}
              alt={`${gardenName} in ${currentImage.season}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-opacity duration-300",
                isTransitioning ? "opacity-0" : "opacity-100"
              )}
            />
            
            {/* Side Navigation */}
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                data-testid="button-previous"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            
            {currentIndex < images.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                data-testid="button-next"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Info Panel */}
          {showInfo && (
            <div className="absolute bottom-24 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-4 max-w-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  {SEASON_ICONS[currentImage.season]}
                  <span className="font-medium">{currentImage.season.charAt(0).toUpperCase() + currentImage.season.slice(1)}</span>
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
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent">
            {/* Timeline */}
            <div className="px-4 pb-2">
              <div 
                className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
                onClick={handleTimelineClick}
                data-testid="timeline-bar"
              >
                {/* Timeline segments by season */}
                <div className="absolute inset-0 flex rounded-full overflow-hidden">
                  {images.map((img, idx) => {
                    const width = 100 / images.length;
                    return (
                      <div
                        key={idx}
                        className={cn("h-full transition-opacity", SEASON_COLORS[img.season])}
                        style={{ width: `${width}%`, opacity: idx <= currentIndex ? 1 : 0.3 }}
                      />
                    );
                  })}
                </div>
                
                {/* Progress indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-300"
                  style={{ left: `${getTimelinePosition(currentIndex)}%` }}
                />
                
                {/* Month markers */}
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-white/50">
                  {images.filter((_, idx) => idx % Math.ceil(images.length / 6) === 0).map((img, idx) => (
                    <span key={idx}>{MONTHS[img.month - 1].slice(0, 3)}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between px-4 py-3 mt-8">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="text-white hover:bg-white/20 disabled:opacity-50"
                  data-testid="button-skip-back"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(prev => !prev)}
                  className="text-white hover:bg-white/20"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentIndex === images.length - 1}
                  className="text-white hover:bg-white/20 disabled:opacity-50"
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

                {/* Period Range Display */}
                <div className="text-white/70 text-sm">
                  {formatPeriod(startPeriod.month, startPeriod.half)} - {formatPeriod(endPeriod.month, endPeriod.half)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}