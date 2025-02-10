/**
 * API Configuration
 * Configures the API client with enhanced security, monitoring, and reliability features
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import {
  API_VERSION,
  BASE_URL,
  API_TIMEOUT,
  API_ENDPOINTS,
  HTTP_STATUS,
  ERROR_CODES,
  REQUEST_CONFIG,
  RATE_LIMITS
} from '../constants/api.constants';

// Default headers with security best practices
const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-API-Version': API_VERSION,
  'X-Request-ID': '', // Will be set per request
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 30000,
  monitorInterval: 5000,
  healthCheckEndpoint: '/health'
};

// Rate limiting configuration (requests per minute)
const RATE_LIMIT_CONFIG = {
  formula: RATE_LIMITS.FORMULA_SUGGESTIONS,
  data: RATE_LIMITS.DATA_CLEANING,
  version: RATE_LIMITS.VERSION_HISTORY
};

// Retry configuration with exponential backoff
const RETRY_CONFIG = {
  maxRetries: REQUEST_CONFIG.RETRY_DELAY,
  retryDelay: REQUEST_CONFIG.RETRY_DELAY,
  backoffFactor: REQUEST_CONFIG.RETRY_MULTIPLIER,
  maxRetryDelay: REQUEST_CONFIG.MAX_TIMEOUT,
  shouldResetTimeout: true,
  retryableHttpCodes: [
    HTTP_STATUS.TOO_MANY_REQUESTS,
    HTTP_STATUS.SERVER_ERROR,
    HTTP_STATUS.SERVICE_UNAVAILABLE
  ]
};

/**
 * Circuit breaker implementation for API requests
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private isOpen: boolean = false;

  constructor(private config = CIRCUIT_BREAKER_CONFIG) {}

  public async executeRequest<T>(request: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.reset();
      } else {
        throw new Error(ERROR_CODES.NETWORK_ERROR);
      }
    }

    try {
      const result = await request();
      this.reset();
      return result;
    } catch (error) {
      this.handleFailure();
      throw error;
    }
  }

  private handleFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.isOpen = true;
    }
  }

  private reset(): void {
    this.failures = 0;
    this.isOpen = false;
  }
}

/**
 * Rate limiter implementation for API requests
 */
class RateLimiter {
  private requests: { [key: string]: number[] } = {};

  public checkLimit(endpoint: string): boolean {
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const limit = this.getLimitForEndpoint(endpoint);

    if (!this.requests[endpoint]) {
      this.requests[endpoint] = [];
    }

    // Remove old requests
    this.requests[endpoint] = this.requests[endpoint].filter(
      time => now - time < windowSize
    );

    if (this.requests[endpoint].length >= limit) {
      return false;
    }

    this.requests[endpoint].push(now);
    return true;
  }

  private getLimitForEndpoint(endpoint: string): number {
    if (endpoint.includes('/formula')) return RATE_LIMIT_CONFIG.formula;
    if (endpoint.includes('/data')) return RATE_LIMIT_CONFIG.data;
    if (endpoint.includes('/version')) return RATE_LIMIT_CONFIG.version;
    return RATE_LIMIT_CONFIG.formula; // Default limit
  }
}

/**
 * Creates and configures the API client with security and monitoring features
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: API_TIMEOUT,
    headers: DEFAULT_HEADERS,
    validateStatus: REQUEST_CONFIG.VALIDATE_STATUS
  });

  const circuitBreaker = new CircuitBreaker();
  const rateLimiter = new RateLimiter();

  // Request interceptor
  client.interceptors.request.use(
    async (config) => {
      // Generate request ID
      config.headers['X-Request-ID'] = crypto.randomUUID();

      // Check rate limit
      if (!rateLimiter.checkLimit(config.url || '')) {
        throw new Error(ERROR_CODES.RATE_LIMIT_ERROR);
      }

      // Add authentication token if available
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as AxiosRequestConfig & { _retry?: number };
      
      // Implement retry logic
      if (
        config &&
        config._retry !== undefined &&
        config._retry < RETRY_CONFIG.maxRetries &&
        RETRY_CONFIG.retryableHttpCodes.includes(error.response?.status || 0)
      ) {
        config._retry = (config._retry || 0) + 1;
        const delay = Math.min(
          RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffFactor, config._retry),
          RETRY_CONFIG.maxRetryDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(config);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Constructs and validates API endpoint URLs
 */
const getEndpoint = (path: string, params: Record<string, string> = {}): string => {
  // Validate path against known endpoints
  const isValidPath = Object.values(API_ENDPOINTS).some(
    category => Object.values(category).includes(path)
  );
  
  if (!isValidPath) {
    throw new Error('Invalid endpoint path');
  }

  // Replace path parameters and sanitize
  let endpoint = path;
  Object.entries(params).forEach(([key, value]) => {
    const sanitizedValue = encodeURIComponent(value);
    endpoint = endpoint.replace(`:${key}`, sanitizedValue);
  });

  return endpoint;
};

// Create API client instance
const apiClient = createApiClient();
const circuitBreaker = new CircuitBreaker();

// Export API configuration
export const apiConfig = {
  client: apiClient,
  getEndpoint,
  circuitBreaker,
  retryRequest: async <T>(request: () => Promise<T>): Promise<T> => {
    return circuitBreaker.executeRequest(request);
  }
};

// Helper function to get auth token (implementation depends on auth strategy)
async function getAuthToken(): Promise<string | null> {
  // Implementation would depend on authentication strategy
  return null;
}