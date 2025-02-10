/**
 * @fileoverview TypeScript interface definitions for data cleaning operations in the Excel Add-in
 * Provides comprehensive type safety and standardization for data cleaning features with enhanced
 * progress tracking and detailed metrics
 * @version 1.0.0
 */

import { IAPIResponse, IDataCleaningOptions } from '@shared/interfaces';

/**
 * Interface for data cleaning request payload
 */
export interface ICleaningRequest {
    /** Unique identifier of the workbook */
    workbookId: string;
    /** Unique identifier of the worksheet */
    worksheetId: string;
    /** Excel range notation (e.g., 'A1:D10') */
    range: string;
    /** Configuration options for cleaning operations */
    options: IDataCleaningOptions;
}

/**
 * Interface for tracking individual cell changes during cleaning
 */
export interface ICellChange {
    /** Excel cell reference (e.g., 'A1') */
    cellReference: string;
    /** Original value before cleaning */
    previousValue: string;
    /** New value after cleaning */
    newValue: string;
    /** Type of cleaning operation applied */
    changeType: CleaningChangeType;
    /** Timestamp when the change was made */
    timestamp: Date;
}

/**
 * Enum for categorizing types of cleaning changes
 */
export enum CleaningChangeType {
    DUPLICATE_REMOVED = 'DUPLICATE_REMOVED',
    MISSING_VALUE_FILLED = 'MISSING_VALUE_FILLED',
    FORMAT_STANDARDIZED = 'FORMAT_STANDARDIZED'
}

/**
 * Enhanced interface for data cleaning operation results with detailed metrics
 */
export interface ICleaningResult {
    /** Total number of changes applied */
    changesApplied: number;
    /** Number of duplicate entries removed */
    duplicatesRemoved: number;
    /** Number of missing values filled */
    missingValuesFilled: number;
    /** Number of formats standardized */
    formatsStandardized: number;
    /** Detailed log of all cell changes */
    cellChanges: ICellChange[];
    /** Total processing time in milliseconds */
    processingTime: number;
    /** Total number of rows processed */
    rowsProcessed: number;
    /** Total number of columns processed */
    columnsProcessed: number;
}

/**
 * Enhanced enum for comprehensive cleaning operation status states
 */
export enum CleaningStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
    PAUSED = 'PAUSED'
}

/**
 * Interface for detailed progress tracking of cleaning operations
 */
export interface ICleaningProgress {
    /** Current status of the cleaning operation */
    status: CleaningStatus;
    /** Progress percentage (0-100) */
    progress: number;
    /** Description of current operation being performed */
    currentOperation: string;
    /** Estimated time remaining in milliseconds */
    estimatedTimeRemaining: number;
    /** Current step number in the cleaning process */
    currentStep: number;
    /** Total number of steps to complete */
    totalSteps: number;
    /** Error details if status is FAILED, null otherwise */
    errorDetails: string | null;
}