/**
 * API Constants
 * Defines comprehensive API-related constants for the Excel Add-in frontend application
 * @version 1.0.0
 */

/**
 * API version identifier for versioned API requests
 */
export const API_VERSION = 'v1';

/**
 * Base API URL with local development fallback
 */
export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * API request timeout (2000ms) to ensure 2-second response requirement
 */
export const API_TIMEOUT = 2000;

/**
 * Maximum number of retry attempts for failed API requests
 */
export const MAX_RETRIES = 3;

/**
 * Rate limits for different API endpoint categories (requests per minute)
 */
export const RATE_LIMITS = {
  FORMULA_SUGGESTIONS: 100,
  DATA_CLEANING: 20,
  VERSION_HISTORY: 200,
  BATCH_OPERATIONS: 50,
} as const;

/**
 * API endpoints for all service categories
 */
export const API_ENDPOINTS = {
  FORMULA: {
    SUGGEST: '/api/v1/formula/suggest',
    VALIDATE: '/api/v1/formula/validate',
    OPTIMIZE: '/api/v1/formula/optimize',
    BATCH: '/api/v1/formula/batch',
  },
  DATA: {
    CLEAN: '/api/v1/data/clean',
    PREVIEW: '/api/v1/data/preview',
    VALIDATE: '/api/v1/data/validate',
    TRANSFORM: '/api/v1/data/transform',
  },
  VERSION: {
    GET: '/api/v1/version',
    GET_BY_ID: '/api/v1/version/:id',
    RESTORE: '/api/v1/version/:id/restore',
    COMPARE: '/api/v1/version/compare',
  },
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
  },
} as const;

/**
 * HTTP status codes for consistent response handling
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Application-specific error codes for error handling and logging
 */
export const ERROR_CODES = {
  FORMULA_ERROR: 'AI-001',
  FORMULA_VALIDATION_ERROR: 'AI-002',
  FORMULA_OPTIMIZATION_ERROR: 'AI-003',
  DATA_ERROR: 'DB-001',
  DATA_VALIDATION_ERROR: 'DB-002',
  VERSION_ERROR: 'VER-001',
  VERSION_CONFLICT: 'VER-002',
  AUTH_ERROR: 'SEC-001',
  TOKEN_ERROR: 'SEC-002',
  NETWORK_ERROR: 'NET-001',
  TIMEOUT_ERROR: 'NET-002',
  RATE_LIMIT_ERROR: 'API-001',
} as const;

/**
 * HTTP request configuration for consistent API client behavior
 */
export const REQUEST_CONFIG = {
  RETRY_DELAY: 1000,
  RETRY_MULTIPLIER: 2,
  MAX_TIMEOUT: 10000,
  KEEP_ALIVE: true,
  VALIDATE_STATUS: (status: number) => status >= 200 && status < 300,
} as const;

// Type definitions for better TypeScript support
export type ApiVersion = typeof API_VERSION;
export type RateLimits = typeof RATE_LIMITS;
export type ApiEndpoints = typeof API_ENDPOINTS;
export type HttpStatus = typeof HTTP_STATUS;
export type ErrorCodes = typeof ERROR_CODES;
export type RequestConfig = typeof REQUEST_CONFIG;