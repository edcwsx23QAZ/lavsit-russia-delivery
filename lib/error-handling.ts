import { apiRequestWithTimeout } from './api-utils';

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface ErrorContext {
  operation: string;
  company?: string;
  requestId?: string;
  userId?: string;
  timestamp: string;
  retryCount?: number;
  userAgent?: string;
  url?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: ErrorType[];
}

export interface ErrorResult {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    userMessage: string;
    technicalDetails?: any;
    context: ErrorContext;
    retryable: boolean;
    suggestedAction?: string;
  };
  fallbackData?: any;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryableErrors: [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER, ErrorType.RATE_LIMIT]
};

// User-friendly error messages
const USER_MESSAGES = {
  [ErrorType.NETWORK]: 'Проблемы с подключением к интернету. Проверьте соединение и попробуйте снова.',
  [ErrorType.API]: 'Временные проблемы с сервисом транспортной компании. Попробуйте позже.',
  [ErrorType.VALIDATION]: 'Проверьте правильность введенных данных.',
  [ErrorType.TIMEOUT]: 'Сервис отвечает слишком долго. Попробуйте еще раз.',
  [ErrorType.RATE_LIMIT]: 'Слишком много запросов. Подождите немного и попробуйте снова.',
  [ErrorType.SERVER]: 'Временные технические проблемы. Попробуйте позже.',
  [ErrorType.UNKNOWN]: 'Произошла неожиданная ошибка. Попробуйте еще раз.'
};

// Suggested actions for different error types
const SUGGESTED_ACTIONS = {
  [ErrorType.NETWORK]: 'Проверьте интернет-соединение',
  [ErrorType.API]: 'Попробуйте выбрать другую транспортную компанию',
  [ErrorType.VALIDATION]: 'Проверьте корректность адресов и параметров груза',
  [ErrorType.TIMEOUT]: 'Попробуйте упростить запрос или выбрать меньшее количество грузов',
  [ErrorType.RATE_LIMIT]: 'Подождите 1-2 минуты перед следующим запросом',
  [ErrorType.SERVER]: 'Свяжитесь с поддержкой если проблема persists',
  [ErrorType.UNKNOWN]: 'Свяжитесь с поддержкой'
};

// Cache for storing successful results to provide fallbacks
class ResultCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMinutes: number = 30): void {
    const timestamp = Date.now();
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    this.cache.set(key, { data, timestamp, ttl });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const resultCache = new ResultCache();

// Clean up cache periodically
if (typeof window !== 'undefined') {
  setInterval(() => resultCache.cleanup(), 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Categorize error based on response or error object
 */
export function categorizeError(error: any, response?: Response): ErrorType {
  if (!navigator.onLine) return ErrorType.NETWORK;

  if (response) {
    if (response.status === 429) return ErrorType.RATE_LIMIT;
    if (response.status >= 400 && response.status < 500) return ErrorType.VALIDATION;
    if (response.status >= 500) return ErrorType.SERVER;
    if (response.status === 408 || response.status === 504) return ErrorType.TIMEOUT;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) return ErrorType.NETWORK;
  if (error.name === 'AbortError') return ErrorType.TIMEOUT;
  if (error.message?.includes('timeout')) return ErrorType.TIMEOUT;

  return ErrorType.UNKNOWN;
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
  return Math.min(delay + jitter, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute operation with retry logic and error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: Omit<ErrorContext, 'timestamp' | 'retryCount'>,
  retryConfig: Partial<RetryConfig> = {},
  cacheKey?: string
): Promise<T | ErrorResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const fullContext: ErrorContext = {
    ...context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  };

  // Check cache first for fallback data
  const cachedResult = cacheKey ? resultCache.get(cacheKey) : null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      fullContext.retryCount = attempt - 1;
      const result = await operation();

      // Cache successful results
      if (cacheKey && result) {
        resultCache.set(cacheKey, result);
      }

      return result;
    } catch (error: any) {
      const errorType = categorizeError(error, error.response);

      console.error(`[ErrorHandler] Attempt ${attempt}/${config.maxRetries + 1} failed:`, {
        error: error.message,
        type: errorType,
        context: fullContext
      });

      // If this is the last attempt or error is not retryable
      if (attempt > config.maxRetries || !config.retryableErrors.includes(errorType)) {
        const errorResult: ErrorResult = {
          success: false,
          error: {
            type: errorType,
            message: error.message || 'Unknown error',
            userMessage: USER_MESSAGES[errorType],
            technicalDetails: process.env.NODE_ENV === 'development' ? error : undefined,
            context: fullContext,
            retryable: config.retryableErrors.includes(errorType),
            suggestedAction: SUGGESTED_ACTIONS[errorType]
          }
        };

        // Add fallback data from cache if available
        if (cachedResult) {
          errorResult.fallbackData = cachedResult;
          errorResult.error.userMessage += ' Показаны последние актуальные данные.';
        }

        return errorResult;
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, config);
      console.log(`[ErrorHandler] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    error: {
      type: ErrorType.UNKNOWN,
      message: 'Unexpected error in retry logic',
      userMessage: USER_MESSAGES[ErrorType.UNKNOWN],
      context: fullContext,
      retryable: false
    }
  };
}

/**
 * Enhanced API request with error handling and caching
 */
export async function apiRequestWithErrorHandling(
  endpoint: string,
  options: RequestInit = {},
  context: Omit<ErrorContext, 'timestamp' | 'retryCount'>,
  retryConfig?: Partial<RetryConfig>,
  cacheKey?: string
): Promise<any | ErrorResult> {
  return withErrorHandling(
    () => apiRequestWithTimeout(endpoint, options),
    context,
    retryConfig,
    cacheKey
  );
}

/**
 * Graceful degradation helper for UI components
 * Note: This function is not currently used and would need to be moved to a .tsx file if implemented
 */
export function withGracefulDegradation<T>(
  Component: React.ComponentType<T>,
  FallbackComponent: React.ComponentType<{ error: ErrorResult }>
) {
  return function GracefulComponent(props: T) {
    // This would be used in error boundaries
    // For now, just return the original component
    return Component;
  };
}

// Error boundary component removed - should be implemented in a .tsx file if needed