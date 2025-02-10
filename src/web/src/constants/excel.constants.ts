/**
 * @fileoverview Constants for Excel-related operations, task pane dimensions, event types, and error codes
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { ExcelEventType } from '../types/excel.types';
import * as Office from '@microsoft/office-js'; // @version 1.1.0

/**
 * Task pane dimension constants following Microsoft Office Fluent Design System
 * specifications for optimal UI layout and responsiveness
 */
export const TASK_PANE_DIMENSIONS = {
    DEFAULT_WIDTH: 350,
    MIN_WIDTH: 50,
    MAX_WIDTH: 800,
    COLLAPSED_WIDTH: 50
} as const;

/**
 * Excel event type constants for handling various worksheet and workbook events
 * These events are used for tracking user interactions and system changes
 */
export const EXCEL_EVENTS = {
    SELECTION_CHANGED: 'SelectionChanged',
    SHEET_ACTIVATED: 'SheetActivated',
    WORKBOOK_CHANGED: 'WorkbookChanged',
    FORMULA_CHANGED: 'FormulaChanged'
} as const;

/**
 * Error codes for Excel operations to standardize error handling
 * and provide meaningful error messages to users
 */
export const EXCEL_ERROR_CODES = {
    INITIALIZATION_FAILED: 'EXCEL_INIT_ERROR',
    RANGE_SELECTION_FAILED: 'RANGE_SELECT_ERROR',
    FORMULA_VALIDATION_FAILED: 'FORMULA_VALIDATION_ERROR',
    API_REQUEST_FAILED: 'API_REQUEST_ERROR'
} as const;

/**
 * Performance thresholds and limits to ensure optimal operation
 * and prevent system overload or degraded user experience
 */
export const PERFORMANCE_THRESHOLDS = {
    MAX_FORMULA_LENGTH: 8192,      // Maximum characters in a formula
    MAX_RANGE_SIZE: 10000,         // Maximum cells in a range operation
    SYNC_INTERVAL_MS: 2000,        // Interval for syncing with Excel
    SUGGESTION_TIMEOUT_MS: 5000,   // Timeout for AI suggestions
    MAX_SUGGESTIONS: 5,            // Maximum number of AI suggestions
    CACHE_DURATION_MS: 300000,     // Cache duration (5 minutes)
    MAX_RETRY_ATTEMPTS: 3,         // Maximum API retry attempts
    RETRY_DELAY_MS: 1000,         // Delay between retries
    BATCH_SIZE: 1000,             // Batch size for data operations
    MAX_CONCURRENT_REQUESTS: 5     // Maximum concurrent API requests
} as const;

/**
 * Task pane position constants for controlling the add-in's
 * placement within the Excel window
 */
export const TASK_PANE_POSITIONS = {
    LEFT: 'left',
    RIGHT: 'right'
} as const;

// Type assertions to ensure type safety and immutability
type TaskPaneDimensions = typeof TASK_PANE_DIMENSIONS;
type ExcelEvents = typeof EXCEL_EVENTS;
type ExcelErrorCodes = typeof EXCEL_ERROR_CODES;
type PerformanceThresholds = typeof PERFORMANCE_THRESHOLDS;
type TaskPanePositions = typeof TASK_PANE_POSITIONS;

// Freeze objects to prevent runtime modifications
Object.freeze(TASK_PANE_DIMENSIONS);
Object.freeze(EXCEL_EVENTS);
Object.freeze(EXCEL_ERROR_CODES);
Object.freeze(PERFORMANCE_THRESHOLDS);
Object.freeze(TASK_PANE_POSITIONS);