/**
 * @file Version control interfaces for Excel Add-in
 * @description Defines contracts for version control functionality including version history,
 * change tracking, and version management operations
 * @version 1.0.0
 */

import {
    Version,
    VersionId,
    VersionMetadata,
    VersionChange,
    VersionResponse
} from '../types/version.types';

/**
 * Interface defining the contract for version control service operations
 * Implements requirements for change tracking, rollback capabilities, and audit trail
 */
export interface IVersionService {
    /**
     * Retrieves complete version history for a workbook
     * @param workbookId - Unique identifier of the workbook
     * @returns Promise resolving to array of versions with their complete history
     * @throws Error if version history cannot be retrieved
     */
    getVersionHistory(workbookId: string): Promise<VersionResponse<Version[]>>;

    /**
     * Creates a new version with comprehensive metadata
     * @param workbookId - Unique identifier of the workbook
     * @param metadata - Complete metadata for the new version
     * @returns Promise resolving to the newly created version
     * @throws Error if version creation fails
     */
    createVersion(workbookId: string, metadata: VersionMetadata): Promise<VersionResponse<Version>>;

    /**
     * Restores workbook to a specific version
     * @param workbookId - Unique identifier of the workbook
     * @param versionId - ID of the version to restore
     * @returns Promise resolving to the restored version
     * @throws Error if version restoration fails
     */
    restoreVersion(workbookId: string, versionId: VersionId): Promise<VersionResponse<Version>>;

    /**
     * Compares two versions and provides detailed difference analysis
     * @param workbookId - Unique identifier of the workbook
     * @param fromVersionId - Source version for comparison
     * @param toVersionId - Target version for comparison
     * @returns Promise resolving to version comparison results
     * @throws Error if version comparison fails
     */
    compareVersions(
        workbookId: string,
        fromVersionId: VersionId,
        toVersionId: VersionId
    ): Promise<VersionResponse<IVersionCompareResult>>;
}

/**
 * Interface for managing version control state in the application
 * Provides immutable version history and loading states
 */
export interface IVersionState {
    /** Currently active version, null if no version is selected */
    readonly currentVersion: Version | null;

    /** Immutable array of all versions in the history */
    readonly versionHistory: readonly Version[];

    /** Loading state indicator for async operations */
    readonly isLoading: boolean;

    /** Error state message, null if no error */
    readonly error: string | null;
}

/**
 * Interface defining the structure of version comparison results
 * Supports detailed change tracking and difference analysis
 */
export interface IVersionCompareResult {
    /** Source version used in comparison */
    readonly fromVersion: Version;

    /** Target version used in comparison */
    readonly toVersion: Version;

    /** Immutable array of all differences between versions */
    readonly differences: readonly VersionChange[];

    /** Human-readable summary of changes between versions */
    readonly summary: string;
}