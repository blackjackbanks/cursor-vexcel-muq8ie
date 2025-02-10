/**
 * @fileoverview Defines TypeScript interfaces for formula-related functionality in the Excel Add-in frontend
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { RangeSelection } from '../types/excel.types';
import { FormulaStyle, ComplexityLevel } from '../types/formula.types';
import { Office } from '@microsoft/office-js';

/**
 * Represents request priority levels for formula generation
 */
export enum RequestPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Interface for performance monitoring metrics
 */
export interface IPerformanceMetrics {
    readonly processingTime: number;
    readonly memoryUsage: number;
    readonly apiLatency: number;
    readonly cacheHitRate: number;
    readonly modelLoadTime: number;
    readonly totalRequestTime: number;
}

/**
 * Interface for formula suggestion source information
 */
export interface ISuggestionSource {
    readonly modelVersion: string;
    readonly confidenceScore: number;
    readonly datasetVersion: string;
    readonly generationTimestamp: Date;
}

/**
 * Interface for version control information
 */
export interface IVersionInfo {
    readonly id: string;
    readonly timestamp: Date;
    readonly author: string;
    readonly changes: ReadonlyArray<string>;
}

/**
 * Interface for caching strategy configuration
 */
export interface ICacheStrategy {
    readonly enabled: boolean;
    readonly ttl: number;
    readonly priority: number;
    readonly invalidationRules: ReadonlyArray<string>;
}

/**
 * Interface for cache preferences
 */
export interface ICachePreferences {
    readonly maxAge: number;
    readonly revalidate: boolean;
    readonly staleWhileRevalidate: boolean;
    readonly prefetch: boolean;
}

/**
 * Interface for performance optimization flags
 */
export interface IPerformanceFlags {
    readonly enableParallelProcessing: boolean;
    readonly useGPUAcceleration: boolean;
    readonly optimizeMemoryUsage: boolean;
    readonly enablePrecompilation: boolean;
}

/**
 * Interface for request telemetry data
 */
export interface IRequestTelemetry {
    readonly requestId: string;
    readonly timestamp: Date;
    readonly userAgent: string;
    readonly sessionId: string;
    readonly performanceMetrics: IPerformanceMetrics;
}

/**
 * Interface for formula context information
 */
export interface IFormulaContext {
    readonly selectedRange: RangeSelection;
    readonly workbookContext: {
        readonly sheets: ReadonlyArray<string>;
        readonly namedRanges: Readonly<Record<string, string>>;
        readonly customFunctions: ReadonlyArray<string>;
    };
    readonly environmentContext: {
        readonly locale: string;
        readonly timeZone: string;
        readonly platform: string;
    };
}

/**
 * Interface for formula generation request
 */
export interface IFormulaRequest {
    readonly input: string;
    readonly context: IFormulaContext;
    readonly preferences: IFormulaPreferences;
    readonly timeout: number;
    readonly priority: RequestPriority;
    readonly cacheStrategy: ICacheStrategy;
    readonly telemetry: IRequestTelemetry;
}

/**
 * Interface for formula suggestions
 */
export interface IFormulaSuggestion {
    readonly formula: string;
    readonly confidence: number;
    readonly explanation: string;
    readonly performance: IPerformanceMetrics;
    readonly source: ISuggestionSource;
    readonly version: IVersionInfo;
}

/**
 * Interface for formula preferences
 */
export interface IFormulaPreferences {
    readonly style: FormulaStyle;
    readonly complexityLevel: ComplexityLevel;
    readonly locale: string;
    readonly performanceOptimization: IPerformanceFlags;
    readonly cachePreferences: ICachePreferences;
    readonly aiModelVersion: string;
}

/**
 * Interface for formula validation result
 */
export interface IFormulaValidationResult {
    readonly isValid: boolean;
    readonly errors: ReadonlyArray<{
        readonly code: string;
        readonly message: string;
        readonly position: number;
    }>;
    readonly suggestions: ReadonlyArray<IFormulaSuggestion>;
    readonly performance: IPerformanceMetrics;
}

/**
 * Interface for formula optimization result
 */
export interface IFormulaOptimizationResult {
    readonly originalFormula: string;
    readonly optimizedFormula: string;
    readonly improvements: ReadonlyArray<string>;
    readonly performanceGain: number;
    readonly validationResult: IFormulaValidationResult;
}

/**
 * Type guard to check if a value is a valid RequestPriority
 */
export const isRequestPriority = (value: unknown): value is RequestPriority => {
    return Object.values(RequestPriority).includes(value as RequestPriority);
};