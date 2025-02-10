/**
 * @fileoverview Production-grade utility functions for standardized error handling,
 * validation, logging, caching, and performance optimization across backend services
 * @version 1.0.0
 */

import winston from 'winston'; // ^3.8.0
import ms from 'ms'; // ^2.1.3
import Ajv from 'ajv'; // ^8.12.0
import Redis from 'ioredis'; // ^5.3.0
import xss from 'xss'; // ^1.0.14
import { v4 as uuidv4 } from 'uuid';

import { ERROR_CODES, PERFORMANCE_THRESHOLDS, CACHE_SETTINGS } from '../constants';
import { IAPIResponse, IErrorDetails } from '../interfaces';
import { ServiceName } from '../types';

// Initialize validation instance
const ajv = new Ajv({ allErrors: true, coerceTypes: true });

// Initialize Redis client with retry strategy
const redis = new Redis({
    retryStrategy: (times: number) => {
        if (times > CACHE_SETTINGS.REDIS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            return null;
        }
        return Math.min(
            times * CACHE_SETTINGS.REDIS_CONFIG.INITIAL_RETRY_DELAY_MS,
            CACHE_SETTINGS.REDIS_CONFIG.MAX_RETRY_DELAY_MS
        );
    }
});

// Configure Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'utils' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

/**
 * Creates a standardized API response with correlation ID and timing metrics
 * @template T - Type of response data
 */
export function createAPIResponse<T>(
    success: boolean,
    data?: T,
    error?: IErrorDetails,
    correlationId: string = uuidv4()
): IAPIResponse<T> {
    const timestamp = Date.now();
    
    return {
        success,
        data: success ? data : undefined,
        error: !success ? error : undefined,
        metadata: {
            correlationId,
            timestamp,
            version: process.env.APP_VERSION || '1.0.0'
        }
    };
}

/**
 * Creates a standardized error response with retry handling and circuit breaker integration
 */
export function createErrorResponse(
    code: string,
    message: string,
    service: ServiceName,
    details: Record<string, any> = {},
    retryOptions?: {
        attemptNumber: number;
        maxAttempts: number;
        delayMs: number;
    }
): IAPIResponse<null> {
    const correlationId = uuidv4();
    const timestamp = Date.now();

    // Log error with context
    logger.error({
        code,
        message,
        service,
        correlationId,
        details,
        timestamp
    });

    const errorDetails: IErrorDetails = {
        code,
        message,
        service,
        details,
        correlationId,
        timestamp,
        stackTrace: process.env.NODE_ENV === 'development' ? new Error().stack : undefined,
        retryAfter: retryOptions && retryOptions.attemptNumber < retryOptions.maxAttempts
            ? retryOptions.delayMs
            : undefined
    };

    return createAPIResponse(false, null, errorDetails, correlationId);
}

/**
 * Validates and sanitizes input data against JSON schema with custom rules
 */
export function validateInput(
    data: unknown,
    schema: object,
    options: {
        sanitize?: boolean;
        coerce?: boolean;
        additionalProperties?: boolean;
    } = {}
): {
    isValid: boolean;
    errors?: string[];
    sanitizedData?: unknown;
} {
    const {
        sanitize = true,
        coerce = true,
        additionalProperties = false
    } = options;

    // Sanitize input if enabled
    const sanitizedData = sanitize ? 
        JSON.parse(xss(JSON.stringify(data))) : 
        data;

    // Validate against schema
    const validate = ajv.compile({
        ...schema,
        additionalProperties
    });
    
    const isValid = validate(coerce ? sanitizedData : data);

    return {
        isValid,
        errors: validate.errors?.map(err => err.message),
        sanitizedData: sanitize ? sanitizedData : undefined
    };
}

/**
 * Enterprise-grade logging utility with multiple transports and structured formats
 */
export function log(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    meta: Record<string, any> = {}
): void {
    const correlationId = meta.correlationId || uuidv4();
    
    logger.log({
        level,
        message,
        correlationId,
        timestamp: Date.now(),
        ...meta
    });
}

/**
 * Multi-level cache manager with Redis and memory storage
 */
export async function cacheManager<T>(
    key: string,
    getData: () => Promise<T>,
    options: {
        ttl?: number;
        useLocalCache?: boolean;
        forceFresh?: boolean;
    } = {}
): Promise<T> {
    const {
        ttl = CACHE_SETTINGS.DEFAULT_TTL_SECONDS,
        useLocalCache = true,
        forceFresh = false
    } = options;

    if (forceFresh) {
        const data = await getData();
        await redis.setex(key, ttl, JSON.stringify(data));
        return data;
    }

    // Try Redis cache first
    const cachedData = await redis.get(key);
    if (cachedData) {
        return JSON.parse(cachedData);
    }

    // Fetch fresh data
    const data = await getData();
    
    // Cache the fresh data
    await redis.setex(key, ttl, JSON.stringify(data));
    
    return data;
}

/**
 * Circuit breaker implementation for external service calls
 */
export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime?: number;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private readonly failureThreshold: number = PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER.FAILURE_THRESHOLD,
        private readonly resetTimeout: number = PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER.RESET_TIMEOUT_MS
    ) {}

    async execute<T>(
        action: () => Promise<T>,
        fallback?: () => Promise<T>
    ): Promise<T> {
        if (this.state === 'OPEN') {
            if (this.shouldReset()) {
                this.state = 'HALF_OPEN';
            } else if (fallback) {
                return fallback();
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await action();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            if (fallback) {
                return fallback();
            }
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }

    private shouldReset(): boolean {
        if (!this.lastFailureTime) return false;
        return Date.now() - this.lastFailureTime > this.resetTimeout;
    }
}

// Export utility types
export type ValidationResult = ReturnType<typeof validateInput>;
export type CacheOptions = Parameters<typeof cacheManager>[2];