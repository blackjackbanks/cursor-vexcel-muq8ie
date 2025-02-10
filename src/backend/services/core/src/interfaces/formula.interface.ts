/**
 * @fileoverview TypeScript interfaces for Excel formula handling, validation, and AI-powered suggestions
 * Defines the contract between Excel Add-in, Core service, and AI service for formula operations
 * @version 1.0.0
 */

import { IAPIResponse, IFormulaSuggestion } from '../../../shared/interfaces';

/**
 * Enum for formula error severity levels
 */
export enum ErrorSeverity {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info'
}

/**
 * Enum for formula error codes
 */
export enum FormulaErrorCode {
    SYNTAX_ERROR = 'SYNTAX_ERROR',
    CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
    INVALID_RANGE = 'INVALID_RANGE',
    MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
    PERFORMANCE_ISSUE = 'PERFORMANCE_ISSUE',
    TYPE_MISMATCH = 'TYPE_MISMATCH'
}

/**
 * Interface for formula generation request preferences
 */
export interface IFormulaPreferences {
    /** Maximum complexity level for generated formulas */
    maxComplexity: 'basic' | 'intermediate' | 'advanced';
    /** Preferred formula style (modern/legacy) */
    style: 'modern' | 'legacy';
    /** Include array formulas in suggestions */
    allowArrayFormulas: boolean;
    /** Include dynamic array functions */
    allowDynamicArrays: boolean;
    /** Maximum nesting level for formulas */
    maxNestingLevel: number;
}

/**
 * Interface for workbook context information
 */
export interface IWorkbookContext {
    /** Available named ranges */
    namedRanges: Map<string, string>;
    /** Custom functions available */
    customFunctions: string[];
    /** Workbook-level settings */
    settings: Record<string, unknown>;
    /** Data validation rules */
    validationRules: Record<string, unknown>;
}

/**
 * Interface for formula error location
 */
export interface IFormulaErrorLocation {
    /** Start position in formula string */
    start: number;
    /** End position in formula string */
    end: number;
    /** Affected range in worksheet */
    range?: string;
    /** Function name if error is within a function */
    function?: string;
}

/**
 * Interface for formula performance metrics
 */
export interface IFormulaPerformance {
    /** Estimated calculation time (ms) */
    calculationTime: number;
    /** Memory usage estimate (bytes) */
    memoryUsage: number;
    /** Volatility status */
    isVolatile: boolean;
    /** Number of cell references */
    referenceCount: number;
}

/**
 * Interface for AI processing metrics
 */
export interface IProcessingMetrics {
    /** Total processing time in ms */
    totalTime: number;
    /** AI model inference time */
    inferenceTime: number;
    /** Number of tokens processed */
    tokenCount: number;
    /** Cache hit status */
    cacheHit: boolean;
}

/**
 * Enhanced interface for formula generation requests
 */
export interface IFormulaRequest {
    /** Natural language input or partial formula */
    input: string;
    /** Excel context information */
    context: IFormulaContext;
    /** User's locale for i18n */
    locale: string;
    /** Formula generation preferences */
    preferences: IFormulaPreferences;
}

/**
 * Enhanced interface for Excel context
 */
export interface IFormulaContext {
    /** Currently selected range */
    selectedRange: string;
    /** Active worksheet name */
    sheetName: string;
    /** Workbook-level context */
    workbookContext: IWorkbookContext;
    /** Data types of referenced cells */
    dataTypes: Map<string, string>;
}

/**
 * Enhanced interface for formula errors
 */
export interface IFormulaError {
    /** Error code identifier */
    code: FormulaErrorCode;
    /** Human-readable error message */
    message: string;
    /** Error location details */
    location: IFormulaErrorLocation;
    /** Error severity level */
    severity: ErrorSeverity;
    /** Suggested fixes */
    suggestions: string[];
}

/**
 * Enhanced interface for formula validation results
 */
export interface IFormulaValidationResult {
    /** Overall validation status */
    isValid: boolean;
    /** Critical errors found */
    errors: IFormulaError[];
    /** Non-critical warnings */
    warnings: IFormulaError[];
    /** Performance analysis */
    performance: IFormulaPerformance;
}

/**
 * Enhanced interface for formula suggestion responses
 */
export interface IFormulaSuggestionResponse extends IAPIResponse<IFormulaSuggestion[]> {
    /** List of formula suggestions */
    suggestions: IFormulaSuggestion[];
    /** Total processing time in ms */
    processingTime: number;
    /** Detailed processing metrics */
    metrics: IProcessingMetrics;
    /** Alternative suggestions */
    alternatives: IFormulaSuggestion[];
}