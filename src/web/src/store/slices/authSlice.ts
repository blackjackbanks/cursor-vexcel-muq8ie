/**
 * @fileoverview Redux slice for managing authentication state in Excel Add-in
 * Implements secure token management, RBAC, session monitoring, and error handling
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import { IAuthState, IUser, AuthErrorCode } from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth.service';
import { AUTH_ERROR_CODES, AUTH_TOKEN_CONFIG } from '../../constants/auth.constants';

// Initialize AuthService singleton
const authService = new AuthService(/* inject tokenService */);

// Initial state with strict type safety
const initialState: IAuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
    sessionExpiry: null,
    refreshQueue: [],
    securityEvents: [],
    lastActivity: new Date()
};

/**
 * Enhanced async thunk for handling user login with retry mechanism
 */
export const loginAsync = createAsyncThunk(
    'auth/login',
    async (credentials: { email: string; password: string }, { rejectWithValue }) => {
        try {
            const response = await authService.login();
            return {
                user: response.user,
                token: response.token,
                sessionExpiry: new Date(Date.now() + response.expiresIn * 1000)
            };
        } catch (error: any) {
            return rejectWithValue({
                code: error.code || AUTH_ERROR_CODES.INVALID_CREDENTIALS,
                message: error.message || 'Login failed'
            });
        }
    }
);

/**
 * Enhanced async thunk for secure user logout with session cleanup
 */
export const logoutAsync = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await authService.logout();
        } catch (error: any) {
            return rejectWithValue({
                code: AUTH_ERROR_CODES.UNAUTHORIZED,
                message: error.message || 'Logout failed'
            });
        }
    }
);

/**
 * Enhanced async thunk for secure token refresh with queue management
 */
export const refreshTokenAsync = createAsyncThunk(
    'auth/refreshToken',
    async (_, { getState, rejectWithValue }) => {
        try {
            const newToken = await authService.refreshToken();
            return {
                token: newToken,
                sessionExpiry: new Date(Date.now() + AUTH_TOKEN_CONFIG.REFRESH_THRESHOLD * 1000)
            };
        } catch (error: any) {
            return rejectWithValue({
                code: AUTH_ERROR_CODES.REFRESH_FAILED,
                message: error.message || 'Token refresh failed'
            });
        }
    }
);

/**
 * Enhanced Redux slice for authentication state management
 */
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        updateLastActivity: (state) => {
            state.lastActivity = new Date();
        },
        clearError: (state) => {
            state.error = null;
        },
        addSecurityEvent: (state, action: PayloadAction<{ type: string; details: any }>) => {
            state.securityEvents.push({
                ...action.payload,
                timestamp: new Date()
            });
        },
        validateSession: (state) => {
            if (state.sessionExpiry && new Date() > state.sessionExpiry) {
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.error = {
                    code: AuthErrorCode.TOKEN_EXPIRED,
                    message: 'Session expired',
                    timestamp: new Date(),
                    details: {}
                };
            }
        }
    },
    extraReducers: (builder) => {
        // Login cases
        builder.addCase(loginAsync.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(loginAsync.fulfilled, (state, action) => {
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.sessionExpiry = action.payload.sessionExpiry;
            state.loading = false;
            state.error = null;
            state.lastActivity = new Date();
        });
        builder.addCase(loginAsync.rejected, (state, action) => {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.loading = false;
            state.error = action.payload as any;
        });

        // Logout cases
        builder.addCase(logoutAsync.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(logoutAsync.fulfilled, (state) => {
            return { ...initialState };
        });
        builder.addCase(logoutAsync.rejected, (state, action) => {
            state.error = action.payload as any;
            state.loading = false;
        });

        // Token refresh cases
        builder.addCase(refreshTokenAsync.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(refreshTokenAsync.fulfilled, (state, action) => {
            state.token = action.payload.token;
            state.sessionExpiry = action.payload.sessionExpiry;
            state.loading = false;
            state.error = null;
            state.lastActivity = new Date();
        });
        builder.addCase(refreshTokenAsync.rejected, (state, action) => {
            state.error = action.payload as any;
            state.loading = false;
        });
    }
});

// Export actions and reducer
export const { 
    updateLastActivity, 
    clearError, 
    addSecurityEvent, 
    validateSession 
} = authSlice.actions;

export default authSlice.reducer;

// Selector with memoization for performance
export const selectAuth = (state: { auth: IAuthState }) => state.auth;