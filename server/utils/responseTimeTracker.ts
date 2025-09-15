/**
 * API Response Time Tracker
 * Tracks the last N API request response times for monitoring
 */

export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

export class ResponseTimeTracker {
  private metrics: RequestMetrics[] = [];
  private readonly maxMetrics: number;
  private totalRequests: number = 0;
  private totalResponseTime: number = 0;
  private startTime: Date = new Date();

  constructor(maxMetrics: number = 100) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Record a new request metric
   */
  record(metric: Omit<RequestMetrics, 'timestamp'>): void {
    const fullMetric: RequestMetrics = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);
    this.totalRequests++;
    this.totalResponseTime += metric.responseTime;

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      const removed = this.metrics.shift();
      if (removed) {
        // Don't subtract from total, as we want lifetime stats
      }
    }
  }

  /**
   * Get statistics about response times
   */
  getStats(): {
    totalRequests: number;
    recentRequests: number;
    avgResponseTime: number;
    recentAvgResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    slowestEndpoints: Array<{ path: string; avgTime: number }>;
    errorRate: number;
    uptime: number;
  } {
    const recentResponseTimes = this.metrics.map(m => m.responseTime);
    const sortedTimes = [...recentResponseTimes].sort((a, b) => a - b);
    
    // Calculate percentiles
    const p50 = this.getPercentile(sortedTimes, 50);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    // Calculate average response time for recent requests
    const recentAvg = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, time) => sum + time, 0) / recentResponseTimes.length
      : 0;

    // Calculate overall average
    const overallAvg = this.totalRequests > 0
      ? this.totalResponseTime / this.totalRequests
      : 0;

    // Find slowest endpoints
    const endpointTimes = new Map<string, number[]>();
    this.metrics.forEach(m => {
      const times = endpointTimes.get(m.path) || [];
      times.push(m.responseTime);
      endpointTimes.set(m.path, times);
    });

    const slowestEndpoints = Array.from(endpointTimes.entries())
      .map(([path, times]) => ({
        path,
        avgTime: times.reduce((sum, t) => sum + t, 0) / times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Calculate error rate
    const errorCount = this.metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = this.metrics.length > 0
      ? (errorCount / this.metrics.length) * 100
      : 0;

    // Calculate uptime in seconds
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    return {
      totalRequests: this.totalRequests,
      recentRequests: this.metrics.length,
      avgResponseTime: Math.round(overallAvg),
      recentAvgResponseTime: Math.round(recentAvg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      slowestEndpoints,
      errorRate: Math.round(errorRate * 100) / 100,
      uptime
    };
  }

  /**
   * Get recent request metrics
   */
  getRecentMetrics(limit: number = 10): RequestMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    // Don't reset totals - we want lifetime stats
  }

  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Create Express middleware for tracking response times
   */
  middleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const responseTime = Date.now() - startTime;
        
        // Skip health check endpoints to avoid circular dependency
        if (!req.path?.includes('/health')) {
          this.record({
            method: req.method,
            path: req.path || req.url,
            statusCode: res.statusCode,
            responseTime
          });
        }
        
        // Call original end
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }
}

// Singleton instance
export const responseTimeTracker = new ResponseTimeTracker(100);