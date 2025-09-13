import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Flower2,
  Leaf,
  TreePine,
  Sun,
  Snowflake,
  Sparkles,
  Clock,
  Zap,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfYear, isLeapYear } from 'date-fns';

interface SeasonalDateSelectorProps {
  onDateRangeSelected: (startDay: number, endDay: number) => void;
  isLoading?: boolean;
  className?: string;
}

// Seasonal suggestions with day ranges
const SEASONAL_SUGGESTIONS = [
  {
    name: "Spring Awakening",
    icon: <Flower2 className="h-4 w-4" />,
    startDay: 60,  // Early March
    endDay: 150,   // Late May
    description: "Early blooms and fresh growth"
  },
  {
    name: "Peak Bloom",
    icon: <Sparkles className="h-4 w-4" />,
    startDay: 105, // Mid April
    endDay: 165,   // Mid June
    description: "Maximum flowering season"
  },
  {
    name: "Summer Glory",
    icon: <Sun className="h-4 w-4" />,
    startDay: 150, // Late May
    endDay: 240,   // Late August
    description: "Full summer growth and blooms"
  },
  {
    name: "Fall Colors",
    icon: <Leaf className="h-4 w-4" />,
    startDay: 240, // Late August
    endDay: 320,   // Mid November
    description: "Autumn foliage display"
  },
  {
    name: "Winter Structure",
    icon: <TreePine className="h-4 w-4" />,
    startDay: 320, // Mid November
    endDay: 60,    // Early March (wraps around)
    description: "Garden bones and evergreens"
  },
  {
    name: "Full Year",
    icon: <Clock className="h-4 w-4" />,
    startDay: 1,
    endDay: 365,
    description: "Complete seasonal cycle"
  }
];

// Month boundaries (approximate day of year for start of each month)
const MONTH_BOUNDARIES = [
  { name: 'Jan', day: 1 },
  { name: 'Feb', day: 32 },
  { name: 'Mar', day: 60 },
  { name: 'Apr', day: 91 },
  { name: 'May', day: 121 },
  { name: 'Jun', day: 152 },
  { name: 'Jul', day: 182 },
  { name: 'Aug', day: 213 },
  { name: 'Sep', day: 244 },
  { name: 'Oct', day: 274 },
  { name: 'Nov', day: 305 },
  { name: 'Dec', day: 335 }
];

// Helper Functions

/**
 * Convert day of year to readable date
 */
function dayOfYearToDate(day: number, year: number = new Date().getFullYear()): Date {
  const startDate = startOfYear(new Date(year, 0, 1));
  return addDays(startDate, day - 1);
}

/**
 * Convert date to day of year
 */
function dateToDayOfYear(date: Date): number {
  const startDate = startOfYear(date);
  const diffInMs = date.getTime() - startDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  return diffInDays + 1;
}

/**
 * Get month name from day of year
 */
function getMonthFromDay(day: number): string {
  const date = dayOfYearToDate(day);
  return format(date, 'MMM');
}

/**
 * Calculate the number of days between two day-of-year values
 * Handles wrap-around for winter ranges
 */
function calculateDaysBetween(startDay: number, endDay: number): number {
  if (endDay >= startDay) {
    return endDay - startDay + 1;
  } else {
    // Handle wrap-around (e.g., Nov to March)
    return (365 - startDay + 1) + endDay;
  }
}

/**
 * Format date range display
 */
function formatDateRange(startDay: number, endDay: number, year: number = new Date().getFullYear()): string {
  const startDate = dayOfYearToDate(startDay, year);
  const endDate = dayOfYearToDate(endDay, year);
  
  // If it's a wrap-around range, show it clearly
  if (endDay < startDay) {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')} (+1 year)`;
  }
  
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
}

export default function SeasonalDateSelector({ 
  onDateRangeSelected, 
  isLoading = false, 
  className 
}: SeasonalDateSelectorProps) {
  // Slider values (always ascending for UI consistency)
  const [sliderRange, setSliderRange] = useState<[number, number]>([105, 165]); // Default: Peak Bloom
  
  // Semantic range (can wrap around for winter ranges)
  const [semanticRange, setSemanticRange] = useState<[number, number]>([105, 165]);
  
  // Track if current range wraps around year boundary
  const [isWrapAround, setIsWrapAround] = useState<boolean>(false);
  
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);

  // Calculate derived values from semantic range
  const [startDay, endDay] = semanticRange;
  const dayCount = calculateDaysBetween(startDay, endDay);
  const dateRangeText = formatDateRange(startDay, endDay);

  // Convert slider values to semantic range
  const sliderToSemantic = useCallback((sliderValues: [number, number], forceWrapAround: boolean = false): { semantic: [number, number], isWrap: boolean } => {
    const [low, high] = sliderValues;
    
    // Check if this should be interpreted as wrap-around
    // This happens when:
    // 1. Explicitly forced (from preset)
    // 2. The range is very large (>300 days) suggesting wrap-around intent
    // 3. The high value is in winter and low value is also in winter/spring
    const isLikelyWrapAround = forceWrapAround || 
      (high - low > 300) || 
      (high > 300 && low < 100); // Nov+ to Jan-Mar
    
    if (isLikelyWrapAround && !forceWrapAround) {
      // Convert to wrap-around: high becomes start, low becomes end
      return { semantic: [high, low], isWrap: true };
    }
    
    return { semantic: [low, high], isWrap: false };
  }, []);
  
  // Convert semantic range to slider values (always ascending)
  const semanticToSlider = useCallback((semantic: [number, number], isWrap: boolean): [number, number] => {
    if (isWrap) {
      // For wrap-around, we need to show the range in ascending order on the slider
      // The visual timeline will handle showing two segments
      return [semantic[1], semantic[0]]; // [endDay, startDay] sorted ascending
    }
    return semantic;
  }, []);

  // Handle slider change
  const handleSliderChange = useCallback((values: number[]) => {
    if (values.length === 2) {
      const newSliderRange: [number, number] = [values[0], values[1]];
      const { semantic, isWrap } = sliderToSemantic(newSliderRange);
      
      setSliderRange(newSliderRange);
      setSemanticRange(semantic);
      setIsWrapAround(isWrap);
    }
  }, [sliderToSemantic]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: typeof SEASONAL_SUGGESTIONS[0]) => {
    const suggestedSemantic: [number, number] = [suggestion.startDay, suggestion.endDay];
    const suggestedIsWrap = suggestion.endDay < suggestion.startDay;
    const suggestedSlider = semanticToSlider(suggestedSemantic, suggestedIsWrap);
    
    setSemanticRange(suggestedSemantic);
    setIsWrapAround(suggestedIsWrap);
    setSliderRange(suggestedSlider);
  }, [semanticToSlider]);

  // Handle generate button click
  const handleGenerate = useCallback(() => {
    onDateRangeSelected(startDay, endDay);
  }, [onDateRangeSelected, startDay, endDay]);

  // Calculate position for month markers
  const getMarkerPosition = (day: number) => {
    return ((day - 1) / 364) * 100; // 364 days for 0-100% range
  };

  return (
    <Card className={cn("w-full", className)} data-testid="seasonal-date-selector">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Calendar className="h-5 w-5" />
          Select Date Range for Garden Visualization
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Date Range Display */}
        <div className="text-center space-y-2">
          <div className="text-2xl font-semibold text-primary">
            {dateRangeText}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{dayCount} days selected</span>
            {isWrapAround && (
              <Badge variant="outline" className="ml-2 border-amber-400 text-amber-600 dark:text-amber-400">
                <Snowflake className="h-3 w-3 mr-1" />
                Winter range
              </Badge>
            )}
            {dayCount >= 90 && dayCount <= 120 && (
              <Badge variant="secondary" className="ml-2">
                Optimal range
              </Badge>
            )}
          </div>
        </div>

        {/* Timeline with Month Markers */}
        <div className="space-y-4">
          {/* Month Labels */}
          <div className="relative">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              {MONTH_BOUNDARIES.map((month) => (
                <span 
                  key={month.name}
                  className="text-center"
                  style={{ 
                    position: 'absolute',
                    left: `${getMarkerPosition(month.day)}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {month.name}
                </span>
              ))}
            </div>
          </div>

          {/* Month Markers */}
          <div className="relative h-6">
            {MONTH_BOUNDARIES.map((month) => (
              <div
                key={month.name}
                className="absolute w-px h-6 bg-border"
                style={{ left: `${getMarkerPosition(month.day)}%` }}
              />
            ))}
          </div>

          {/* Range Slider */}
          <div className="px-2 space-y-2">
            <Slider
              value={sliderRange}
              onValueChange={handleSliderChange}
              min={1}
              max={365}
              step={1}
              className="w-full"
              data-testid="date-range-slider"
            />
            {isWrapAround && (
              <div className="text-xs text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1">
                <Snowflake className="h-3 w-3" />
                <span>Winter range spans year boundary</span>
              </div>
            )}
          </div>

          {/* Season Indicators with Current Range Highlight */}
          <div className="relative h-2 rounded-full overflow-hidden bg-muted">
            {/* Background season colors */}
            <div className="absolute h-full bg-green-400" style={{ left: '16%', width: '25%' }} />
            <div className="absolute h-full bg-yellow-400" style={{ left: '41%', width: '25%' }} />
            <div className="absolute h-full bg-orange-400" style={{ left: '66%', width: '25%' }} />
            <div className="absolute h-full bg-blue-400" style={{ left: '0%', width: '16%' }} />
            <div className="absolute h-full bg-blue-400" style={{ left: '91%', width: '9%' }} />
            
            {/* Current range highlight */}
            {isWrapAround ? (
              // Two segments for wrap-around ranges
              <>
                <div 
                  className="absolute h-full bg-primary/60 border-t-2 border-b-2 border-primary" 
                  style={{ 
                    left: `${getMarkerPosition(startDay)}%`, 
                    width: `${100 - getMarkerPosition(startDay)}%` 
                  }} 
                />
                <div 
                  className="absolute h-full bg-primary/60 border-t-2 border-b-2 border-primary" 
                  style={{ 
                    left: '0%', 
                    width: `${getMarkerPosition(endDay)}%` 
                  }} 
                />
              </>
            ) : (
              // Single segment for normal ranges
              <div 
                className="absolute h-full bg-primary/60 border-t-2 border-b-2 border-primary" 
                style={{ 
                  left: `${getMarkerPosition(startDay)}%`, 
                  width: `${getMarkerPosition(endDay) - getMarkerPosition(startDay)}%` 
                }} 
              />
            )}
          </div>
        </div>

        <Separator />

        {/* Quick Select Suggestions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Quick Select:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SEASONAL_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion.name}
                variant="outline"
                size="sm"
                className={cn(
                  "h-auto p-3 flex flex-col items-center gap-2 text-center transition-all duration-200",
                  "hover:bg-canary hover:text-primary hover:border-gold",
                  // Highlight if this suggestion matches current selection
                  (startDay === suggestion.startDay && endDay === suggestion.endDay) &&
                  "bg-canary/20 border-gold text-primary"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setHoveredSuggestion(suggestion.name)}
                onMouseLeave={() => setHoveredSuggestion(null)}
                data-testid={`suggestion-${suggestion.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-1">
                  {suggestion.icon}
                  <span className="text-xs font-medium">{suggestion.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {suggestion.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Generate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            size="lg"
            className="bg-primary hover:bg-canary hover:text-primary border-2 border-gold/30 hover:border-gold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
            data-testid="button-generate-seasonal-images"
          >
            {isLoading ? (
              <>
                <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                Generating Images...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Generate Seasonal Images
              </>
            )}
          </Button>
        </div>

        {/* Info Text */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Select a date range to generate seasonal garden visualizations</p>
          <p className="mt-1">Longer ranges provide more seasonal variety but take more time to generate</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Export helper functions for use in other components
export {
  dayOfYearToDate,
  dateToDayOfYear,
  getMonthFromDay,
  calculateDaysBetween,
  formatDateRange,
  SEASONAL_SUGGESTIONS,
  MONTH_BOUNDARIES
};