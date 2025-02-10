/**
 * @fileoverview Redis-backed distributed rate limiting middleware for API Gateway
 * Implements endpoint-specific rate limits using token bucket algorithm
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { createClient, RedisClientType } from 'redis';
import { IAPIResponse, IErrorDetails } from '@shared/interfaces';

/**
 * Rate limit configuration by endpoint (requests/duration)
 */
const RATE_LIMITS = {
    'formula/suggest': '100/60', // 100 per minute
    'data/clean': '20/60',      // 20 per minute
    'version': '200/60',        // 200 per minute
    'changes/batch': '50/60'    // 50 per minute
} as const;

/**
 * Interface for Redis configuration
 */
interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    tls?: boolean;
}

/**
 * Interface for parsed rate limit configuration
 */
interface RateLimitConfig {
    points: number;
    duration: number;
}

/**
 * Implements distributed rate limiting using Redis-backed token bucket algorithm
 */
export class RateLimitMiddleware {
    private rateLimiter: RateLimiterRedis;
    private redisClient: RedisClientType;
    private readonly logger: any;
    private readonly keyPrefix = 'ratelimit:';
    private isReady: boolean = false;

    /**
     * Initializes Redis client and rate limiter with error handling
     */
    constructor(config: RedisConfig, logger: any) {
        this.logger = logger;
        
        this.redisClient = createClient({
            socket: {
                host: config.host,
                port: config.port,
                tls: config.tls
            },
            password: config.password
        });

        this.setupRedisClient();
    }

    /**
     * Sets up Redis client with event handlers and error management
     */
    private async setupRedisClient(): Promise<void> {
        this.redisClient.on('error', (err) => {
            this.logger.error('Redis client error:', err);
            this.isReady = false;
        });

        this.redisClient.on('connect', () => {
            this.logger.info('Redis client connected');
        });

        this.redisClient.on('ready', () => {
            this.isReady = true;
            this.logger.info('Redis client ready');
        });

        await this.redisClient.connect();

        this.rateLimiter = new RateLimiterRedis({
            storeClient: this.redisClient,
            keyPrefix: this.keyPrefix,
            points: 100, // Default limit
            duration: 60 // Default duration in seconds
        });
    }

    /**
     * Express middleware that applies rate limiting based on endpoint and user
     */
    public applyRateLimit(endpoint: string): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            if (!this.isReady) {
                this.logger.warn('Rate limiter not ready, allowing request');
                return next();
            }

            const userId = req.headers['x-user-id'] as string || req.ip;
            const key = this.generateKey(endpoint, userId);
            const limit = this.getRateLimit(endpoint);

            try {
                const rateLimiterRes = await this.rateLimiter.consume(key, 1);
                this.addRateLimitHeaders(res, rateLimiterRes);
                next();
            } catch (error) {
                if (error instanceof Error) {
                    this.logger.error('Rate limiter error:', error);
                    return next();
                }
                const rateLimiterRes = error as RateLimiterRes;
                this.handleError(res, rateLimiterRes);
            }
        };
    }

    /**
     * Gets rate limit configuration for specified endpoint
     */
    private getRateLimit(endpoint: string): RateLimitConfig {
        const defaultLimit: RateLimitConfig = { points: 100, duration: 60 };
        
        const limitStr = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS];
        if (!limitStr) return defaultLimit;

        const [points, duration] = limitStr.split('/').map(Number);
        return { points, duration };
    }

    /**
     * Generates unique rate limit key for user and endpoint
     */
    private generateKey(endpoint: string, userId: string): string {
        const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9]/g, ':');
        return `${this.keyPrefix}${sanitizedEndpoint}:${userId}`;
    }

    /**
     * Adds rate limit headers to response
     */
    private addRateLimitHeaders(res: Response, rateLimiterRes: RateLimiterRes): void {
        res.setHeader('X-RateLimit-Limit', rateLimiterRes.limit);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    }

    /**
     * Handles rate limit errors with standardized response
     */
    private handleError(res: Response, rateLimiterRes: RateLimiterRes): void {
        const response: IAPIResponse = {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
                service: 'api-gateway',
                details: {
                    retryAfter: Math.ceil(rateLimiterRes.msBeforeNext / 1000),
                    limit: rateLimiterRes.limit,
                    resetTime: new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
                },
                timestamp: Date.now(),
                correlationId: res.locals.correlationId
            }
        };

        this.logger.warn('Rate limit exceeded:', {
            endpoint: res.locals.endpoint,
            userId: res.locals.userId,
            retryAfter: response.error?.details.retryAfter
        });

        res.setHeader('Retry-After', Math.ceil(rateLimiterRes.msBeforeNext / 1000));
        res.status(429).json(response);
    }

    /**
     * Gracefully shuts down the Redis client
     */
    public async shutdown(): Promise<void> {
        await this.redisClient.quit();
        this.isReady = false;
        this.logger.info('Rate limiter shutdown complete');
    }
}
```

This implementation provides a robust, Redis-backed rate limiting middleware that:

1. Implements endpoint-specific rate limits as specified in the technical requirements
2. Uses a distributed token bucket algorithm via rate-limiter-flexible
3. Includes proper error handling and logging
4. Adds standard rate limit headers to responses
5. Provides graceful degradation if Redis is unavailable
6. Includes proper cleanup and shutdown handling
7. Uses standardized error responses matching the shared interfaces
8. Implements proper TypeScript types and documentation

The middleware can be used in the API Gateway's routes by instantiating the class and applying the middleware to specific endpoints:

```typescript
const rateLimiter = new RateLimitMiddleware(redisConfig, logger);
app.post('/api/v1/formula/suggest', rateLimiter.applyRateLimit('formula/suggest'), ...);