/**
 * Redux Toolkit slice for managing formula-related state in the Excel Add-in
 * Implements comprehensive state management for AI formula suggestions, validation,
 * performance metrics, and error tracking
 * 
 * @version 1.0.0
 * @requires @reduxjs/toolkit@^1.9.0
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { 
    IFormulaRequest, 
    IFormulaSuggestion, 
    IFormulaValidationResult,
    IPerformanceMetrics,
    RequestPriority
} from '../../interfaces/formula.interface';
import { FormulaService } from '../../services/formula.service';
import { ERROR_CODES } from '../../constants/api.constants';

// Initialize FormulaService instance
const formulaService = new FormulaService(null);

// Interface for formula slice state
interface FormulaState {
    suggestions: IFormulaSuggestion[];
    loading: boolean;
    error: string | null;
    validationResult: IFormulaValidationResult | null;
    performanceMetrics: IPerformanceMetrics;
    suggestionCache: Map<string, {
        suggestions: IFormulaSuggestion[];
        timestamp: number;
    }>;
    errorMetrics: {
        totalErrors: number;
        errorTypes: Record<string, number>;
        lastError: Date | null;
    };
}

// Initial state with performance tracking
const initialState: FormulaState = {
    suggestions: [],
    loading: false,
    error: null,
    validationResult: null,
    performanceMetrics: {
        processingTime: 0,
        memoryUsage: 0,
        apiLatency: 0,
        cacheHitRate: 0,
        modelLoadTime: 0,
        totalRequestTime: 0
    },
    suggestionCache: new Map(),
    errorMetrics: {
        totalErrors: 0,
        errorTypes: {},
        lastError: null
    }
};

// Cache configuration
const CACHE_TTL = 300000; // 5 minutes

/**
 * Async thunk for generating formula suggestions with performance tracking
 */
export const generateFormulaSuggestions = createAsyncThunk(
    'formula/generateSuggestions',
    async (request: IFormulaRequest, { rejectWithValue }) => {
        const startTime = performance.now();
        try {
            // Check cache first
            const cacheKey = `${request.input}_${JSON.stringify(request.context)}`;
            const cached = initialState.suggestionCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                return cached.suggestions;
            }

            // Generate new suggestions
            const suggestions = await formulaService.generateFormula(request);
            
            // Validate suggestions
            const validationResults = await Promise.all(
                suggestions.map(s => formulaService.validateFormulaInput(s.formula))
            );

            // Filter out invalid suggestions
            const validSuggestions = suggestions.filter((s, index) => 
                validationResults[index].isValid
            );

            // Cache valid suggestions
            initialState.suggestionCache.set(cacheKey, {
                suggestions: validSuggestions,
                timestamp: Date.now()
            });

            return validSuggestions;

        } catch (error) {
            return rejectWithValue({
                code: error.code || ERROR_CODES.FORMULA_ERROR,
                message: error.message
            });
        } finally {
            const endTime = performance.now();
            initialState.performanceMetrics.totalRequestTime = endTime - startTime;
        }
    }
);

/**
 * Formula slice with comprehensive state management
 */
export const formulaSlice = createSlice({
    name: 'formula',
    initialState,
    reducers: {
        setSuggestions: (state, action: PayloadAction<IFormulaSuggestion[]>) => {
            state.suggestions = action.payload;
        },
        clearSuggestions: (state) => {
            state.suggestions = [];
            state.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.errorMetrics.totalErrors++;
            state.errorMetrics.lastError = new Date();
            state.errorMetrics.errorTypes[action.payload] = 
                (state.errorMetrics.errorTypes[action.payload] || 0) + 1;
        },
        updatePerformanceMetrics: (state, action: PayloadAction<Partial<IPerformanceMetrics>>) => {
            state.performanceMetrics = {
                ...state.performanceMetrics,
                ...action.payload
            };
        },
        updateValidationState: (state, action: PayloadAction<IFormulaValidationResult>) => {
            state.validationResult = action.payload;
        },
        clearCache: (state) => {
            state.suggestionCache.clear();
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateFormulaSuggestions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(generateFormulaSuggestions.fulfilled, (state, action) => {
                state.loading = false;
                state.suggestions = action.payload;
                state.performanceMetrics.cacheHitRate = 
                    state.suggestionCache.size > 0 ? 
                    Array.from(state.suggestionCache.values()).length / state.suggestionCache.size : 0;
            })
            .addCase(generateFormulaSuggestions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.errorMetrics.totalErrors++;
                state.errorMetrics.lastError = new Date();
            });
    }
});

// Export actions
export const { 
    setSuggestions,
    clearSuggestions,
    setLoading,
    setError,
    updatePerformanceMetrics,
    updateValidationState,
    clearCache
} = formulaSlice.actions;

// Memoized selectors for performance
export const selectFormulaSuggestions = createSelector(
    [(state: { formula: FormulaState }) => state.formula],
    (formula) => formula.suggestions
);

export const selectPerformanceMetrics = createSelector(
    [(state: { formula: FormulaState }) => state.formula],
    (formula) => formula.performanceMetrics
);

export const selectValidationResult = createSelector(
    [(state: { formula: FormulaState }) => state.formula],
    (formula) => formula.validationResult
);

export const selectErrorMetrics = createSelector(
    [(state: { formula: FormulaState }) => state.formula],
    (formula) => formula.errorMetrics
);

// Export reducer
export default formulaSlice.reducer;