/**
 * @fileoverview Version control and change tracking system interfaces for Excel Add-in core service.
 * Supports enterprise-grade audit trails, rollback capabilities, and comprehensive change tracking.
 * @version 1.0.0
 */

/**
 * Strong type alias for version identifiers ensuring consistent version referencing
 */
export type IVersionId = string;

/**
 * Comprehensive enumeration of all possible version change types in the system
 */
export enum IVersionChangeType {
    FORMULA = 'FORMULA',       // Changes to cell formulas
    DATA = 'DATA',            // Changes to cell values
    FORMAT = 'FORMAT',        // Changes to cell formatting
    STRUCTURE = 'STRUCTURE',  // Changes to worksheet structure
    VALIDATION = 'VALIDATION' // Changes to data validation rules
}

/**
 * Interface for version metadata supporting comprehensive audit requirements
 */
export interface IVersionMetadata {
    /** Service that initiated the change */
    service: string;
    /** Specific action performed */
    action: string;
    /** Human-readable description of the change */
    description: string;
    /** Client-specific information */
    clientInfo: {
        platform?: string;
        version?: string;
        locale?: string;
        [key: string]: unknown;
    };
    /** User agent string from the client */
    userAgent: string;
    /** IP address of the client */
    ipAddress: string;
}

/**
 * Interface for tracking individual cell changes with full audit support
 */
export interface IVersionChange {
    /** Excel cell reference (e.g., 'A1', 'Sheet1!B2') */
    cellReference: string;
    /** Previous cell value/formula/format */
    previousValue: string;
    /** New cell value/formula/format */
    newValue: string;
    /** Type of change made */
    changeType: IVersionChangeType;
    /** Timestamp of the change */
    timestamp: Date;
    /** ID of user who made the change */
    userId: string;
    /** Detailed metadata about the change */
    metadata: IVersionMetadata;
}

/**
 * Comprehensive interface for version records with support for version lineage and tagging
 */
export interface IVersion {
    /** Unique version identifier */
    id: IVersionId;
    /** Associated workbook identifier */
    workbookId: string;
    /** Associated worksheet identifier */
    worksheetId: string;
    /** Sequential version number */
    versionNumber: number;
    /** Version creation timestamp */
    timestamp: Date;
    /** ID of user who created the version */
    userId: string;
    /** ID of parent version (null for initial version) */
    parentVersionId: IVersionId | null;
    /** User-defined tags for version organization */
    tags: string[];
    /** Indicates if version is archived */
    isArchived: boolean;
}

/**
 * Interface for paginated version API responses
 */
export interface IVersionResponse {
    /** Version information */
    version: IVersion;
    /** Version metadata */
    metadata: IVersionMetadata;
    /** List of changes in this version */
    changes: IVersionChange[];
    /** Pagination information */
    pagination: {
        currentPage: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}

/**
 * Service interface defining all version control operations
 */
export interface IVersionService {
    /**
     * Creates a new version
     * @param workbookId - ID of the workbook
     * @param changes - Array of changes to version
     * @param metadata - Version metadata
     */
    createVersion(workbookId: string, changes: IVersionChange[], metadata: IVersionMetadata): Promise<IVersion>;

    /**
     * Retrieves a specific version
     * @param versionId - ID of the version to retrieve
     */
    getVersion(versionId: IVersionId): Promise<IVersionResponse>;

    /**
     * Lists versions with pagination
     * @param workbookId - ID of the workbook
     * @param page - Page number
     * @param pageSize - Number of items per page
     */
    listVersions(workbookId: string, page: number, pageSize: number): Promise<IVersionResponse[]>;

    /**
     * Reverts workbook to a specific version
     * @param versionId - ID of the version to revert to
     */
    revertToVersion(versionId: IVersionId): Promise<IVersion>;

    /**
     * Compares two versions
     * @param sourceVersionId - ID of source version
     * @param targetVersionId - ID of target version
     */
    compareVersions(sourceVersionId: IVersionId, targetVersionId: IVersionId): Promise<IVersionChange[]>;

    /**
     * Archives a version
     * @param versionId - ID of the version to archive
     */
    archiveVersion(versionId: IVersionId): Promise<void>;

    /**
     * Tags a version
     * @param versionId - ID of the version to tag
     * @param tags - Array of tags to apply
     */
    tagVersion(versionId: IVersionId, tags: string[]): Promise<IVersion>;
}