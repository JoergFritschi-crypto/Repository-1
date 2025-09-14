import { useRef, useEffect, useState, useCallback, memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number; // Height of each item in pixels
  containerHeight: number; // Height of the scroll container
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number; // Number of items to render outside viewport
  className?: string;
  gap?: number; // Gap between items in pixels
  columns?: number; // Number of columns for grid layout
  onScroll?: (scrollTop: number) => void;
  scrollRestorationKey?: string; // Key to restore scroll position
}

function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className,
  gap = 0,
  columns = 1,
  onScroll,
  scrollRestorationKey
}: VirtualScrollProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate dimensions
  const rowHeight = itemHeight + gap;
  const itemsPerRow = columns;
  const totalRows = Math.ceil(items.length / itemsPerRow);
  const totalHeight = totalRows * rowHeight - gap; // Subtract last gap

  // Calculate visible range
  const visibleRowStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleRowEnd = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleItemStart = visibleRowStart * itemsPerRow;
  const visibleItemEnd = Math.min(items.length, visibleRowEnd * itemsPerRow);
  const visibleItems = items.slice(visibleItemStart, visibleItemEnd);

  // Restore scroll position
  useEffect(() => {
    if (scrollRestorationKey && scrollContainerRef.current) {
      const savedPosition = sessionStorage.getItem(`scroll-${scrollRestorationKey}`);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        scrollContainerRef.current.scrollTop = position;
        setScrollTop(position);
      }
    }
  }, [scrollRestorationKey]);

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);
    
    // Set scrolling state
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set new timeout to detect when scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Save scroll position
    if (scrollRestorationKey) {
      sessionStorage.setItem(`scroll-${scrollRestorationKey}`, newScrollTop.toString());
    }

    onScroll?.(newScrollTop);
  }, [scrollRestorationKey, onScroll]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  const offsetY = visibleRowStart * rowHeight;

  return (
    <div
      ref={scrollContainerRef}
      className={cn('overflow-auto relative', className)}
      style={{ height: containerHeight }}
    >
      {/* Total height container to maintain scrollbar */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            willChange: isScrolling ? 'transform' : 'auto'
          }}
          className={columns > 1 ? 'grid' : ''}
          {...(columns > 1 && {
            style: {
              transform: `translateY(${offsetY}px)`,
              willChange: isScrolling ? 'transform' : 'auto',
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: `${gap}px`
            }
          })}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleItemStart + index}
              style={{
                height: itemHeight,
                ...(columns === 1 && gap > 0 && index < visibleItems.length - 1 
                  ? { marginBottom: gap } 
                  : {})
              }}
            >
              {renderItem(item, visibleItemStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MemoizedVirtualScroll = memo(VirtualScroll) as typeof VirtualScroll;

export default MemoizedVirtualScroll;

// Hook for window-based virtual scrolling
export function useVirtualWindowScroll<T>({
  items,
  itemHeight,
  overscan = 3,
  gap = 0,
  columns = 1
}: {
  items: T[];
  itemHeight: number;
  overscan?: number;
  gap?: number;
  columns?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 1000
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    handleScroll();
    handleResize();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const rowHeight = itemHeight + gap;
  const itemsPerRow = columns;
  const totalRows = Math.ceil(items.length / itemsPerRow);

  const visibleRowStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleRowEnd = Math.min(
    totalRows,
    Math.ceil((scrollTop + windowHeight) / rowHeight) + overscan
  );

  const visibleItemStart = visibleRowStart * itemsPerRow;
  const visibleItemEnd = Math.min(items.length, visibleRowEnd * itemsPerRow);

  return {
    visibleItems: items.slice(visibleItemStart, visibleItemEnd),
    visibleItemStart,
    visibleItemEnd,
    totalHeight: totalRows * rowHeight - gap,
    offsetY: visibleRowStart * rowHeight
  };
}