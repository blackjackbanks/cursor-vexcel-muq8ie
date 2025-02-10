/**
 * @fileoverview Centralized TypeScript type definitions shared across all backend services
 * Includes enums, type aliases, and utility types for API responses, error handling,
 * and service-specific data structures
 * @version 1.0.0
 */

/**
 * Enum for identifying different microservices in the system
 */
export enum ServiceName {
    AI = 'ai-service',
    CORE = 'core-service',
    DATA = 'data-service',
    GATEWAY = 'api-gateway'
}

/**
 * Enum for formula style preferences
 */
export enum FormulaStyle {
    MODERN = 'modern',
    LEGACY = 'legacy'
}

/**
 * Enum for formula complexity levels
 */
export enum ComplexityLevel {
    BASIC = 'basic',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced'
}

/**
 * Type alias for standardized error codes across services
 */
export type ErrorCode =
    | 'AI_SERVICE_UNAVAILABLE'
    | 'FORMULA_GENERATION_FAILED'
    | 'DATABASE_ERROR'
    | 'VALIDATION_ERROR';

/**
 * Interface for standardized error details structure
 */
export interface ErrorDetails {
    /** Error code from the ErrorCode type */
    code: ErrorCode;
    /** Human-readable error message */
    message: string;
    /** Service that generated the error */
    service: ServiceName;
    /** Additional error context and metadata */
    details: Record<string, any>;
}

/**
 * Generic interface for standardized API responses
 * @template T - Type of the response data
 */
export interface APIResponse<T = any> {
    /** Indicates if the operation was successful */
    success: boolean;
    /** Response payload when success is true */
    data?: T;
    /** Error details when success is false */
    error?: ErrorDetails;
}

/**
 * Interface for AI-generated formula suggestions
 */
export interface FormulaSuggestion {
    /** Excel formula string */
    formula: string;
    /** Confidence score between 0 and 1 */
    confidence: number;
    /** Formula generation context */
    context: {
        /** Input cells or ranges referenced */
        references?: string[];
        /** Expected output format */
        outputFormat?: string;
        /** Formula complexity level */
        complexity?: ComplexityLevel;
        /** Additional metadata */
        metadata?: Record<string, any>;
    };
}

/**
 * Interface for data cleaning configuration options
 */
export interface DataCleaningOptions {
    /** Flag to remove duplicate rows */
    removeDuplicates: boolean;
    /** Flag to fill missing values with defaults or interpolation */
    fillMissingValues: boolean;
    /** Flag to standardize data formats (dates, numbers, etc.) */
    standardizeFormats: boolean;
}