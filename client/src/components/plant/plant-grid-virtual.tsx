import { memo, useCallback, useMemo } from 'react';
import VirtualScroll from '@/components/ui/virtual-scroll';
import { CompactPlantCard } from '@/components/plant/compact-plant-card';
import { EmptyState } from '@/components/ui/error-message';
import { Sprout } from 'lucide-react';
import type { Plant } from '@/types/plant';

interface PlantGridVirtualProps {
  plants: Plant[];
  isAdmin?: boolean;
  containerHeight?: number;
  columns?: number;
  itemHeight?: number;
  gap?: number;
  emptyMessage?: string;
  onClearFilters?: () => void;
}

const PlantGridVirtual = memo(function PlantGridVirtual({
  plants,
  isAdmin = false,
  containerHeight = 800,
  columns = 3,
  itemHeight = 460,
  gap = 16,
  emptyMessage = "No plants found",
  onClearFilters
}: PlantGridVirtualProps) {
  
  // Memoize the render function
  const renderPlant = useCallback((plant: Plant, index: number) => {
    return (
      <CompactPlantCard
        key={plant.id}
        plant={plant}
        isAdmin={isAdmin}
      />
    );
  }, [isAdmin]);

  // Responsive columns based on screen size
  const getResponsiveColumns = useCallback(() => {
    if (typeof window === 'undefined') return columns;
    
    const width = window.innerWidth;
    if (width < 768) return 1; // Mobile
    if (width < 1024) return 2; // Tablet
    return columns; // Desktop
  }, [columns]);

  const responsiveColumns = getResponsiveColumns();

  if (!plants || plants.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        message="Try adjusting your search criteria or clearing filters"
        icon={<Sprout className="w-8 h-8 text-muted-foreground" />}
        action={onClearFilters ? {
          label: "Clear Search & Filters",
          onClick: onClearFilters
        } : undefined}
      />
    );
  }

  return (
    <VirtualScroll
      items={plants}
      itemHeight={itemHeight}
      containerHeight={containerHeight}
      renderItem={renderPlant}
      overscan={2}
      gap={gap}
      columns={responsiveColumns}
      className="rounded-lg"
      scrollRestorationKey="plant-library-scroll"
    />
  );
});

PlantGridVirtual.displayName = 'PlantGridVirtual';

export default PlantGridVirtual;