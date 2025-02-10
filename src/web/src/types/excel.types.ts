/**
 * @fileoverview Type definitions for Excel-related operations and state management
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { Excel } from "@microsoft/office-js";

/**
 * Constants for task pane dimensions in pixels
 */
export const TASK_PANE_DEFAULT_WIDTH = 350;
export const TASK_PANE_MIN_WIDTH = 50;
export const TASK_PANE_MAX_WIDTH = 800;

/**
 * Represents the immutable state of the Excel workbook
 */
export type WorkbookState = Readonly<{
    isLoading: boolean;
    activeSheet: Excel.Worksheet | null;
    selectedRange: Readonly<RangeSelection> | null;
    error: Readonly<ExcelError> | null;
    lastSync: Date;
}>;

/**
 * Represents an immutable selection of cells in Excel
 * with their associated data and metadata
 */
export type RangeSelection = Readonly<{
    address: string;
    values: ReadonlyArray<ReadonlyArray<unknown>>;
    formulas: ReadonlyArray<ReadonlyArray<string>>;
    numberFormat: ReadonlyArray<ReadonlyArray<string>>;
    rowCount: number;
    columnCount: number;
}>;

/**
 * Represents an error that occurred during Excel operations
 * with associated metadata and severity level
 */
export type ExcelError = Readonly<{
    code: string;
    message: string;
    details: Readonly<Record<string, unknown>>;
    timestamp: Date;
    severity: 'error' | 'warning' | 'info';
}>;

/**
 * Represents the configuration and state of the Excel task pane
 * following Microsoft Office design specifications
 */
export type TaskPaneConfig = Readonly<{
    width: number;
    minWidth: number;
    maxWidth: number;
    position: 'left' | 'right';
    isCollapsed: boolean;
    visibility: 'visible' | 'hidden' | 'collapsed';
}>;

/**
 * Represents Excel events with associated metadata
 * for tracking and handling user and system interactions
 */
export type ExcelEventType = Readonly<{
    value: 'SelectionChanged' 
        | 'SheetActivated' 
        | 'WorkbookChanged' 
        | 'FormulaChanged' 
        | 'DataValidationTriggered' 
        | 'RangeFormatChanged';
    timestamp: Date;
    source: 'user' | 'system' | 'addin';
}>;