/**
 * @fileoverview Advanced validation utilities for formula validation, input sanitization,
 * and error checking in the AI-enhanced Excel Add-in with performance monitoring
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { Office } from '@microsoft/office-js'; // @version 1.1.0
import { 
    FormulaErrorType,
    FormulaValidationResult
} from '../types/formula.types';
import {
    IFormulaValidationResult,
    IFormulaContext,
    IPerformanceMetrics,
    ICacheStrategy,
    IRequestTelemetry
} from '../interfaces/formula.interface';
import { validateFormula } from './excel.utils';
import { PERFORMANCE_THRESHOLDS, EXCEL_ERROR_CODES } from '../constants/excel.constants';

/**
 * Cache for validation results to optimize performance
 */
const validationCache = new Map<string, {
    result: IFormulaValidationResult;
    timestamp: number;
}>();

/**
 * Enhanced formula input validation with performance monitoring, caching, and telemetry
 * @param formula - The formula to validate
 * @param context - Formula context including workbook state and user preferences
 * @param options - Optional validation configuration
 * @returns Promise resolving to comprehensive validation result
 */
export async function validateFormulaInput(
    formula: string,
    context: IFormulaContext,
    options: {
        enableCache?: boolean;
        priority?: 'high' | 'normal';
        timeout?: number;
    } = {}
): Promise<IFormulaValidationResult> {
    const startTime = performance.now();
    const requestId = generateRequestId();

    try {
        // Check cache if enabled
        if (options.enableCache) {
            const cachedResult = getCachedValidation(formula);
            if (cachedResult) {
                return enhanceValidationResult(cachedResult, startTime);
            }
        }

        // Initialize performance metrics
        const metrics: IPerformanceMetrics = {
            processingTime: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            apiLatency: 0,
            cacheHitRate: calculateCacheHitRate(),
            modelLoadTime: 0,
            totalRequestTime: 0
        };

        // Sanitize formula input
        const sanitizedFormula = sanitizeFormulaInput(formula);
        if (!sanitizedFormula) {
            return createErrorResult('Empty or invalid formula input', metrics);
        }

        // Validate formula length
        if (sanitizedFormula.length > PERFORMANCE_THRESHOLDS.MAX_FORMULA_LENGTH) {
            return createErrorResult(
                `Formula exceeds maximum length of ${PERFORMANCE_THRESHOLDS.MAX_FORMULA_LENGTH} characters`,
                metrics
            );
        }

        // Perform Excel formula validation
        const excelValidation = await validateFormula(sanitizedFormula);
        if (!excelValidation.isValid) {
            return createErrorResult(
                excelValidation.error?.message || 'Formula validation failed',
                metrics,
                excelValidation.error
            );
        }

        // Validate formula context
        const contextValidation = await validateFormulaContext(context);
        if (!contextValidation.isValid) {
            return createErrorResult(
                'Invalid formula context',
                metrics,
                contextValidation.errors
            );
        }

        // Create successful validation result
        const validationResult: IFormulaValidationResult = {
            isValid: true,
            errors: [],
            suggestions: [],
            performance: {
                ...metrics,
                processingTime: performance.now() - startTime,
                totalRequestTime: performance.now() - startTime
            }
        };

        // Cache result if enabled
        if (options.enableCache) {
            cacheValidationResult(formula, validationResult);
        }

        return validationResult;

    } catch (error) {
        return createErrorResult(
            'Unexpected error during formula validation',
            {
                processingTime: performance.now() - startTime,
                memoryUsage: process.memoryUsage().heapUsed,
                apiLatency: 0,
                cacheHitRate: calculateCacheHitRate(),
                modelLoadTime: 0,
                totalRequestTime: performance.now() - startTime
            },
            error
        );
    }
}

/**
 * Validates Excel range references within formulas
 * @param rangeReference - The range reference to validate
 * @param workbookContext - Current workbook context
 * @returns Validation result for the range reference
 */
export function validateRangeReference(
    rangeReference: string,
    workbookContext: IFormulaContext['workbookContext']
): IFormulaValidationResult {
    const startTime = performance.now();

    try {
        // Validate reference format
        const referenceRegex = /^(\$?[A-Z]+\$?\d+)?(:(\$?[A-Z]+\$?\d+))?$/;
        if (!referenceRegex.test(rangeReference)) {
            return createErrorResult('Invalid range reference format');
        }

        // Validate sheet existence if sheet name is included
        if (rangeReference.includes('!')) {
            const [sheetName] = rangeReference.split('!');
            if (!workbookContext.sheets.includes(sheetName)) {
                return createErrorResult(`Sheet "${sheetName}" not found`);
            }
        }

        return {
            isValid: true,
            errors: [],
            suggestions: [],
            performance: {
                processingTime: performance.now() - startTime,
                memoryUsage: process.memoryUsage().heapUsed,
                apiLatency: 0,
                cacheHitRate: calculateCacheHitRate(),
                modelLoadTime: 0,
                totalRequestTime: performance.now() - startTime
            }
        };
    } catch (error) {
        return createErrorResult('Range reference validation failed', undefined, error);
    }
}

/**
 * Validates formula context including workbook state and performance metrics
 * @param context - Formula context to validate
 * @param thresholds - Optional performance thresholds
 * @returns Promise resolving to context validation result
 */
export async function validateFormulaContext(
    context: IFormulaContext,
    thresholds: Partial<typeof PERFORMANCE_THRESHOLDS> = {}
): Promise<IFormulaValidationResult> {
    const startTime = performance.now();

    try {
        const errors = [];

        // Validate selected range
        if (!context.selectedRange || !context.selectedRange.address) {
            errors.push(createFormulaError(
                FormulaErrorType.REFERENCE,
                'No range selected',
                0
            ));
        }

        // Validate workbook context
        if (!context.workbookContext.sheets.length) {
            errors.push(createFormulaError(
                FormulaErrorType.REFERENCE,
                'No sheets available in workbook',
                0
            ));
        }

        return {
            isValid: errors.length === 0,
            errors,
            suggestions: [],
            performance: {
                processingTime: performance.now() - startTime,
                memoryUsage: process.memoryUsage().heapUsed,
                apiLatency: 0,
                cacheHitRate: calculateCacheHitRate(),
                modelLoadTime: 0,
                totalRequestTime: performance.now() - startTime
            }
        };
    } catch (error) {
        return createErrorResult('Context validation failed', undefined, error);
    }
}

/**
 * Creates a standardized formula error object
 * @param errorType - Type of formula error
 * @param message - Error message
 * @param position - Error position in formula
 * @returns Standardized formula error object
 */
export function createFormulaError(
    errorType: FormulaErrorType,
    message: string,
    position: number
): IFormulaValidationResult['errors'][0] {
    return {
        code: EXCEL_ERROR_CODES.FORMULA_VALIDATION_FAILED,
        message,
        position
    };
}

// Private helper functions

function sanitizeFormulaInput(formula: string): string {
    if (!formula) return '';
    return formula
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E]/g, '');
}

function generateRequestId(): string {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateCacheHitRate(): number {
    const total = validationCache.size;
    const hits = Array.from(validationCache.values())
        .filter(entry => Date.now() - entry.timestamp < PERFORMANCE_THRESHOLDS.CACHE_DURATION_MS)
        .length;
    return total ? hits / total : 0;
}

function getCachedValidation(
    formula: string
): IFormulaValidationResult | null {
    const cached = validationCache.get(formula);
    if (cached && Date.now() - cached.timestamp < PERFORMANCE_THRESHOLDS.CACHE_DURATION_MS) {
        return cached.result;
    }
    return null;
}

function cacheValidationResult(
    formula: string,
    result: IFormulaValidationResult
): void {
    validationCache.set(formula, {
        result,
        timestamp: Date.now()
    });

    // Cleanup old cache entries
    for (const [key, value] of validationCache.entries()) {
        if (Date.now() - value.timestamp > PERFORMANCE_THRESHOLDS.CACHE_DURATION_MS) {
            validationCache.delete(key);
        }
    }
}

function createErrorResult(
    message: string,
    metrics?: IPerformanceMetrics,
    error?: any
): IFormulaValidationResult {
    return {
        isValid: false,
        errors: [{
            code: EXCEL_ERROR_CODES.FORMULA_VALIDATION_FAILED,
            message,
            position: 0
        }],
        suggestions: [],
        performance: metrics || {
            processingTime: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            apiLatency: 0,
            cacheHitRate: calculateCacheHitRate(),
            modelLoadTime: 0,
            totalRequestTime: 0
        }
    };
}

function enhanceValidationResult(
    result: IFormulaValidationResult,
    startTime: number
): IFormulaValidationResult {
    return {
        ...result,
        performance: {
            ...result.performance,
            processingTime: performance.now() - startTime,
            totalRequestTime: performance.now() - startTime
        }
    };
}