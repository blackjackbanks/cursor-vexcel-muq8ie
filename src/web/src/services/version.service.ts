/**
 * Version Control Service for Excel Add-in
 * Implements comprehensive version history, change tracking, and rollback capabilities
 * @version 1.0.0
 */

import {
    IVersionService,
    IVersionState,
    IVersionCompareResult
} from '../interfaces/version.interface';
import { apiService } from './api.service';
import {
    Version,
    VersionId,
    VersionResponse,
    VersionChange,
    VersionChangeType
} from '../types/version.types';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Service class implementing version control functionality
 * Handles version history, change tracking, rollback capabilities, and version comparisons
 */
export class VersionService implements IVersionService {
    private currentVersion: Version | null = null;

    /**
     * Retrieves complete version history for a workbook
     * @param workbookId - Unique identifier of the workbook
     * @returns Promise resolving to array of versions with their complete history
     * @throws Error if version history cannot be retrieved
     */
    public async getVersionHistory(workbookId: string): Promise<VersionResponse<Version[]>> {
        try {
            const response = await apiService.get<VersionResponse<Version[]>>(
                `${API_ENDPOINTS.VERSION.GET}?workbookId=${workbookId}`
            );

            if (response.success && response.version) {
                // Sort versions by timestamp in descending order
                const sortedVersions = response.version.sort((a, b) => 
                    new Date(b.metadata.timestamp).getTime() - 
                    new Date(a.metadata.timestamp).getTime()
                );

                return {
                    success: true,
                    version: sortedVersions,
                    error: null,
                    timestamp: new Date()
                };
            }

            throw new Error(response.error || 'Failed to retrieve version history');
        } catch (error) {
            console.error('Error retrieving version history:', error);
            return {
                success: false,
                version: null,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }

    /**
     * Creates a new version with the specified changes
     * @param workbookId - Unique identifier of the workbook
     * @param changes - Array of changes made in this version
     * @param changeType - Type of changes made
     * @param description - Description of the changes
     * @returns Promise resolving to the newly created version
     * @throws Error if version creation fails
     */
    public async createVersion(
        workbookId: string,
        changes: VersionChange[],
        changeType: VersionChangeType,
        description: string
    ): Promise<VersionResponse<Version>> {
        try {
            if (!changes || changes.length === 0) {
                throw new Error('No changes provided for version creation');
            }

            const versionData = {
                workbookId,
                changes,
                metadata: {
                    timestamp: new Date(),
                    changeType,
                    description,
                    author: 'current_user', // Should be replaced with actual user ID
                    workbookId,
                    worksheetId: changes[0].cellReference.split('!')[0] // Extract worksheet ID from cell reference
                }
            };

            const response = await apiService.post<VersionResponse<Version>>(
                API_ENDPOINTS.VERSION.GET,
                versionData
            );

            if (response.success && response.version) {
                this.currentVersion = response.version;
                return response;
            }

            throw new Error(response.error || 'Failed to create version');
        } catch (error) {
            console.error('Error creating version:', error);
            return {
                success: false,
                version: null,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }

    /**
     * Restores workbook to a specific version
     * @param workbookId - Unique identifier of the workbook
     * @param versionId - ID of the version to restore
     * @returns Promise resolving to the restored version
     * @throws Error if version restoration fails
     */
    public async restoreVersion(
        workbookId: string,
        versionId: VersionId
    ): Promise<VersionResponse<Version>> {
        try {
            if (!versionId) {
                throw new Error('Version ID is required for restoration');
            }

            const response = await apiService.post<VersionResponse<Version>>(
                API_ENDPOINTS.VERSION.RESTORE.replace(':id', versionId),
                { workbookId }
            );

            if (response.success && response.version) {
                this.currentVersion = response.version;
                return response;
            }

            throw new Error(response.error || 'Failed to restore version');
        } catch (error) {
            console.error('Error restoring version:', error);
            return {
                success: false,
                version: null,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }

    /**
     * Compares two versions and provides detailed difference analysis
     * @param workbookId - Unique identifier of the workbook
     * @param fromVersionId - Source version for comparison
     * @param toVersionId - Target version for comparison
     * @returns Promise resolving to version comparison results
     * @throws Error if version comparison fails
     */
    public async compareVersions(
        workbookId: string,
        fromVersionId: VersionId,
        toVersionId: VersionId
    ): Promise<VersionResponse<IVersionCompareResult>> {
        try {
            if (!fromVersionId || !toVersionId) {
                throw new Error('Both source and target version IDs are required for comparison');
            }

            const response = await apiService.get<VersionResponse<IVersionCompareResult>>(
                `${API_ENDPOINTS.VERSION.COMPARE}?workbookId=${workbookId}&fromVersion=${fromVersionId}&toVersion=${toVersionId}`
            );

            if (response.success && response.version) {
                return response;
            }

            throw new Error(response.error || 'Failed to compare versions');
        } catch (error) {
            console.error('Error comparing versions:', error);
            return {
                success: false,
                version: null,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }

    /**
     * Gets the current active version
     * @returns Current version or null if no version is active
     */
    public getCurrentVersion(): Version | null {
        return this.currentVersion;
    }
}

// Export singleton instance
export const versionService = new VersionService();