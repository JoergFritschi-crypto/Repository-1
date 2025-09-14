/**
 * Performance monitoring utilities for development and production
 */

interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Enable performance monitoring in development
    this.enabled = import.meta.env.MODE === 'development';
  }

  /**
   * Start a performance measurement
   */
  startMark(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const mark: PerformanceMark = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.marks.set(name, mark);
    
    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(`${name}-start`);
    }
  }

  /**
   * End a performance measurement
   */
  endMark(name: string): number | null {
    if (!this.enabled) return null;

    const mark = this.marks.get(name);
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`);
      return null;
    }

    mark.endTime = performance.now();
    mark.duration = mark.endTime - mark.startTime;

    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(`${name}-end`);
      window.performance.measure(name, `${name}-start`, `${name}-end`);
    }

    // Log slow operations (> 100ms) in development
    if (mark.duration > 100) {
      console.warn(
        `⚠️ Slow operation detected: ${name} took ${mark.duration.toFixed(2)}ms`,
        mark.metadata
      );
    }

    this.marks.delete(name);
    return mark.duration;
  }

  /**
   * Measure a function's execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startMark(name, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endMark(name);
    }
  }

  /**
   * Measure a function's execution time (sync)
   */
  measure<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startMark(name, metadata);
    try {
      const result = fn();
      return result;
    } finally {
      this.endMark(name);
    }
  }

  /**
   * Log Cumulative Layout Shift (CLS)
   */
  observeCLS(): void {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('hadRecentInput' in entry && !(entry as any).hadRecentInput) {
            const cls = (entry as any).value;
            if (cls > 0.1) {
              console.warn(`⚠️ High CLS detected: ${cls.toFixed(3)}`);
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // PerformanceObserver might not be available
    }
  }

  /**
   * Log First Contentful Paint (FCP) and Largest Contentful Paint (LCP)
   */
  observePaintMetrics(): void {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log(`FCP: ${entry.startTime.toFixed(2)}ms`);
          } else if (entry.entryType === 'largest-contentful-paint') {
            console.log(`LCP: ${entry.startTime.toFixed(2)}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    } catch (e) {
      // PerformanceObserver might not be available
    }
  }

  /**
   * Get all performance entries
   */
  getEntries(): PerformanceEntry[] {
    if (typeof window === 'undefined' || !window.performance?.getEntriesByType) {
      return [];
    }
    return window.performance.getEntriesByType('measure');
  }

  /**
   * Clear all marks and measures
   */
  clear(): void {
    this.marks.clear();
    if (typeof window !== 'undefined' && window.performance?.clearMarks) {
      window.performance.clearMarks();
      window.performance.clearMeasures();
    }
  }

  /**
   * Get a summary of recent performance metrics
   */
  getSummary(): Record<string, any> {
    const entries = this.getEntries();
    const summary: Record<string, any> = {
      totalMeasurements: entries.length,
      measurements: entries.map(entry => ({
        name: entry.name,
        duration: entry.duration.toFixed(2),
        startTime: entry.startTime.toFixed(2)
      }))
    };

    return summary;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize observers if in browser
if (typeof window !== 'undefined') {
  performanceMonitor.observeCLS();
  performanceMonitor.observePaintMetrics();
}

/**
 * React hook for performance monitoring
 */
export function usePerformance(componentName: string) {
  return {
    startMark: (operation: string) => 
      performanceMonitor.startMark(`${componentName}.${operation}`),
    endMark: (operation: string) => 
      performanceMonitor.endMark(`${componentName}.${operation}`),
    measure: <T>(operation: string, fn: () => T) =>
      performanceMonitor.measure(`${componentName}.${operation}`, fn),
    measureAsync: <T>(operation: string, fn: () => Promise<T>) =>
      performanceMonitor.measureAsync(`${componentName}.${operation}`, fn)
  };
}

/**
 * Debounce utility for search and input handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle utility for scroll and resize handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize utility for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}