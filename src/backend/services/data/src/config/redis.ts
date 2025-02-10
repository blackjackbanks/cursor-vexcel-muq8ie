/**
 * @fileoverview Redis configuration module for the data service
 * @version 1.0.0
 * @package ioredis ^5.3.0
 * @package dotenv ^16.0.0
 */

import Redis, { RedisOptions, ClusterNode } from 'ioredis';
import { CACHE_SETTINGS } from '../../../../shared/constants';

// Environment configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_SSL_ENABLED = process.env.REDIS_SSL_ENABLED === 'true';
const REDIS_CLUSTER_ENABLED = process.env.REDIS_CLUSTER_ENABLED === 'true';
const REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES || '3');
const REDIS_RETRY_INTERVAL = parseInt(process.env.REDIS_RETRY_INTERVAL || '1000');

/**
 * Creates and configures a new Redis client instance with clustering and SSL support
 * @param options - Optional Redis configuration options
 * @returns Configured Redis client instance
 */
export const createRedisClient = (options?: RedisOptions): Redis => {
  const baseConfig: RedisOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      if (times > REDIS_MAX_RETRIES) {
        return null; // Stop retrying
      }
      return Math.min(
        times * REDIS_RETRY_INTERVAL,
        CACHE_SETTINGS.REDIS_CONFIG.MAX_RETRY_DELAY_MS
      );
    },
    maxRetriesPerRequest: REDIS_MAX_RETRIES,
    enableReadyCheck: true,
    lazyConnect: true
  };

  // Configure SSL if enabled
  if (REDIS_SSL_ENABLED) {
    baseConfig.tls = {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    };
  }

  // Configure clustering if enabled
  if (REDIS_CLUSTER_ENABLED) {
    const nodes: ClusterNode[] = [{ host: REDIS_HOST, port: REDIS_PORT }];
    return new Redis.Cluster(nodes, {
      ...baseConfig,
      ...options,
      redisOptions: baseConfig,
      clusterRetryStrategy: baseConfig.retryStrategy
    });
  }

  return new Redis({
    ...baseConfig,
    ...options
  });
};

/**
 * Handles Redis client errors with comprehensive error handling and reconnection logic
 * @param error - Redis error object
 * @param client - Redis client instance
 */
export const handleRedisError = (error: Error, client: Redis): void => {
  console.error('[Redis Error]', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Emit error event for monitoring
  client.emit('error:handled', {
    error: error.message,
    timestamp: new Date().toISOString()
  });

  // Attempt reconnection if client is disconnected
  if (!client.status) {
    client.connect().catch((reconnectError) => {
      console.error('[Redis Reconnection Error]', {
        error: reconnectError.message,
        timestamp: new Date().toISOString()
      });
    });
  }
};

/**
 * Enhanced Redis cache manager with clustering support and comprehensive error handling
 */
export class RedisCache<T = unknown> {
  private readonly client: Redis;
  private readonly defaultTTL: number;
  private readonly metrics: {
    hits: number;
    misses: number;
    errors: number;
  };

  constructor(client: Redis, options?: RedisOptions) {
    this.client = client;
    this.defaultTTL = CACHE_SETTINGS.DEFAULT_TTL_SECONDS;
    this.metrics = { hits: 0, misses: 0, errors: 0 };

    // Setup error handling
    this.client.on('error', (error) => handleRedisError(error, this.client));

    // Setup monitoring
    this.client.on('connect', () => {
      console.info('[Redis] Connected successfully');
    });

    this.client.on('ready', () => {
      console.info('[Redis] Client ready for operations');
    });
  }

  /**
   * Sets a value in Redis cache with type safety
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in seconds
   */
  public async set(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await this.client.setex(key, expiry, serializedValue);
    } catch (error) {
      this.metrics.errors++;
      throw new Error(`Cache set error: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieves a value from Redis cache with type safety
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  public async get(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      
      if (!value) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      this.metrics.errors++;
      throw new Error(`Cache get error: ${(error as Error).message}`);
    }
  }

  /**
   * Removes a value from Redis cache
   * @param key - Cache key
   */
  public async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.metrics.errors++;
      throw new Error(`Cache delete error: ${(error as Error).message}`);
    }
  }

  /**
   * Returns current cache metrics
   */
  public getMetrics() {
    return { ...this.metrics };
  }
}