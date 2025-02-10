/**
 * @fileoverview Excel service implementation for AI-enhanced Excel Add-in
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 * @package lodash@4.17.21
 */

import { Excel } from '@microsoft/office-js'; // @version 1.1.0
import { debounce } from 'lodash'; // @version 4.17.21
import { injectable, inject } from 'inversify';
import { IExcelService, IExcelEventHandler, ITaskPaneManager } from '../interfaces/excel.interface';
import { validateRange, formatRangeAddress } from '../utils/excel.utils';
import { excelConfig } from '../config/excel.config';
import {
    WorkbookState,
    RangeSelection,
    ExcelError,
    TaskPaneConfig
} from '../types/excel.types';
import {
    TASK_PANE_DIMENSIONS,
    EXCEL_EVENTS,
    EXCEL_ERROR_CODES,
    PERFORMANCE_THRESHOLDS
} from '../constants/excel.constants';

/**
 * Implementation of the Excel service with enhanced validation,
 * performance optimization, and error handling capabilities
 */
@injectable()
export class ExcelService implements IExcelService {
    private currentWorkbook: Excel.Workbook | null = null;
    private operationCache: Map<string, { data: any; timestamp: number }> = new Map();
    private readonly debouncedSelectionHandler: (range: Excel.Range) => void;
    private isInitialized = false;
    private retryAttempts = 0;

    constructor(
        @inject('IExcelEventHandler') private eventHandler: IExcelEventHandler,
        @inject('ITaskPaneManager') private taskPaneManager: ITaskPaneManager,
        @inject('PerformanceMonitor') private perfMonitor: any
    ) {
        // Initialize debounced selection handler
        this.debouncedSelectionHandler = debounce(
            this.handleSelectionChange.bind(this),
            PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS,
            { leading: true, trailing: false }
        );
    }

    /**
     * Initializes the Excel service with enhanced error handling
     * and performance monitoring
     */
    public async initialize(): Promise<void> {
        try {
            this.perfMonitor.startOperation('excel-initialization');

            // Ensure Office.js is ready
            await new Promise<void>((resolve, reject) => {
                Office.onReady((info) => {
                    if (info.host === Office.HostType.Excel) {
                        resolve();
                    } else {
                        reject(new Error('Invalid host application'));
                    }
                });
            });

            await Excel.run(async (context) => {
                // Initialize workbook and event handlers
                this.currentWorkbook = context.workbook;
                const worksheet = this.currentWorkbook.worksheets.getActiveWorksheet();
                
                // Load essential properties
                worksheet.load(['name', 'position']);
                await context.sync();

                // Set up event handlers
                worksheet.onSelectionChanged.add(this.debouncedSelectionHandler);
                worksheet.onActivated.add(async () => {
                    await this.eventHandler.onSheetActivated(worksheet);
                });

                // Initialize task pane
                const config = excelConfig.taskPane;
                await this.taskPaneManager.setWidth(config.width);
                await this.taskPaneManager.setPosition(config.position);

                this.isInitialized = true;
                this.perfMonitor.endOperation('excel-initialization');
            });
        } catch (error) {
            this.perfMonitor.endOperation('excel-initialization', false);
            await this.handleError({
                code: EXCEL_ERROR_CODES.INITIALIZATION_FAILED,
                message: 'Failed to initialize Excel service',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            });
            throw error;
        }
    }

    /**
     * Gets the currently selected range with validation and caching
     */
    public async getSelectedRange(): Promise<RangeSelection | null> {
        try {
            this.perfMonitor.startOperation('get-selected-range');

            // Check cache first
            const cacheKey = 'selected-range';
            const cached = this.operationCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < PERFORMANCE_THRESHOLDS.CACHE_DURATION_MS) {
                return cached.data;
            }

            const range = await Excel.run(async (context) => {
                const range = context.workbook.getSelectedRange();
                range.load(['address', 'values', 'formulas', 'numberFormat', 'rowCount', 'columnCount']);
                await context.sync();

                const selection: RangeSelection = {
                    address: formatRangeAddress(range.address),
                    values: range.values,
                    formulas: range.formulas,
                    numberFormat: range.numberFormat,
                    rowCount: range.rowCount,
                    columnCount: range.columnCount
                };

                // Validate range
                const validation = await validateRange(selection);
                if (!validation.isValid) {
                    await this.handleError(validation.error!);
                    return null;
                }

                // Cache the valid result
                this.operationCache.set(cacheKey, {
                    data: selection,
                    timestamp: Date.now()
                });

                this.perfMonitor.endOperation('get-selected-range');
                return selection;
            });

            return range;
        } catch (error) {
            this.perfMonitor.endOperation('get-selected-range', false);
            await this.handleError({
                code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                message: 'Failed to get selected range',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            });
            return null;
        }
    }

    /**
     * Handles Excel range selection changes with debouncing and validation
     */
    public async handleSelectionChange(range: Excel.Range): Promise<void> {
        try {
            this.perfMonitor.startOperation('handle-selection-change');

            await Excel.run(async (context) => {
                range.load(['address', 'values', 'formulas', 'numberFormat', 'rowCount', 'columnCount']);
                await context.sync();

                const selection: RangeSelection = {
                    address: formatRangeAddress(range.address),
                    values: range.values,
                    formulas: range.formulas,
                    numberFormat: range.numberFormat,
                    rowCount: range.rowCount,
                    columnCount: range.columnCount
                };

                const validation = await validateRange(selection);
                if (validation.isValid) {
                    await this.eventHandler.onSelectionChanged(selection);
                } else {
                    await this.handleError(validation.error!);
                }
            });

            this.perfMonitor.endOperation('handle-selection-change');
        } catch (error) {
            this.perfMonitor.endOperation('handle-selection-change', false);
            await this.handleError({
                code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                message: 'Failed to handle selection change',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            });
        }
    }

    /**
     * Updates task pane position with validation and error handling
     */
    public async setTaskPanePosition(width: number, position: string): Promise<void> {
        try {
            this.perfMonitor.startOperation('set-taskpane-position');

            // Validate width constraints
            if (width < TASK_PANE_DIMENSIONS.MIN_WIDTH || width > TASK_PANE_DIMENSIONS.MAX_WIDTH) {
                throw new Error('Invalid task pane width');
            }

            // Validate position
            if (!['left', 'right'].includes(position)) {
                throw new Error('Invalid task pane position');
            }

            await this.taskPaneManager.setWidth(width);
            await this.taskPaneManager.setPosition(position as 'left' | 'right');

            this.perfMonitor.endOperation('set-taskpane-position');
        } catch (error) {
            this.perfMonitor.endOperation('set-taskpane-position', false);
            await this.handleError({
                code: EXCEL_ERROR_CODES.API_REQUEST_FAILED,
                message: 'Failed to set task pane position',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            });
            throw error;
        }
    }

    /**
     * Handles Excel-related errors with proper logging and user feedback
     */
    public async handleError(error: ExcelError): Promise<void> {
        // Log error
        console.error('Excel operation error:', error);

        // Notify event handler
        await this.eventHandler.onError(error);

        // Implement retry logic for recoverable errors
        if (
            error.severity === 'error' &&
            this.retryAttempts < PERFORMANCE_THRESHOLDS.MAX_RETRY_ATTEMPTS
        ) {
            this.retryAttempts++;
            await new Promise(resolve => setTimeout(resolve, PERFORMANCE_THRESHOLDS.RETRY_DELAY_MS));
            // Retry the last failed operation
            // Implementation depends on the specific operation that failed
        }
    }

    /**
     * Validates the Excel API version compatibility
     */
    public async validateApiVersion(): Promise<boolean> {
        try {
            // Check if ExcelApi 1.1 is supported
            return Office.context.requirements.isSetSupported('ExcelApi', '1.1');
        } catch (error) {
            await this.handleError({
                code: EXCEL_ERROR_CODES.API_REQUEST_FAILED,
                message: 'Failed to validate API version',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'warning'
            });
            return false;
        }
    }
}