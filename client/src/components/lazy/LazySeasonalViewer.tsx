import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load the heavy SeasonalViewer component
const SeasonalViewer = lazy(() => import('@/components/garden/seasonal-viewer'));

interface LazySeasonalViewerProps {
  isOpen: boolean;
  onClose: () => void;
  gardenName: string;
  gardenId: string;
  images: any[];
  dateRange: any;
  additionalRanges?: any[];
  onAddDateRange?: (startDay: number, endDay: number) => void;
  onImagesGenerated?: (newImages: any[]) => void;
}

export default function LazySeasonalViewer(props: LazySeasonalViewerProps) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <Suspense 
      fallback={
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-8 shadow-xl">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-muted-foreground">Loading seasonal viewer...</p>
          </div>
        </div>
      }
    >
      <SeasonalViewer {...props} />
    </Suspense>
  );
}