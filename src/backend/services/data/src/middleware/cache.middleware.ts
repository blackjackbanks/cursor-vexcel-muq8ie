/**
 * @fileoverview Advanced Redis caching middleware for Express with compression,
 * circuit breaking, and cache stampede prevention
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import compression from 'compression'; // ^1.7.4
import CircuitBreaker from 'circuit-breaker-js'; // ^0.5.0
import { createHash } from 'crypto';
import { RedisCache } from '../config/redis';
import { ErrorCode } from '@shared/types';

// Cache configuration constants
const DEFAULT_CACHE_TTL = 300; // 5 minutes in seconds
const CACHE_KEY_PREFIX = 'data-service:';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const COMPRESSION_THRESHOLD = 1024; // 1KB
const CIRCUIT_BREAKER_OPTIONS = {
  failureThreshold: 5,
  recoveryTimeout: 30000 // 30 seconds
};

/**
 * Interface for cache middleware configuration options
 */
interface CacheOptions {
  ttl?: number;
  enabled?: boolean;
  maxSize?: number;
  compression?: boolean;
  excludePatterns?: RegExp[];
  allowedMethods?: string[];
  circuitBreaker?: {
    failureThreshold?: number;
    recoveryTimeout?: number;
  };
}

/**
 * Enhanced configuration class for cache middleware
 */
export class CacheConfig {
  private readonly ttl: number;
  private readonly enabled: boolean;
  private readonly maxSize: number;
  private readonly compression: boolean;
  private readonly excludePatterns: RegExp[];
  private readonly allowedMethods: string[];
  private readonly circuitBreaker: CircuitBreaker;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || DEFAULT_CACHE_TTL;
    this.enabled = options.enabled !== false;
    this.maxSize = options.maxSize || MAX_CACHE_SIZE;
    this.compression = options.compression !== false;
    this.excludePatterns = options.excludePatterns || [/^\/health/, /^\/metrics/];
    this.allowedMethods = options.allowedMethods || ['GET', 'HEAD'];
    
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options.circuitBreaker?.failureThreshold || CIRCUIT_BREAKER_OPTIONS.failureThreshold,
      recoveryTimeout: options.circuitBreaker?.recoveryTimeout || CIRCUIT_BREAKER_OPTIONS.recoveryTimeout
    });
  }

  /**
   * Determines if a request should be cached based on configuration rules
   */
  public shouldCache(req: Request): boolean {
    if (!this.enabled) return false;
    if (!this.allowedMethods.includes(req.method)) return false;
    if (this.excludePatterns.some(pattern => pattern.test(req.path))) return false;
    if (req.get('Cache-Control') === 'no-cache') return false;
    return true;
  }

  public getTTL(): number {
    return this.ttl;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  public isCompressionEnabled(): boolean {
    return this.compression;
  }
}

/**
 * Generates a unique cache key for the request
 */
function generateCacheKey(req: Request, version: string = '1'): string {
  const normalizedPath = req.path.toLowerCase();
  const sortedQuery = Object.entries(req.query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signature = createHash('sha256')
    .update(`${req.method}:${normalizedPath}:${sortedQuery}`)
    .digest('hex')
    .substring(0, 16);

  return `${CACHE_KEY_PREFIX}v${version}:${signature}`;
}

/**
 * Advanced Express middleware implementing request caching with compression,
 * circuit breaking, and cache stampede prevention
 */
export function cacheMiddleware(options: CacheOptions = {}): RequestHandler {
  const config = new CacheConfig(options);
  const cache = new RedisCache(null); // Redis client will be injected from config
  const pendingRequests = new Map<string, Promise<any>>();

  // Initialize compression middleware if enabled
  const compressionMiddleware = config.isCompressionEnabled() 
    ? compression({ threshold: COMPRESSION_THRESHOLD })
    : ((_req: Request, _res: Response, next: NextFunction) => next());

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!config.shouldCache(req)) {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const circuitBreaker = config.getCircuitBreaker();

    // Implement request coalescing to prevent cache stampede
    if (pendingRequests.has(cacheKey)) {
      try {
        const result = await pendingRequests.get(cacheKey);
        return res.json(result);
      } catch (error) {
        return next(error);
      }
    }

    try {
      // Check circuit breaker state
      if (!circuitBreaker.isOpen()) {
        const cachedData = await cache.get(cacheKey);
        
        if (cachedData) {
          // Apply compression if enabled
          if (config.isCompressionEnabled()) {
            compressionMiddleware(req, res, () => {});
          }
          return res.json(cachedData);
        }
      }

      // Cache miss or circuit breaker open - generate new response
      const responsePromise = new Promise((resolve, reject) => {
        const originalSend = res.json.bind(res);
        
        res.json = (body: any): Response => {
          pendingRequests.delete(cacheKey);
          
          // Cache the response if circuit breaker is closed
          if (!circuitBreaker.isOpen()) {
            cache.set(cacheKey, body, config.getTTL()).catch((error) => {
              console.error('Cache set error:', error);
              circuitBreaker.recordFailure();
            });
          }

          resolve(body);
          return originalSend(body);
        };

        next((error?: Error) => {
          if (error) {
            pendingRequests.delete(cacheKey);
            reject(error);
          }
        });
      });

      pendingRequests.set(cacheKey, responsePromise);
      await responsePromise;

    } catch (error) {
      console.error('Cache middleware error:', error);
      circuitBreaker.recordFailure();
      
      // Continue without caching on error
      pendingRequests.delete(cacheKey);
      next(error);
    }
  };
}