/**
 * @fileoverview Centralized constants module shared across all backend services
 * @version 1.0.0
 * @package dotenv ^16.0.0
 */

import { config } from 'dotenv';

// Initialize environment configuration
config();

// Global environment variables
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const API_VERSION = 'v1';

/**
 * Common API configuration constants used across services
 */
export const API_CONSTANTS = {
    VERSION: API_VERSION,
    BASE_URL: `/api/${API_VERSION}`,
    RATE_LIMITS: {
        FORMULA_SUGGEST: '100/minute',
        DATA_CLEAN: '20/minute',
        VERSION_RETRIEVE: '200/minute',
        CHANGES_BATCH: '50/minute'
    },
    ENDPOINTS: {
        FORMULA_SUGGEST: `/api/${API_VERSION}/formula/suggest`,
        DATA_CLEAN: `/api/${API_VERSION}/data/clean`,
        VERSION: `/api/${API_VERSION}/version`,
        CHANGES_BATCH: `/api/${API_VERSION}/changes/batch`
    }
} as const;

/**
 * Standardized error codes used across all services
 */
export const ERROR_CODES = {
    AI_SERVICE: {
        SERVICE_UNAVAILABLE: 'AI-001',
        FORMULA_GENERATION_FAILED: 'AI-002',
        CONTEXT_PROCESSING_ERROR: 'AI-003',
        MODEL_TIMEOUT: 'AI-004'
    },
    DATABASE: {
        CONNECTION_ERROR: 'DB-001',
        VERSION_CONFLICT: 'DB-002',
        QUERY_TIMEOUT: 'DB-003',
        INTEGRITY_ERROR: 'DB-004'
    },
    SECURITY: {
        AUTHENTICATION_FAILED: 'SEC-001',
        AUTHORIZATION_FAILED: 'SEC-002',
        TOKEN_EXPIRED: 'SEC-003',
        INVALID_CREDENTIALS: 'SEC-004'
    }
} as const;

/**
 * Service identifiers for logging and monitoring
 */
export const SERVICE_NAMES = {
    AI_SERVICE: 'ai-formula-service',
    CORE_SERVICE: 'excel-core-service',
    DATA_SERVICE: 'data-management-service',
    GATEWAY_SERVICE: 'api-gateway-service'
} as const;

/**
 * Common performance configuration thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
    DEFAULT_TIMEOUT_MS: 2000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    CIRCUIT_BREAKER: {
        FAILURE_THRESHOLD: 5,
        RESET_TIMEOUT_MS: 30000,
        HALF_OPEN_REQUESTS: 1
    }
} as const;

/**
 * Shared caching configuration used across services
 */
export const CACHE_SETTINGS = {
    DEFAULT_TTL_SECONDS: 300,
    MAX_CACHE_SIZE: 1000,
    REDIS_CONFIG: {
        RETRY_STRATEGY: 'exponential',
        MAX_RECONNECT_ATTEMPTS: 10,
        INITIAL_RETRY_DELAY_MS: 100,
        MAX_RETRY_DELAY_MS: 3000
    }
} as const;

// Type exports for better TypeScript support
export type ApiConstants = typeof API_CONSTANTS;
export type ErrorCodes = typeof ERROR_CODES;
export type ServiceNames = typeof SERVICE_NAMES;
export type PerformanceThresholds = typeof PERFORMANCE_THRESHOLDS;
export type CacheSettings = typeof CACHE_SETTINGS;