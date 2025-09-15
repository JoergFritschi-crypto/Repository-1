/**
 * Retry utilities for handling network failures and API errors
 * Provides exponential backoff, circuit breaker, and error classification
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxAttempts?: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class NetworkError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Determines if an error is recoverable and should be retried
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' ||
      error.code === 'EPIPE' || error.code === 'EHOSTUNREACH') {
    return true;
  }

  // Supabase/HTTP errors
  if (error.status) {
    // 5xx errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    // 429 Too Many Requests is retryable with delay
    if (error.status === 429) {
      return true;
    }
    // 408 Request Timeout is retryable
    if (error.status === 408) {
      return true;
    }
  }

  // Check error message for known retryable patterns
  const message = error.message?.toLowerCase() || '';
  const retryablePatterns = [
    'timeout',
    'network',
    'connection',
    'econnreset',
    'socket hang up',
    'service unavailable',
    'internal server error',
    'bad gateway',
    'gateway timeout'
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Calculate delay for exponential backoff with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // Exponential backoff with jitter to prevent thundering herd
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Extract retry-after header from error response
 */
export function getRetryAfterDelay(error: any): number | null {
  // Check for Retry-After header
  const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
  
  if (!retryAfter) return null;

  // If it's a number, assume it's seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // If it's a date string, calculate delay
  const retryDate = new Date(retryAfter);
  if (!isNaN(retryDate.getTime())) {
    const delay = retryDate.getTime() - Date.now();
    return delay > 0 ? delay : null;
  }

  return null;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    timeout = 30000,
    onRetry
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(`Operation timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between the actual operation and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error: any) {
      lastError = error;

      // If it's the last attempt, throw the error
      if (attempt > maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate delay
      let delay: number;
      
      // Check for rate limit with retry-after
      if (error.status === 429 || error instanceof RateLimitError) {
        const retryAfterDelay = getRetryAfterDelay(error);
        if (retryAfterDelay) {
          delay = Math.min(retryAfterDelay, maxDelay);
        } else {
          // Use exponential backoff if no retry-after header
          delay = calculateBackoffDelay(attempt, baseDelay * 2, maxDelay);
        }
      } else {
        delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Log retry attempt
      console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms. Error: ${error.message}`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Circuit Breaker implementation to prevent cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private halfOpenAttempts: number = 0;
  private successCount: number = 0;

  constructor(private options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      halfOpenMaxAttempts: 3,
      ...options
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        console.log('⚡ Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= (this.options.resetTimeout || 60000);
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= (this.options.halfOpenMaxAttempts || 3)) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        console.log('✅ Circuit breaker is now CLOSED (recovered)');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.log('🔴 Circuit breaker is now OPEN (half-open test failed)');
    } else if (this.failureCount >= (this.options.failureThreshold || 5)) {
      this.state = CircuitState.OPEN;
      console.log(`🔴 Circuit breaker is now OPEN (${this.failureCount} failures)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get comprehensive status information for health checks
   */
  getStatus(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
    timeSinceLastFailure: number | null;
    threshold: number;
    isHealthy: boolean;
  } {
    const timeSinceLastFailure = this.lastFailureTime 
      ? Date.now() - this.lastFailureTime 
      : null;
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      timeSinceLastFailure,
      threshold: this.options.failureThreshold || 5,
      isHealthy: this.state === CircuitState.CLOSED
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
    this.successCount = 0;
    console.log('🔄 Circuit breaker manually reset');
  }
}

/**
 * Create a resilient wrapper for any async function
 */
export function createResilientOperation<T>(
  name: string,
  operation: () => Promise<T>,
  circuitBreaker?: CircuitBreaker,
  retryOptions?: RetryOptions
): () => Promise<T> {
  return async () => {
    const wrappedOperation = async () => {
      if (circuitBreaker) {
        return circuitBreaker.execute(operation);
      }
      return operation();
    };

    try {
      return await withRetry(wrappedOperation, {
        ...retryOptions,
        onRetry: (attempt, error) => {
          console.log(`🔄 [${name}] Retry attempt ${attempt}: ${error.message}`);
          retryOptions?.onRetry?.(attempt, error);
        }
      });
    } catch (error: any) {
      console.error(`❌ [${name}] Operation failed after retries:`, error.message);
      throw error;
    }
  };
}

/**
 * Batch operations with retry logic
 */
export async function batchWithRetry<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    retryOptions?: RetryOptions;
    onItemError?: (item: T, error: Error) => void;
  } = {}
): Promise<{ success: R[]; failed: { item: T; error: Error }[] }> {
  const { batchSize = 5, retryOptions, onItemError } = options;
  const success: R[] = [];
  const failed: { item: T; error: Error }[] = [];

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await withRetry(() => operation(item), retryOptions);
          success.push(result);
        } catch (error: any) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          failed.push({ item, error: errorObj });
          if (onItemError) {
            onItemError(item, errorObj);
          }
        }
      })
    );
  }

  return { success, failed };
}