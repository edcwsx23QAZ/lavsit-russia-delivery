export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class ApiTimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

export async function apiRequestWithTimeout(
  url: string,
  options: RequestInit = {},
  config: ApiRequestConfig = {}
): Promise<Response> {
  const { timeout = 10000 } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestOptions: RequestInit = {
    ...options,
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, requestOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiTimeoutError(`Request timeout after ${timeout}ms`, timeout);
    }

    throw error;
  }
}

/**
 * Enhanced API request with comprehensive error handling and caching
 */
export async function enhancedApiRequest(
  url: string,
  options: RequestInit = {},
  context: { operation: string; company?: string },
  retryConfig?: Partial<{ maxRetries: number; baseDelay: number }>
) {
  const { apiRequestWithErrorHandling } = await import('./error-handling');

  return apiRequestWithErrorHandling(
    url,
    options,
    context,
    retryConfig,
    `${context.company || 'unknown'}_${context.operation}_${JSON.stringify(options.body || {})}`
  );
}

export function validateApiInput(data: any, rules: Record<string, (value: any) => string | null>): void {
  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(data[field]);
    if (error) {
      throw new ApiValidationError(error, field);
    }
  }
}

// Common validation rules
export const validationRules = {
  required: (field: string) => (value: any) => 
    value == null || value === '' ? `${field} is required` : null,
  
  minLength: (field: string, min: number) => (value: string) =>
    value && value.length < min ? `${field} must be at least ${min} characters` : null,
  
  maxLength: (field: string, max: number) => (value: string) =>
    value && value.length > max ? `${field} must be less than ${max} characters` : null,
  
  number: (field: string) => (value: any) =>
    value != null && isNaN(Number(value)) ? `${field} must be a number` : null,
  
  positive: (field: string) => (value: number) =>
    value != null && value <= 0 ? `${field} must be positive` : null,
  
  email: (field: string) => (value: string) =>
    value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `${field} must be a valid email` : null,
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();
  
  static startMeasurement(key: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMeasurement(key, duration);
      return duration;
    };
  }
  
  static recordMeasurement(key: string, duration: number): void {
    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }
    const measurements = this.measurements.get(key)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements to prevent memory leaks
    if (measurements.length > 100) {
      measurements.shift();
    }
  }
  
  static getAverageTime(key: string): number {
    const measurements = this.measurements.get(key) || [];
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }
  
  static getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const metrics: Record<string, { average: number; count: number; latest: number }> = {};
    
    this.measurements.forEach((measurements, key) => {
      if (measurements.length > 0) {
        const average = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
        metrics[key] = {
          average: Math.round(average * 100) / 100,
          count: measurements.length,
          latest: Math.round(measurements[measurements.length - 1] * 100) / 100,
        };
      }
    });
    
    return metrics;
  }
  
  static clearMetrics(): void {
    this.measurements.clear();
  }
}