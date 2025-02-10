/**
 * @fileoverview Excel interface definitions for AI-enhanced Excel Add-in
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { Excel } from '@microsoft/office-js';
import {
    WorkbookState,
    RangeSelection,
    ExcelError,
    TaskPaneConfig,
    ExcelEventType
} from '../types/excel.types';

/**
 * Constants for task pane dimensions following Microsoft Office design specifications
 */
export const DEFAULT_TASK_PANE_WIDTH = 350;
export const MIN_TASK_PANE_WIDTH = 50;
export const MAX_TASK_PANE_WIDTH = 800;

/**
 * Core interface for Excel service operations with enhanced error handling
 * and version validation capabilities
 */
export interface IExcelService {
    /**
     * Initializes the Excel service and establishes connection with the host
     * @throws {ExcelError} When initialization fails
     */
    initialize(): Promise<void>;

    /**
     * Retrieves the currently selected range in the active worksheet
     * @returns Promise resolving to the selected range or null if no selection
     */
    getSelectedRange(): Promise<RangeSelection | null>;

    /**
     * Retrieves the current workbook state including active sheet and selection
     * @returns Promise resolving to the current workbook state
     */
    getCurrentWorkbook(): Promise<WorkbookState>;

    /**
     * Handles changes in cell selection with type safety
     * @param range - The newly selected Excel range
     */
    handleSelectionChange(range: Excel.Range): Promise<void>;

    /**
     * Configures the task pane position and dimensions
     * @param width - Width in pixels (50-800)
     * @param position - Task pane position ('left' | 'right')
     */
    setTaskPanePosition(width: number, position: string): Promise<void>;

    /**
     * Handles Excel-related errors with proper logging and user feedback
     * @param error - The Excel error to handle
     */
    handleError(error: ExcelError): Promise<void>;

    /**
     * Validates the Excel API version compatibility
     * @returns Promise resolving to boolean indicating compatibility
     */
    validateApiVersion(): Promise<boolean>;
}

/**
 * Interface for handling Excel events with type safety and proper event tracking
 */
export interface IExcelEventHandler {
    /**
     * Handles cell selection change events
     * @param range - The newly selected range
     */
    onSelectionChanged(range: RangeSelection): void;

    /**
     * Handles worksheet activation events
     * @param worksheet - The newly activated worksheet
     */
    onSheetActivated(worksheet: Excel.Worksheet): void;

    /**
     * Handles workbook state change events
     * @param state - The new workbook state
     */
    onWorkbookChanged(state: WorkbookState): void;

    /**
     * Handles Excel operation errors
     * @param error - The error that occurred
     */
    onError(error: ExcelError): void;

    /**
     * Handles changes in Excel event types
     * @param eventType - The new event type
     */
    onEventTypeChange(eventType: ExcelEventType): void;
}

/**
 * Interface for managing Excel task pane behavior and configuration
 * following Microsoft Office design specifications
 */
export interface ITaskPaneManager {
    /**
     * Retrieves current task pane configuration
     * @returns The current task pane configuration
     */
    getConfig(): TaskPaneConfig;

    /**
     * Sets the task pane width within allowed bounds
     * @param width - Width in pixels (50-800)
     */
    setWidth(width: number): void;

    /**
     * Sets the task pane position
     * @param position - Position ('left' | 'right')
     */
    setPosition(position: 'left' | 'right'): void;

    /**
     * Collapses the task pane to minimum width
     */
    collapse(): void;

    /**
     * Expands the task pane to last known width
     */
    expand(): void;

    /**
     * Validates task pane configuration against Office specifications
     * @param config - The configuration to validate
     * @returns Boolean indicating if configuration is valid
     */
    validateConfig(config: TaskPaneConfig): boolean;
}