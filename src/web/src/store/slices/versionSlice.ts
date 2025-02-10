/**
 * Version Control Redux Slice
 * Implements comprehensive version history tracking and state management
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import { 
    Version, 
    VersionId, 
    VersionChange, 
    VersionChangeType, 
    IVersionCompareResult 
} from '../../types/version.types';
import { IVersionState } from '../../interfaces/version.interface';
import { versionService } from '../../services/version.service';
import { ERROR_CODES } from '../../constants/api.constants';

// Initial state with strict type safety
const initialState: IVersionState = {
    currentVersion: null,
    versionHistory: [],
    isLoading: false,
    error: null,
    pendingOperations: new Map()
};

// Async thunk for fetching version history with request deduplication
export const fetchVersionHistory = createAsyncThunk(
    'version/fetchHistory',
    async (workbookId: string, { rejectWithValue, getState }) => {
        try {
            const state = getState() as { version: IVersionState };
            const pendingRequest = state.version.pendingOperations.get('fetchHistory');
            
            if (pendingRequest) {
                return await pendingRequest;
            }

            const request = versionService.getVersionHistory(workbookId);
            state.version.pendingOperations.set('fetchHistory', request);

            const response = await request;
            state.version.pendingOperations.delete('fetchHistory');

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch version history');
            }

            return response.version;
        } catch (error) {
            return rejectWithValue({
                code: ERROR_CODES.VERSION_ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
);

// Async thunk for creating new version with optimistic updates
export const createNewVersion = createAsyncThunk(
    'version/create',
    async (payload: {
        workbookId: string,
        changes: VersionChange[],
        changeType: VersionChangeType,
        description: string
    }, { rejectWithValue }) => {
        try {
            const response = await versionService.createVersion(
                payload.workbookId,
                payload.changes,
                payload.changeType,
                payload.description
            );

            if (!response.success) {
                throw new Error(response.error || 'Failed to create version');
            }

            return response.version;
        } catch (error) {
            return rejectWithValue({
                code: ERROR_CODES.VERSION_ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
);

// Async thunk for version restoration
export const restoreVersion = createAsyncThunk(
    'version/restore',
    async (payload: { workbookId: string, versionId: VersionId }, { rejectWithValue }) => {
        try {
            const response = await versionService.restoreVersion(
                payload.workbookId,
                payload.versionId
            );

            if (!response.success) {
                throw new Error(response.error || 'Failed to restore version');
            }

            return response.version;
        } catch (error) {
            return rejectWithValue({
                code: ERROR_CODES.VERSION_ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
);

// Version control slice with comprehensive state management
const versionSlice = createSlice({
    name: 'version',
    initialState,
    reducers: {
        clearVersionState: (state) => {
            state.currentVersion = null;
            state.versionHistory = [];
            state.isLoading = false;
            state.error = null;
            state.pendingOperations.clear();
        },
        setCurrentVersion: (state, action) => {
            state.currentVersion = action.payload;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Version History
            .addCase(fetchVersionHistory.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchVersionHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.versionHistory = action.payload;
                state.error = null;
            })
            .addCase(fetchVersionHistory.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Create New Version
            .addCase(createNewVersion.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createNewVersion.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentVersion = action.payload;
                state.versionHistory = [action.payload, ...state.versionHistory];
                state.error = null;
            })
            .addCase(createNewVersion.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Restore Version
            .addCase(restoreVersion.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(restoreVersion.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentVersion = action.payload;
                state.error = null;
            })
            .addCase(restoreVersion.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

// Memoized selectors for optimized state access
export const selectVersionState = (state: { version: IVersionState }) => state.version;

export const selectCurrentVersion = createSelector(
    [selectVersionState],
    (state) => state.currentVersion
);

export const selectVersionHistory = createSelector(
    [selectVersionState],
    (state) => state.versionHistory
);

export const selectVersionById = createSelector(
    [selectVersionHistory, (_, versionId: VersionId) => versionId],
    (history, versionId) => history.find(version => version.id === versionId)
);

export const selectIsLoading = createSelector(
    [selectVersionState],
    (state) => state.isLoading
);

export const selectError = createSelector(
    [selectVersionState],
    (state) => state.error
);

// Redux persist configuration for version state
const persistConfig = {
    key: 'version',
    storage: sessionStorage,
    whitelist: ['currentVersion', 'versionHistory']
};

// Export actions and persisted reducer
export const { clearVersionState, setCurrentVersion } = versionSlice.actions;
export default persistReducer(persistConfig, versionSlice.reducer);