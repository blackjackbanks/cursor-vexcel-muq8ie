/**
 * @fileoverview Central TypeScript interface definitions shared across all backend services
 * Provides standardized types for API responses, error handling, data structures, and common functionality
 * @version 1.0.0
 */

import { ServiceName } from '../types';

/**
 * Standard interface for all API responses across services
 * @template T - Type of the response data payload
 */
export interface IAPIResponse<T = any> {
    /** Indicates if the operation was successful */
    success: boolean;
    /** Response payload when success is true */
    data?: T;
    /** Error details when success is false */
    error?: IErrorDetails;
}

/**
 * Enhanced error details interface with debugging and tracking capabilities
 */
export interface IErrorDetails {
    /** Unique error code identifying the type of error */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Service that generated the error */
    service: ServiceName;
    /** Additional error context and metadata */
    details: Record<string, any>;
    /** Optional stack trace for debugging (only in development) */
    stackTrace?: string;
    /** Unix timestamp when the error occurred */
    timestamp: number;
    /** Unique identifier for tracking error through services */
    correlationId: string;
}

/**
 * Interface for AI formula suggestions shared between AI and Core services
 */
export interface IFormulaSuggestion {
    /** Excel formula string */
    formula: string;
    /** Confidence score between 0 and 1 */
    confidence: number;
    /** Formula generation context and metadata */
    context: {
        /** Input cells or ranges referenced */
        references?: string[];
        /** Expected output format */
        outputFormat?: string;
        /** Additional metadata */
        metadata?: Record<string, any>;
    };
}

/**
 * Enhanced workbook context interface with formula dependencies and version control
 */
export interface IWorkbookContext {
    /** List of worksheet names in the workbook */
    sheets: string[];
    /** Map of named ranges and their references */
    namedRanges: Record<string, string>;
    /** Map of custom data types used in the workbook */
    dataTypes: Record<string, string>;
    /** Map of formula dependencies between cells */
    formulaReferences: Record<string, string[]>;
    /** Last modified timestamp */
    lastModified: number;
    /** Version control metadata */
    versionControl: IVersionMetadata;
}

/**
 * Version control metadata interface
 */
interface IVersionMetadata {
    /** Current version number */
    version: string;
    /** Last commit timestamp */
    lastCommit: number;
    /** Author of last change */
    author: string;
    /** Change description */
    description: string;
}

/**
 * Theme preferences interface
 */
interface IThemePreferences {
    /** UI color mode */
    colorMode: 'light' | 'dark' | 'system';
    /** Primary color scheme */
    primaryColor: string;
    /** Font size scale */
    fontSize: 'small' | 'medium' | 'large';
}

/**
 * Notification settings interface
 */
interface INotificationSettings {
    /** Enable/disable notifications */
    enabled: boolean;
    /** Types of notifications to receive */
    types: ('formula' | 'error' | 'update' | 'version')[];
    /** Notification display duration in ms */
    duration: number;
}

/**
 * Performance preference settings
 */
interface IPerformancePreferences {
    /** Enable/disable background processing */
    backgroundProcessing: boolean;
    /** Cache duration in seconds */
    cacheDuration: number;
    /** Batch size for data operations */
    batchSize: number;
}

/**
 * Enhanced user preferences interface with theme, notifications, and performance settings
 */
export interface IUserPreferences {
    /** User's locale for i18n */
    locale: string;
    /** Formula style preference */
    formulaStyle: FormulaStyle;
    /** Formula complexity level */
    complexityLevel: ComplexityLevel;
    /** UI theme preferences */
    theme: IThemePreferences;
    /** Notification settings */
    notifications: INotificationSettings;
    /** Performance optimization settings */
    performance: IPerformancePreferences;
}

/**
 * Formula style enum
 */
enum FormulaStyle {
    MODERN = 'modern',
    LEGACY = 'legacy'
}

/**
 * Formula complexity level enum
 */
enum ComplexityLevel {
    BASIC = 'basic',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced'
}