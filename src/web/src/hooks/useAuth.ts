/**
 * @fileoverview Enhanced authentication hook for Excel Add-in
 * Implements secure authentication, session management, and security monitoring
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AuthService } from '../services/auth.service';
import { 
    loginAsync, 
    logoutAsync, 
    refreshTokenAsync,
    updateLastActivity,
    addSecurityEvent,
    validateSession,
    selectAuth
} from '../store/slices/authSlice';
import { 
    AUTH_TOKEN_CONFIG, 
    AUTH_ERROR_CODES,
    AUTH_ROLES,
    AUTH_PERMISSIONS
} from '../constants/auth.constants';
import { IUser, UserRole } from '../interfaces/auth.interface';

// Initialize AuthService singleton
const authService = new AuthService(/* tokenService will be injected */);

/**
 * Enhanced hook for authentication functionality with security features
 * Implements OAuth 2.0 + JWT based authentication with session monitoring
 */
export const useAuth = () => {
    const dispatch = useDispatch();
    const auth = useSelector(selectAuth);
    
    // Refs for cleanup and token refresh management
    const refreshTimeout = useRef<NodeJS.Timeout>();
    const sessionCheckInterval = useRef<NodeJS.Timeout>();
    const refreshQueue = useRef<Array<() => void>>([]);

    /**
     * Enhanced login handler with security monitoring
     */
    const login = useCallback(async () => {
        try {
            const result = await dispatch(loginAsync()).unwrap();
            
            // Log successful login security event
            dispatch(addSecurityEvent({
                type: 'LOGIN_SUCCESS',
                details: {
                    userId: result.user.id,
                    timestamp: new Date(),
                    deviceInfo: navigator.userAgent
                }
            }));

            return result;
        } catch (error: any) {
            // Log failed login attempt
            dispatch(addSecurityEvent({
                type: 'LOGIN_FAILURE',
                details: {
                    error: error.code,
                    timestamp: new Date(),
                    deviceInfo: navigator.userAgent
                }
            }));
            throw error;
        }
    }, [dispatch]);

    /**
     * Enhanced logout handler with session cleanup
     */
    const logout = useCallback(async () => {
        try {
            await dispatch(logoutAsync()).unwrap();
            
            // Clear all intervals and timeouts
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
            }
            if (sessionCheckInterval.current) {
                clearInterval(sessionCheckInterval.current);
            }
            
            // Clear refresh queue
            refreshQueue.current = [];

            // Log logout security event
            dispatch(addSecurityEvent({
                type: 'LOGOUT',
                details: {
                    userId: auth.user?.id,
                    timestamp: new Date()
                }
            }));
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }, [dispatch, auth.user]);

    /**
     * Enhanced token refresh with queue management
     */
    const refreshToken = useCallback(async () => {
        try {
            const result = await dispatch(refreshTokenAsync()).unwrap();
            
            // Process queued operations after successful refresh
            refreshQueue.current.forEach(callback => callback());
            refreshQueue.current = [];

            return result;
        } catch (error) {
            // Handle token refresh failure
            if (error.code === AUTH_ERROR_CODES.REFRESH_FAILED) {
                await logout();
            }
            throw error;
        }
    }, [dispatch, logout]);

    /**
     * Validates current session with security checks
     */
    const validateCurrentSession = useCallback(async () => {
        try {
            // Update last activity timestamp
            dispatch(updateLastActivity());
            
            // Validate session state
            dispatch(validateSession());

            // Check session expiry
            if (auth.sessionExpiry && new Date() > auth.sessionExpiry) {
                await logout();
                return false;
            }

            return auth.isAuthenticated;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }, [dispatch, auth.sessionExpiry, auth.isAuthenticated, logout]);

    /**
     * Enhanced permission check with role hierarchy support
     */
    const checkPermission = useCallback((requiredRole: UserRole): boolean => {
        if (!auth.user) return false;

        const userRole = auth.user.role;
        const roleHierarchy = AUTH_ROLES.ROLE_HIERARCHY;

        // Check if user has required role or higher in hierarchy
        if (userRole === requiredRole) return true;
        if (roleHierarchy[userRole]?.includes(requiredRole)) return true;

        return false;
    }, [auth.user]);

    /**
     * Setup automatic token refresh and session monitoring
     */
    useEffect(() => {
        if (auth.isAuthenticated && auth.sessionExpiry) {
            // Calculate time until token refresh is needed
            const timeUntilRefresh = new Date(auth.sessionExpiry).getTime() - 
                Date.now() - (AUTH_TOKEN_CONFIG.EXPIRY_BUFFER * 1000);

            // Setup token refresh
            refreshTimeout.current = setTimeout(() => {
                refreshToken();
            }, Math.max(0, timeUntilRefresh));

            // Setup session monitoring
            sessionCheckInterval.current = setInterval(() => {
                validateCurrentSession();
            }, 60000); // Check every minute
        }

        return () => {
            // Cleanup intervals on unmount
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
            }
            if (sessionCheckInterval.current) {
                clearInterval(sessionCheckInterval.current);
            }
        };
    }, [auth.isAuthenticated, auth.sessionExpiry, refreshToken, validateCurrentSession]);

    // Return authentication state and methods
    return {
        isAuthenticated: auth.isAuthenticated,
        user: auth.user as IUser | null,
        loading: auth.loading,
        error: auth.error,
        securityEvents: auth.securityEvents,
        login,
        logout,
        refreshToken,
        validateSession: validateCurrentSession,
        checkPermission
    };
};