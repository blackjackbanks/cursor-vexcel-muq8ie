/**
 * @fileoverview Excel middleware implementation for request validation and context management
 * @version 1.0.0
 * @package express@4.18.0
 * @package inversify@6.0.1
 */

import { Request, Response, NextFunction } from 'express'; // @version 4.18.0
import { injectable } from 'inversify'; // @version 6.0.1
import { IExcelService } from '../interfaces/excel.interface';
import { validateRange, validateFormula } from '../utils/excel.utils';
import { ExcelService } from '../services/excel.service';
import {
    WorkbookState,
    RangeSelection,
    ExcelError,
    ExcelEventType
} from '../types/excel.types';
import {
    EXCEL_ERROR_CODES,
    PERFORMANCE_THRESHOLDS
} from '../constants/excel.constants';

/**
 * Enhanced middleware for validating Excel context with performance monitoring
 * and circuit breaker pattern implementation
 */
@injectable()
export class ExcelMiddleware {
    private circuitBreakerState = {
        failures: 0,
        lastFailure: 0,
        isOpen: false
    };

    constructor(private excelService: ExcelService) {}

    /**
     * Validates Excel context and adds workbook state to request
     */
    public validateExcelContext = async (
        req: Request & { workbookState?: WorkbookState },
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            // Check circuit breaker state
            if (this.isCircuitBreakerOpen()) {
                throw new Error('Circuit breaker is open');
            }

            // Start performance monitoring
            const startTime = performance.now();

            // Validate Excel API version
            const isApiValid = await this.excelService.validateApiVersion();
            if (!isApiValid) {
                throw new Error('Unsupported Excel API version');
            }

            // Get current workbook state
            const workbookState = await this.excelService.getCurrentWorkbook();
            if (!workbookState) {
                throw new Error('Failed to get workbook state');
            }

            // Add workbook state to request
            req.workbookState = workbookState;

            // Monitor performance
            const duration = performance.now() - startTime;
            if (duration > PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS) {
                console.warn(`Excel context validation took ${duration}ms`);
            }

            next();
        } catch (error) {
            this.handleCircuitBreakerError();
            res.status(500).json({
                code: EXCEL_ERROR_CODES.INITIALIZATION_FAILED,
                message: 'Excel context validation failed',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            });
        }
    };

    /**
     * Validates range selection with caching and performance optimization
     */
    public validateRangeSelection = async (
        req: Request & { selectedRange?: RangeSelection },
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const startTime = performance.now();

            // Get selected range
            const range = await this.excelService.getSelectedRange();
            if (!range) {
                throw new Error('No range selected');
            }

            // Validate range
            const validation = await validateRange(range);
            if (!validation.isValid) {
                throw validation.error;
            }

            // Add validated range to request
            req.selectedRange = range;

            // Performance monitoring
            const duration = performance.now() - startTime;
            if (duration > PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS) {
                console.warn(`Range validation took ${duration}ms`);
            }

            next();
        } catch (error) {
            const excelError: ExcelError = {
                code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                message: 'Range validation failed',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            };
            res.status(400).json(excelError);
        }
    };

    /**
     * Validates formula input with syntax checking and circular reference detection
     */
    public validateFormulaInput = async (
        req: Request & { validatedFormula?: string },
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { formula } = req.body;
            if (!formula) {
                throw new Error('Formula is required');
            }

            // Start performance monitoring
            const startTime = performance.now();

            // Validate formula
            const validation = await validateFormula(formula);
            if (!validation.isValid) {
                throw validation.error;
            }

            // Add validated formula to request
            req.validatedFormula = formula;

            // Performance monitoring
            const duration = performance.now() - startTime;
            if (duration > PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS) {
                console.warn(`Formula validation took ${duration}ms`);
            }

            next();
        } catch (error) {
            const excelError: ExcelError = {
                code: EXCEL_ERROR_CODES.FORMULA_VALIDATION_FAILED,
                message: 'Formula validation failed',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            };
            res.status(400).json(excelError);
        }
    };

    /**
     * Checks if circuit breaker is open
     */
    private isCircuitBreakerOpen(): boolean {
        if (!this.circuitBreakerState.isOpen) {
            return false;
        }

        // Check if circuit breaker should be reset
        const now = Date.now();
        if (now - this.circuitBreakerState.lastFailure > PERFORMANCE_THRESHOLDS.RETRY_DELAY_MS) {
            this.resetCircuitBreaker();
            return false;
        }

        return true;
    }

    /**
     * Handles circuit breaker error state
     */
    private handleCircuitBreakerError(): void {
        this.circuitBreakerState.failures++;
        this.circuitBreakerState.lastFailure = Date.now();

        if (this.circuitBreakerState.failures >= PERFORMANCE_THRESHOLDS.MAX_RETRY_ATTEMPTS) {
            this.circuitBreakerState.isOpen = true;
        }
    }

    /**
     * Resets circuit breaker state
     */
    private resetCircuitBreaker(): void {
        this.circuitBreakerState = {
            failures: 0,
            lastFailure: 0,
            isOpen: false
        };
    }
}

// Export middleware functions
export const {
    validateExcelContext,
    validateRangeSelection,
    validateFormulaInput
} = new ExcelMiddleware(new ExcelService());