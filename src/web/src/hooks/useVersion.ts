/**
 * Custom React hook for managing version control functionality in the Excel Add-in
 * Implements comprehensive version history management with optimized performance
 * @version 1.0.0
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectCurrentVersion,
    selectVersionHistory,
    selectVersionLoading,
    selectVersionError,
    fetchVersionHistory,
    createNewVersion,
    restoreToVersion
} from '../store/slices/versionSlice';
import { IVersionState, IVersionCompareResult } from '../interfaces/version.interface';
import { Version, VersionChange, VersionChangeType } from '../types/version.types';

/**
 * Hook interface for version control operations
 */
interface UseVersionReturn {
    currentVersion: Version | null;
    versionHistory: Version[];
    isLoading: boolean;
    error: string | null;
    fetchHistory: (force?: boolean) => Promise<void>;
    createVersion: (
        changes: VersionChange[],
        changeType: VersionChangeType,
        description: string
    ) => Promise<void>;
    restoreVersion: (versionId: string) => Promise<void>;
    compareVersions: (fromVersionId: string, toVersionId: string) => Promise<IVersionCompareResult | null>;
    clearError: () => void;
}

/**
 * Custom hook providing comprehensive version control functionality
 * @param workbookId - ID of the current workbook
 * @returns Version control methods and state
 */
export const useVersion = (workbookId: string): UseVersionReturn => {
    const dispatch = useDispatch();

    // Memoized selectors for performance optimization
    const currentVersion = useSelector(selectCurrentVersion);
    const versionHistory = useSelector(selectVersionHistory);
    const isLoading = useSelector(selectVersionLoading);
    const error = useSelector(selectVersionError);

    // Request deduplication with force refresh option
    const fetchHistory = useCallback(async (force: boolean = false) => {
        if (!workbookId) {
            throw new Error('Workbook ID is required');
        }

        if (force || !versionHistory.length) {
            await dispatch(fetchVersionHistory(workbookId));
        }
    }, [dispatch, workbookId, versionHistory.length]);

    // Create new version with optimistic updates
    const createVersion = useCallback(async (
        changes: VersionChange[],
        changeType: VersionChangeType,
        description: string
    ) => {
        if (!workbookId || !changes.length) {
            throw new Error('Invalid version creation parameters');
        }

        await dispatch(createNewVersion({
            workbookId,
            changes,
            changeType,
            description
        }));
    }, [dispatch, workbookId]);

    // Restore to previous version with error handling
    const restoreVersion = useCallback(async (versionId: string) => {
        if (!workbookId || !versionId) {
            throw new Error('Invalid version restoration parameters');
        }

        await dispatch(restoreToVersion({
            workbookId,
            versionId
        }));
    }, [dispatch, workbookId]);

    // Compare versions with memoized results
    const compareVersions = useCallback(async (
        fromVersionId: string,
        toVersionId: string
    ): Promise<IVersionCompareResult | null> => {
        if (!fromVersionId || !toVersionId) {
            throw new Error('Both version IDs are required for comparison');
        }

        const fromVersion = versionHistory.find(v => v.id === fromVersionId);
        const toVersion = versionHistory.find(v => v.id === toVersionId);

        if (!fromVersion || !toVersion) {
            throw new Error('One or both versions not found in history');
        }

        // Compute differences between versions
        const differences = toVersion.changes.filter(change => {
            const previousChange = fromVersion.changes.find(
                c => c.cellReference === change.cellReference
            );
            return !previousChange || previousChange.newValue !== change.newValue;
        });

        return {
            fromVersion,
            toVersion,
            differences,
            summary: `${differences.length} changes between versions ${fromVersion.number} and ${toVersion.number}`
        };
    }, [versionHistory]);

    // Clear error state
    const clearError = useCallback(() => {
        dispatch({ type: 'version/clearError' });
    }, [dispatch]);

    // Initial version history fetch
    useEffect(() => {
        if (workbookId) {
            fetchHistory();
        }
        
        // Cleanup on unmount
        return () => {
            dispatch({ type: 'version/clearVersionState' });
        };
    }, [workbookId, fetchHistory, dispatch]);

    // Memoized return value for consistent reference
    return useMemo(() => ({
        currentVersion,
        versionHistory,
        isLoading,
        error,
        fetchHistory,
        createVersion,
        restoreVersion,
        compareVersions,
        clearError
    }), [
        currentVersion,
        versionHistory,
        isLoading,
        error,
        fetchHistory,
        createVersion,
        restoreVersion,
        compareVersions,
        clearError
    ]);
};