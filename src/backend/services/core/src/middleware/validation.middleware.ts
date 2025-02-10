/**
 * @fileoverview Express middleware for request validation with enhanced Excel formula validation
 * Implements comprehensive JSON Schema validation with performance tracking and caching
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import addErrors from 'ajv-errors';
import { injectable } from 'inversify';
import { IFormulaRequest, IFormulaContext, ErrorSeverity, FormulaErrorCode, IFormulaValidationResult } from '../interfaces/formula.interface';
import { ErrorCode } from '@shared/types';

// Constants for validation configuration
const VALIDATION_CACHE_TTL = 3600; // 1 hour cache TTL
const VALIDATION_PERFORMANCE_THRESHOLD = 100; // 100ms threshold for validation performance
const HTTP_STATUS = {
    BAD_REQUEST: 400,
    INTERNAL_SERVER_ERROR: 500
};

/**
 * Interface for validation cache entries
 */
interface ValidationCacheEntry {
    result: boolean;
    timestamp: number;
    errors?: any[];
}

/**
 * Interface for validation performance metrics
 */
interface ValidationMetrics {
    duration: number;
    schemaKey: string;
    timestamp: number;
    success: boolean;
}

/**
 * Decorator for tracking validation performance metrics
 */
function trackValidationMetrics() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const start = performance.now();
            try {
                const result = await originalMethod.apply(this, args);
                const duration = performance.now() - start;
                // Track metrics for monitoring
                this.trackMetric({
                    duration,
                    schemaKey: args[0],
                    timestamp: Date.now(),
                    success: true
                });
                return result;
            } catch (error) {
                const duration = performance.now() - start;
                this.trackMetric({
                    duration,
                    schemaKey: args[0],
                    timestamp: Date.now(),
                    success: false
                });
                throw error;
            }
        };
    };
}

/**
 * Enhanced request validator with performance optimization and Excel formula validation
 */
@injectable()
class RequestValidator {
    private validator: Ajv;
    private schemaCache: Map<string, ValidateFunction>;
    private validationCache: Map<string, ValidationCacheEntry>;
    private metrics: ValidationMetrics[];

    constructor() {
        this.validator = new Ajv({
            allErrors: true,
            verbose: true,
            strict: true,
            strictSchema: true,
            strictTypes: true,
            strictTuples: true,
            validateFormats: true
        });

        // Add custom formats and enhanced error messages
        addFormats(this.validator);
        addErrors(this.validator);
        
        // Initialize caches and metrics
        this.schemaCache = new Map();
        this.validationCache = new Map();
        this.metrics = [];

        // Add custom Excel formula format
        this.validator.addFormat('excel-formula', {
            type: 'string',
            validate: this.validateExcelFormula.bind(this)
        });
    }

    /**
     * Validates Excel formula syntax
     */
    private validateExcelFormula(formula: string): boolean {
        // Basic formula validation - starts with = and contains valid characters
        if (!formula.startsWith('=')) return false;
        
        // Check for balanced parentheses
        let parenthesesCount = 0;
        for (const char of formula) {
            if (char === '(') parenthesesCount++;
            if (char === ')') parenthesesCount--;
            if (parenthesesCount < 0) return false;
        }
        return parenthesesCount === 0;
    }

    /**
     * Validates request against schema with caching and performance tracking
     */
    @trackValidationMetrics()
    public async validate(schemaKey: string, data: any): Promise<IFormulaValidationResult> {
        // Check cache first
        const cacheKey = `${schemaKey}:${JSON.stringify(data)}`;
        const cachedResult = this.validationCache.get(cacheKey);
        
        if (cachedResult && (Date.now() - cachedResult.timestamp) < VALIDATION_CACHE_TTL * 1000) {
            return {
                isValid: cachedResult.result,
                errors: cachedResult.errors || [],
                warnings: [],
                performance: {
                    calculationTime: 0,
                    memoryUsage: 0,
                    isVolatile: false,
                    referenceCount: 0
                }
            };
        }

        // Get or compile schema
        let validateFn = this.schemaCache.get(schemaKey);
        if (!validateFn) {
            const schema = await this.loadSchema(schemaKey);
            validateFn = this.validator.compile(schema);
            this.schemaCache.set(schemaKey, validateFn);
        }

        // Perform validation
        const start = performance.now();
        const isValid = validateFn(data);
        const duration = performance.now() - start;

        // Track performance
        if (duration > VALIDATION_PERFORMANCE_THRESHOLD) {
            console.warn(`Validation performance threshold exceeded for ${schemaKey}: ${duration}ms`);
        }

        const result: IFormulaValidationResult = {
            isValid: isValid,
            errors: validateFn.errors?.map(this.formatValidationError) || [],
            warnings: [],
            performance: {
                calculationTime: duration,
                memoryUsage: process.memoryUsage().heapUsed,
                isVolatile: false,
                referenceCount: 0
            }
        };

        // Cache result
        this.validationCache.set(cacheKey, {
            result: isValid,
            errors: validateFn.errors,
            timestamp: Date.now()
        });

        return result;
    }

    /**
     * Formats validation errors with detailed suggestions
     */
    private formatValidationError(error: any): any {
        return {
            code: FormulaErrorCode.SYNTAX_ERROR,
            message: error.message,
            location: {
                start: error.dataPath ? error.dataPath.length : 0,
                end: error.dataPath ? error.dataPath.length + 10 : 10
            },
            severity: ErrorSeverity.ERROR,
            suggestions: this.generateErrorSuggestions(error)
        };
    }

    /**
     * Generates helpful suggestions for validation errors
     */
    private generateErrorSuggestions(error: any): string[] {
        const suggestions: string[] = [];
        switch (error.keyword) {
            case 'type':
                suggestions.push(`Expected ${error.params.type}, received ${typeof error.data}`);
                break;
            case 'required':
                suggestions.push(`Missing required field: ${error.params.missingProperty}`);
                break;
            case 'format':
                suggestions.push(`Invalid format. Please check the documentation for correct format`);
                break;
            default:
                suggestions.push('Please review the input and try again');
        }
        return suggestions;
    }

    /**
     * Loads schema from cache or file system
     */
    private async loadSchema(schemaKey: string): Promise<JSONSchemaType<any>> {
        // Implementation would load schema from file system or configuration
        // Placeholder for demonstration
        return {
            type: 'object',
            properties: {
                input: { type: 'string', format: 'excel-formula' },
                context: { type: 'object' }
            },
            required: ['input', 'context']
        };
    }

    /**
     * Tracks validation metrics for monitoring
     */
    private trackMetric(metric: ValidationMetrics): void {
        this.metrics.push(metric);
        // Implementation would send metrics to monitoring system
    }
}

/**
 * Express middleware for request validation
 */
export const validateRequest = (schemaKey: string) => {
    const validator = new RequestValidator();
    
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await validator.validate(schemaKey, req.body);
            
            if (!result.isValid) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        message: 'Request validation failed',
                        details: result.errors
                    }
                });
            }
            
            // Attach validation result to request for downstream use
            (req as any).validationResult = result;
            next();
        } catch (error) {
            console.error('Validation error:', error);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Validation system error',
                    details: error
                }
            });
        }
    };
};

export { RequestValidator };