/**
 * @fileoverview Core service specific constants module defining comprehensive service configuration,
 * API endpoints, validation rules, error handling constants, and performance metrics
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { API_CONSTANTS } from '../../../shared/constants';
import { FormulaStyle } from '../interfaces/formula.interface';

// Initialize environment configuration
config();

// Global environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORE_SERVICE_NAME = 'core-service';

/**
 * Core service configuration constants
 */
export const CORE_SERVICE_CONFIG = {
    PORT: parseInt(process.env.CORE_SERVICE_PORT || '3000', 10),
    HOST: process.env.CORE_SERVICE_HOST || '0.0.0.0',
    RATE_LIMIT: {
        FORMULA_SUGGEST: '100/minute',
        VERSION_RETRIEVE: '200/minute',
        BATCH_OPERATIONS: '50/minute'
    },
    TIMEOUT_MS: 2000, // 2 second SLA requirement
    MAX_RETRIES: 3,
    CIRCUIT_BREAKER: {
        FAILURE_THRESHOLD: 5,
        RESET_TIMEOUT_MS: 30000,
        HALF_OPEN_REQUESTS: 1
    }
} as const;

/**
 * Formula-related API endpoint constants
 */
export const FORMULA_ENDPOINTS = {
    SUGGEST: `${API_CONSTANTS.BASE_URL}/formula/suggest`,
    VALIDATE: `${API_CONSTANTS.BASE_URL}/formula/validate`,
    OPTIMIZE: `${API_CONSTANTS.BASE_URL}/formula/optimize`,
    BATCH: `${API_CONSTANTS.BASE_URL}/formula/batch`
} as const;

/**
 * Version control API endpoint constants
 */
export const VERSION_ENDPOINTS = {
    GET_HISTORY: `${API_CONSTANTS.BASE_URL}/version/history`,
    RESTORE: `${API_CONSTANTS.BASE_URL}/version/restore`,
    COMPARE: `${API_CONSTANTS.BASE_URL}/version/compare`
} as const;

/**
 * Comprehensive formula validation rules
 */
export const VALIDATION_RULES = {
    MAX_FORMULA_LENGTH: 8192,
    SUPPORTED_FUNCTIONS: [
        'SUM', 'AVERAGE', 'COUNT', 'VLOOKUP', 'INDEX', 'MATCH',
        'IF', 'SUMIFS', 'COUNTIFS', 'AVERAGEIFS', 'XLOOKUP',
        'FILTER', 'SORT', 'UNIQUE', 'SEQUENCE', 'LAMBDA'
    ],
    COMPLEXITY_THRESHOLD: {
        BASIC: 3,      // Max nested functions
        INTERMEDIATE: 5,
        ADVANCED: 10
    },
    STYLE_PREFERENCES: {
        [FormulaStyle.MODERN]: {
            preferredFunctions: ['XLOOKUP', 'FILTER', 'UNIQUE'],
            arrayFormulas: true,
            dynamicArrays: true
        },
        [FormulaStyle.LEGACY]: {
            preferredFunctions: ['VLOOKUP', 'INDEX', 'MATCH'],
            arrayFormulas: false,
            dynamicArrays: false
        }
    }
} as const;

/**
 * Error messages and codes for core service operations
 */
export const ERROR_MESSAGES = {
    INVALID_FORMULA: {
        code: 'AI-002',
        message: 'Formula generation failed due to invalid input or context'
    },
    VERSION_NOT_FOUND: {
        code: 'DB-001',
        message: 'Requested version not found in history'
    },
    RESTORE_FAILED: {
        code: 'DB-002',
        message: 'Version restoration failed due to conflicts'
    },
    ERROR_CODES: {
        FORMULA_VALIDATION: 'CORE-001',
        VERSION_CONTROL: 'CORE-002',
        RATE_LIMIT: 'CORE-003',
        SYSTEM_ERROR: 'CORE-004'
    },
    SUGGESTION_TEMPLATES: {
        SYNTAX_ERROR: 'The formula contains a syntax error at position {position}',
        COMPLEXITY_WARNING: 'Formula complexity exceeds recommended threshold',
        PERFORMANCE_WARNING: 'Formula may impact performance due to {reason}'
    }
} as const;

/**
 * Performance and reliability configuration constants
 */
export const PERFORMANCE_CONFIG = {
    REQUEST_TIMEOUT: 2000,  // 2 second SLA requirement
    MAX_RETRIES: 3,
    CIRCUIT_BREAKER_CONFIG: {
        FAILURE_THRESHOLD: 5,
        RESET_TIMEOUT_MS: 30000,
        HALF_OPEN_REQUESTS: 1
    },
    CACHE_TTL: {
        FORMULA_SUGGESTIONS: 300,  // 5 minutes
        VERSION_HISTORY: 600,      // 10 minutes
        VALIDATION_RESULTS: 120    // 2 minutes
    },
    METRICS: {
        FORMULA_ACCURACY_TARGET: 0.95,  // 95% accuracy requirement
        RESPONSE_TIME_TARGET: 2000,     // 2 second response time
        BATCH_SIZE: 100,
        MEMORY_THRESHOLD: 512 * 1024 * 1024  // 512MB
    }
} as const;