import { memo, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/error-message';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import LazyImage from '@/components/ui/lazy-image';
import { Clock, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { Plant } from '@/types/plant';

interface RecentlyViewedPlantsProps {
  compact?: boolean;
  showTimestamp?: boolean;
  maxItems?: number;
  className?: string;
  onPlantClick?: (plant: any) => void;
}

const RecentlyViewedPlants = memo(({
  compact = false,
  showTimestamp = true,
  maxItems = 10,
  className = '',
  onPlantClick
}: RecentlyViewedPlantsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { recentlyViewed, clearRecentlyViewed, formatTimestamp } = useRecentlyViewed();
  
  // Fetch full plant data for recently viewed items
  const { data: plantsData, isLoading } = useQuery({
    queryKey: ['/api/plants/batch', recentlyViewed.map(p => p.id)],
    queryFn: async () => {
      if (recentlyViewed.length === 0) return [];
      
      // Import apiRequest dynamically to avoid circular dependency
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('POST', '/api/plants/batch', { 
        ids: recentlyViewed.slice(0, maxItems).map(p => p.id) 
      });
      
      return await response.json();
    },
    enabled: recentlyViewed.length > 0
  });

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280; // Width of one card plus gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  const handlePlantClick = useCallback((plant: any) => {
    if (onPlantClick) {
      onPlantClick(plant);
    }
  }, [onPlantClick]);

  const displayPlants = useMemo(() => 
    recentlyViewed.slice(0, maxItems),
    [recentlyViewed, maxItems]
  );

  if (recentlyViewed.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recently Viewed Plants
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState 
            message="No recently viewed plants yet"
            subMessage="Browse the plant library to start building your history"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recently Viewed Plants
            <Badge variant="secondary" className="text-xs">
              {recentlyViewed.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRecentlyViewed}
            className="text-xs text-muted-foreground hover:text-foreground"
            data-testid="button-clear-history"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear History
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {/* Left scroll button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/90 shadow-sm hover:bg-background hidden md:flex"
          onClick={() => handleScroll('left')}
          data-testid="button-scroll-left"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Right scroll button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/90 shadow-sm hover:bg-background hidden md:flex"
          onClick={() => handleScroll('right')}
          data-testid="button-scroll-right"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Scrollable container */}
        <div className="w-full overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex gap-3 pb-2 overflow-x-auto no-scrollbar md:px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitScrollbar: { display: 'none' } }}
          >
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: Math.min(3, recentlyViewed.length) }).map((_, i) => (
                <div key={i} className="flex-none w-[260px]">
                  <Card className="h-[120px]">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <Skeleton className="w-24 h-24 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-3 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            ) : (
              // Plant cards
              displayPlants.map((recentPlant) => {
                const fullPlant = plantsData?.find((p: Plant) => p.id === recentPlant.id);
                const plant = fullPlant || recentPlant;
                
                return (
                  <div key={plant.id} className="flex-none w-[260px]">
                    <Card 
                      className="h-[120px] hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handlePlantClick(plant)}
                      data-testid={`recent-plant-${plant.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3 h-full">
                          {/* Plant image */}
                          <div className="w-24 h-24 flex-none">
                            {plant.thumbnailImage ? (
                              <LazyImage
                                src={plant.thumbnailImage}
                                alt={plant.commonName || 'Plant'}
                                className="w-full h-full object-cover rounded-lg"
                                aspectRatio="1/1"
                                fadeIn={true}
                                rootMargin="50px"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                                <span className="text-3xl">🌿</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Plant info */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h4 className="font-medium text-sm truncate mb-1 max-w-full" data-testid={`text-plant-name-${plant.id}`}>
                              {plant.commonName}
                            </h4>
                            {plant.scientificName && (
                              <p className="text-xs text-muted-foreground italic truncate mb-2">
                                {plant.scientificName}
                              </p>
                            )}
                            {showTimestamp && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(recentPlant.timestamp)}
                              </p>
                            )}
                            {fullPlant && (
                              <div className="flex gap-1 mt-1">
                                {fullPlant.type && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {fullPlant.type}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

RecentlyViewedPlants.displayName = 'RecentlyViewedPlants';

export default RecentlyViewedPlants;