import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the heavy PlantAdvancedSearch component
const PlantAdvancedSearch = lazy(() => import('@/components/plant/plant-advanced-search'));

interface LazyPlantAdvancedSearchProps {
  onSearch: (filters: any) => void;
  filters: any;
  mode?: 'full' | 'collection';
}

export default function LazyPlantAdvancedSearch(props: LazyPlantAdvancedSearchProps) {
  return (
    <Suspense 
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-32" />
        </div>
      }
    >
      <PlantAdvancedSearch {...props} />
    </Suspense>
  );
}