/**
 * @fileoverview Redux slice for managing Excel-related state in the AI-enhanced Excel Add-in
 * @version 1.0.0
 * @package @reduxjs/toolkit@1.9.5
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import {
    WorkbookState,
    RangeSelection,
    ExcelError,
    TaskPaneConfig,
    PerformanceMetrics
} from '../../types/excel.types';
import {
    TASK_PANE_DIMENSIONS,
    EXCEL_EVENTS,
    EXCEL_ERROR_CODES,
    PERFORMANCE_THRESHOLDS
} from '../../constants/excel.constants';
import { ExcelService } from '../../services/excel.service';

// Initial state with strict type safety
interface ExcelState {
    workbook: WorkbookState;
    selectedRange: RangeSelection | null;
    taskPane: TaskPaneConfig;
    error: ExcelError | null;
    performance: PerformanceMetrics;
    isInitialized: boolean;
    lastSync: Date | null;
}

const initialState: ExcelState = {
    workbook: {
        isLoading: false,
        activeSheet: null,
        selectedRange: null,
        error: null,
        lastSync: new Date()
    },
    selectedRange: null,
    taskPane: {
        width: TASK_PANE_DIMENSIONS.DEFAULT_WIDTH,
        minWidth: TASK_PANE_DIMENSIONS.MIN_WIDTH,
        maxWidth: TASK_PANE_DIMENSIONS.MAX_WIDTH,
        position: 'right',
        isCollapsed: false,
        visibility: 'visible'
    },
    error: null,
    performance: {
        memoryUsage: 0,
        cpuUtilization: 0,
        responseTime: 0,
        lastMeasured: new Date()
    },
    isInitialized: false,
    lastSync: null
};

// Async thunks for Excel operations
export const initializeExcel = createAsyncThunk(
    'excel/initialize',
    async (_, { rejectWithValue }) => {
        try {
            const excelService = new ExcelService();
            await excelService.initialize();
            const isCompatible = await excelService.validateApiVersion();
            
            if (!isCompatible) {
                throw new Error('Incompatible Excel API version');
            }

            return { initialized: true };
        } catch (error) {
            return rejectWithValue({
                code: EXCEL_ERROR_CODES.INITIALIZATION_FAILED,
                message: error.message,
                details: { error: error.toString() },
                timestamp: new Date(),
                severity: 'error'
            });
        }
    }
);

export const updateSelectedRange = createAsyncThunk(
    'excel/updateSelectedRange',
    async (range: RangeSelection, { rejectWithValue }) => {
        try {
            const excelService = new ExcelService();
            const validationResult = await excelService.getSelectedRange();
            
            if (!validationResult) {
                throw new Error('Invalid range selection');
            }

            return validationResult;
        } catch (error) {
            return rejectWithValue({
                code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                message: error.message,
                details: { error: error.toString() },
                timestamp: new Date(),
                severity: 'error'
            });
        }
    }
);

// Excel slice with comprehensive state management
export const excelSlice = createSlice({
    name: 'excel',
    initialState,
    reducers: {
        setWorkbookState: (state, action: PayloadAction<WorkbookState>) => {
            state.workbook = action.payload;
            state.lastSync = new Date();
        },
        setSelectedRange: (state, action: PayloadAction<RangeSelection | null>) => {
            state.selectedRange = action.payload;
        },
        setTaskPaneConfig: (state, action: PayloadAction<Partial<TaskPaneConfig>>) => {
            state.taskPane = { ...state.taskPane, ...action.payload };
        },
        updatePerformanceMetrics: (state, action: PayloadAction<PerformanceMetrics>) => {
            state.performance = action.payload;
        },
        setError: (state, action: PayloadAction<ExcelError | null>) => {
            state.error = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeExcel.pending, (state) => {
                state.workbook.isLoading = true;
                state.error = null;
            })
            .addCase(initializeExcel.fulfilled, (state) => {
                state.workbook.isLoading = false;
                state.isInitialized = true;
                state.lastSync = new Date();
            })
            .addCase(initializeExcel.rejected, (state, action) => {
                state.workbook.isLoading = false;
                state.error = action.payload as ExcelError;
            })
            .addCase(updateSelectedRange.pending, (state) => {
                state.workbook.isLoading = true;
            })
            .addCase(updateSelectedRange.fulfilled, (state, action) => {
                state.workbook.isLoading = false;
                state.selectedRange = action.payload;
                state.lastSync = new Date();
            })
            .addCase(updateSelectedRange.rejected, (state, action) => {
                state.workbook.isLoading = false;
                state.error = action.payload as ExcelError;
            });
    }
});

// Memoized selectors for optimized state access
export const selectWorkbookState = createSelector(
    [(state: { excel: ExcelState }) => state.excel.workbook],
    (workbook) => workbook
);

export const selectSelectedRange = createSelector(
    [(state: { excel: ExcelState }) => state.excel.selectedRange],
    (selectedRange) => selectedRange
);

export const selectTaskPaneConfig = createSelector(
    [(state: { excel: ExcelState }) => state.excel.taskPane],
    (taskPane) => taskPane
);

export const selectPerformanceMetrics = createSelector(
    [(state: { excel: ExcelState }) => state.excel.performance],
    (performance) => performance
);

export const selectExcelError = createSelector(
    [(state: { excel: ExcelState }) => state.excel.error],
    (error) => error
);

export const { 
    setWorkbookState,
    setSelectedRange,
    setTaskPaneConfig,
    updatePerformanceMetrics,
    setError,
    clearError
} = excelSlice.actions;

export default excelSlice.reducer;