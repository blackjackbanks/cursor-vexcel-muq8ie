/**
 * Type definitions for version control functionality in the Excel Add-in
 * Provides comprehensive type safety for version history, change tracking, and audit trail features
 * @version 1.0.0
 */

/**
 * Unique version identifier using UUID format
 */
export type VersionId = string;

/**
 * Semantic version number (e.g., '1.0.0')
 */
export type VersionNumber = string;

/**
 * Enum defining all possible types of version changes for accurate change tracking
 */
export enum VersionChangeType {
    FORMULA_UPDATE = 'FORMULA_UPDATE',
    DATA_CLEANING = 'DATA_CLEANING',
    CELL_MODIFICATION = 'CELL_MODIFICATION',
    SHEET_STRUCTURE = 'SHEET_STRUCTURE'
}

/**
 * Type for comprehensive version metadata supporting audit trail requirements
 */
export type VersionMetadata = {
    /** Timestamp when the version was created */
    readonly timestamp: Date;
    
    /** User who created the version */
    readonly author: string;
    
    /** Description of changes made in this version */
    readonly description: string;
    
    /** Type of change that triggered this version */
    readonly changeType: VersionChangeType;
    
    /** ID of the workbook where changes occurred */
    readonly workbookId: string;
    
    /** ID of the worksheet where changes occurred */
    readonly worksheetId: string;
};

/**
 * Type for detailed individual change tracking with support for formulas and values
 */
export type VersionChange = {
    /** Excel cell reference (e.g., 'A1', 'B2:C3') */
    readonly cellReference: string;
    
    /** Previous value before the change */
    readonly previousValue: string;
    
    /** New value after the change */
    readonly newValue: string;
    
    /** Type of change made */
    readonly changeType: VersionChangeType;
    
    /** Timestamp when this specific change occurred */
    readonly timestamp: Date;
    
    /** Formula if the change involved formula modification, null otherwise */
    readonly formula: string | null;
};

/**
 * Comprehensive type for complete version information with immutable changes array
 */
export type Version = {
    /** Unique identifier for this version */
    readonly id: VersionId;
    
    /** Semantic version number */
    readonly number: VersionNumber;
    
    /** Metadata about this version */
    readonly metadata: VersionMetadata;
    
    /** Array of all changes in this version (immutable) */
    readonly changes: ReadonlyArray<VersionChange>;
    
    /** ID of the parent version, null if this is the initial version */
    readonly parentVersionId: VersionId | null;
};

/**
 * Type for API responses with proper error handling and null safety
 */
export type VersionResponse = {
    /** Indicates if the operation was successful */
    readonly success: boolean;
    
    /** Version information if operation was successful, null otherwise */
    readonly version: Version | null;
    
    /** Error message if operation failed, null otherwise */
    readonly error: string | null;
    
    /** Timestamp of the response */
    readonly timestamp: Date;
};