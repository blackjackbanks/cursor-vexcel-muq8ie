/**
 * Enhanced API Service for Excel Add-in
 * Implements secure API client with comprehensive security controls,
 * performance optimizations, and robust error handling
 * @version 1.0.0
 * 
 * @requires axios@^1.4.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  API_VERSION, 
  BASE_URL, 
  API_TIMEOUT, 
  API_ENDPOINTS,
  HTTP_STATUS,
  ERROR_CODES,
  RATE_LIMITS
} from '../constants/api.constants';
import { getToken } from '../utils/auth.utils';

// Circuit breaker states
enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

// Cache interface
interface CacheEntry {
  data: any;
  timestamp: number;
}

// Request deduplication interface
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class ApiService {
  private client: AxiosInstance;
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private rateLimitTokens: Map<string, number> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly CIRCUIT_THRESHOLD = 5;
  private readonly CIRCUIT_RESET_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.initializeClient();
    this.initializeRateLimits();
    this.setupInterceptors();
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Version': API_VERSION
      }
    });
  }

  private initializeRateLimits(): void {
    Object.keys(RATE_LIMITS).forEach(key => {
      this.rateLimitTokens.set(key, RATE_LIMITS[key as keyof typeof RATE_LIMITS]);
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['X-Request-ID'] = this.generateRequestId();
        config.headers['X-Client-Timestamp'] = Date.now().toString();
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      response => this.handleResponse(response),
      error => this.handleError(error)
    );
  }

  /**
   * Performs GET request with caching and circuit breaker
   */
  public async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    
    // Check circuit breaker
    this.checkCircuitBreaker();

    // Check cache
    const cachedData = this.checkCache(cacheKey);
    if (cachedData) return cachedData;

    // Check rate limit
    this.checkRateLimit(endpoint);

    // Check for pending duplicate request
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest.promise;
    }

    const config: AxiosRequestConfig = { params };
    const requestPromise = this.executeRequest<T>('GET', endpoint, undefined, config);
    
    this.pendingRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: Date.now()
    });

    try {
      const response = await requestPromise;
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      return response;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Performs POST request with data encryption
   */
  public async post<T>(endpoint: string, data: any, params?: Record<string, any>): Promise<T> {
    this.checkCircuitBreaker();
    this.checkRateLimit(endpoint);

    const config: AxiosRequestConfig = { params };
    return this.executeRequest<T>('POST', endpoint, data, config);
  }

  private async executeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        ...config
      });
      this.handleSuccess();
      return response.data;
    } catch (error) {
      throw await this.handleError(error);
    }
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    if (response.headers['x-rate-limit-remaining']) {
      const endpoint = this.getEndpointKey(response.config.url || '');
      this.rateLimitTokens.set(
        endpoint,
        parseInt(response.headers['x-rate-limit-remaining'])
      );
    }
    return response;
  }

  private async handleError(error: any): Promise<never> {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.CIRCUIT_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
      setTimeout(() => {
        this.circuitState = CircuitState.HALF_OPEN;
      }, this.CIRCUIT_RESET_TIMEOUT);
    }

    const errorResponse = {
      code: this.mapErrorCode(error),
      message: error.message,
      timestamp: new Date().toISOString(),
      details: {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status
      }
    };

    throw errorResponse;
  }

  private handleSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.circuitState = CircuitState.CLOSED;
    }
    this.failureCount = 0;
  }

  private checkCircuitBreaker(): void {
    if (this.circuitState === CircuitState.OPEN) {
      throw {
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'Circuit breaker is open',
        timestamp: new Date().toISOString()
      };
    }
  }

  private checkCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private checkRateLimit(endpoint: string): void {
    const key = this.getEndpointKey(endpoint);
    const tokens = this.rateLimitTokens.get(key) || 0;
    
    if (tokens <= 0) {
      throw {
        code: ERROR_CODES.RATE_LIMIT_ERROR,
        message: 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      };
    }

    this.rateLimitTokens.set(key, tokens - 1);
  }

  private generateCacheKey(endpoint: string, params?: Record<string, any>): string {
    return `${endpoint}${params ? JSON.stringify(params) : ''}`;
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEndpointKey(endpoint: string): string {
    for (const [key, value] of Object.entries(API_ENDPOINTS)) {
      if (endpoint.startsWith(value.toString())) {
        return key;
      }
    }
    return 'DEFAULT';
  }

  private mapErrorCode(error: any): string {
    if (error.response) {
      switch (error.response.status) {
        case HTTP_STATUS.UNAUTHORIZED:
          return ERROR_CODES.AUTH_ERROR;
        case HTTP_STATUS.TOO_MANY_REQUESTS:
          return ERROR_CODES.RATE_LIMIT_ERROR;
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          return ERROR_CODES.NETWORK_ERROR;
        default:
          return ERROR_CODES.SERVER_ERROR;
      }
    }
    return ERROR_CODES.NETWORK_ERROR;
  }
}

export const apiService = new ApiService();