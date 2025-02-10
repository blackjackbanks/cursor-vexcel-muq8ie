/**
 * @fileoverview Advanced React hook for Excel functionality with performance optimization,
 * error handling, and accessibility support following Microsoft Fluent Design System
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 * @package react@18.2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // @version 18.2.0
import { Excel } from '@microsoft/office-js'; // @version 1.1.0
import { ExcelService } from '../services/excel.service';
import { validateRange, calculateTaskPaneWidth, debounce } from '../utils/excel.utils';
import {
    WorkbookState,
    RangeSelection,
    ExcelError,
    TaskPaneConfig,
    ExcelEventType
} from '../types/excel.types';
import {
    TASK_PANE_DIMENSIONS,
    EXCEL_EVENTS,
    EXCEL_ERROR_CODES,
    PERFORMANCE_THRESHOLDS
} from '../constants/excel.constants';

/**
 * Performance metrics interface for monitoring Excel operations
 */
interface PerformanceMetrics {
    operationTimes: Map<string, number>;
    lastSync: Date;
    averageResponseTime: number;
    errorCount: number;
}

/**
 * Custom hook for managing Excel interactions with enhanced functionality
 */
export function useExcel() {
    // State management with TypeScript type safety
    const [workbookState, setWorkbookState] = useState<WorkbookState>({
        isLoading: true,
        activeSheet: null,
        selectedRange: null,
        error: null,
        lastSync: new Date()
    });

    const [performance, setPerformance] = useState<PerformanceMetrics>({
        operationTimes: new Map(),
        lastSync: new Date(),
        averageResponseTime: 0,
        errorCount: 0
    });

    // Refs for persistent values
    const excelServiceRef = useRef<ExcelService | null>(null);
    const operationCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
    const retryAttemptsRef = useRef<number>(0);

    // Memoized Excel service instance
    const excelService = useMemo(() => {
        if (!excelServiceRef.current) {
            excelServiceRef.current = new ExcelService();
        }
        return excelServiceRef.current;
    }, []);

    /**
     * Debounced selection change handler for performance optimization
     */
    const debouncedSelectionHandler = useCallback(
        debounce(async (range: Excel.Range) => {
            try {
                const selection = await excelService.handleSelectionChange(range);
                if (selection) {
                    setWorkbookState(prev => ({
                        ...prev,
                        selectedRange: selection,
                        lastSync: new Date()
                    }));
                }
            } catch (error) {
                handleError(error);
            }
        }, PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS),
        [excelService]
    );

    /**
     * Enhanced error handler with retry logic and performance tracking
     */
    const handleError = useCallback(async (error: any): Promise<void> => {
        const excelError: ExcelError = {
            code: error.code || EXCEL_ERROR_CODES.API_REQUEST_FAILED,
            message: error.message || 'An unknown error occurred',
            details: error.details || {},
            timestamp: new Date(),
            severity: error.severity || 'error'
        };

        setWorkbookState(prev => ({ ...prev, error: excelError }));
        setPerformance(prev => ({
            ...prev,
            errorCount: prev.errorCount + 1
        }));

        // Implement retry logic for recoverable errors
        if (
            excelError.severity === 'error' &&
            retryAttemptsRef.current < PERFORMANCE_THRESHOLDS.MAX_RETRY_ATTEMPTS
        ) {
            retryAttemptsRef.current++;
            await new Promise(resolve => 
                setTimeout(resolve, PERFORMANCE_THRESHOLDS.RETRY_DELAY_MS)
            );
            await initializeExcel();
        }
    }, []);

    /**
     * Initialize Excel with enhanced error handling and performance monitoring
     */
    const initializeExcel = useCallback(async (): Promise<void> => {
        try {
            const startTime = performance.now();
            setWorkbookState(prev => ({ ...prev, isLoading: true }));

            await excelService.initialize();
            const currentRange = await excelService.getSelectedRange();

            setWorkbookState(prev => ({
                ...prev,
                isLoading: false,
                selectedRange: currentRange,
                error: null,
                lastSync: new Date()
            }));

            // Update performance metrics
            const endTime = performance.now();
            setPerformance(prev => ({
                ...prev,
                operationTimes: prev.operationTimes.set('initialization', endTime - startTime),
                lastSync: new Date()
            }));

            retryAttemptsRef.current = 0;
        } catch (error) {
            handleError(error);
        }
    }, [excelService, handleError]);

    /**
     * Handle range selection with validation and performance optimization
     */
    const handleRangeSelection = useCallback(async (
        range: Excel.Range
    ): Promise<void> => {
        try {
            const startTime = performance.now();
            const validation = await validateRange({
                address: range.address,
                values: range.values,
                formulas: range.formulas,
                numberFormat: range.numberFormat,
                rowCount: range.rowCount,
                columnCount: range.columnCount
            });

            if (!validation.isValid) {
                throw validation.error;
            }

            await debouncedSelectionHandler(range);

            // Update performance metrics
            const endTime = performance.now();
            setPerformance(prev => ({
                ...prev,
                operationTimes: prev.operationTimes.set('rangeSelection', endTime - startTime),
                averageResponseTime: calculateAverageResponseTime(prev.operationTimes)
            }));
        } catch (error) {
            handleError(error);
        }
    }, [debouncedSelectionHandler]);

    /**
     * Update task pane configuration with validation
     */
    const updateTaskPane = useCallback(async (
        width: number,
        position: string
    ): Promise<void> => {
        try {
            const validWidth = calculateTaskPaneWidth(width);
            await excelService.setTaskPanePosition(validWidth, position);
        } catch (error) {
            handleError(error);
        }
    }, [excelService]);

    /**
     * Calculate average response time for performance monitoring
     */
    const calculateAverageResponseTime = (
        times: Map<string, number>
    ): number => {
        if (times.size === 0) return 0;
        const sum = Array.from(times.values()).reduce((acc, time) => acc + time, 0);
        return sum / times.size;
    };

    /**
     * Clear operation cache for memory optimization
     */
    const clearCache = useCallback((): void => {
        operationCacheRef.current.clear();
    }, []);

    /**
     * Reset performance metrics
     */
    const resetPerformanceMetrics = useCallback((): void => {
        setPerformance({
            operationTimes: new Map(),
            lastSync: new Date(),
            averageResponseTime: 0,
            errorCount: 0
        });
    }, []);

    // Initialize Excel on mount
    useEffect(() => {
        initializeExcel();

        // Cleanup on unmount
        return () => {
            clearCache();
            debouncedSelectionHandler.cancel();
        };
    }, [initializeExcel, debouncedSelectionHandler]);

    return {
        workbookState,
        performance,
        initializeExcel,
        handleRangeSelection,
        updateTaskPane,
        clearCache,
        resetPerformanceMetrics
    };
}