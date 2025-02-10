/**
 * @fileoverview Authentication middleware for Excel Add-in frontend
 * Implements secure request interception, token validation, and RBAC
 * @version 1.0.0
 */

import { NextFunction } from '@types/express'; // v4.17.17
import { Store } from '@reduxjs/toolkit'; // v1.9.3
import { RateLimiter } from 'express-rate-limit'; // v6.7.0
import winston from 'winston'; // v3.8.2

import { IAuthState } from '../interfaces/auth.interface';
import { AuthService } from '../services/auth.service';
import { getToken, isTokenValid } from '../utils/auth.utils';
import { 
  AUTH_ERROR_CODES, 
  AUTH_TOKEN_CONFIG, 
  AUTH_ROLES 
} from '../constants/auth.constants';

// Initialize security logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-middleware' },
  transports: [
    new winston.transports.File({ filename: 'security-events.log' })
  ]
});

// Configure rate limiter
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: AUTH_ERROR_CODES.MAX_REFRESH_EXCEEDED }
});

// Initialize auth service
const authService = new AuthService();

/**
 * Enhanced authentication middleware with security validation and monitoring
 * @param {Store} store - Redux store instance
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
export const authMiddleware = async (
  store: Store,
  next: NextFunction
): Promise<void> => {
  try {
    // Get current auth state
    const state = store.getState() as { auth: IAuthState };
    const { auth } = state;

    // Get and validate token
    const token = getToken();
    
    if (!token) {
      securityLogger.warn('No authentication token found', {
        timestamp: new Date().toISOString(),
        userId: auth.user?.id
      });

      store.dispatch({
        type: 'auth/setUnauthenticated',
        payload: { error: AUTH_ERROR_CODES.INVALID_TOKEN }
      });
      return next();
    }

    // Validate token integrity
    if (!isTokenValid(token)) {
      securityLogger.warn('Invalid token detected', {
        timestamp: new Date().toISOString(),
        userId: auth.user?.id
      });

      // Attempt token refresh
      try {
        const newToken = await authService.refreshToken();
        if (!newToken) throw new Error(AUTH_ERROR_CODES.REFRESH_FAILED);
      } catch (error) {
        store.dispatch({
          type: 'auth/setUnauthenticated',
          payload: { error: AUTH_ERROR_CODES.REFRESH_FAILED }
        });
        return next();
      }
    }

    // Validate session and get user
    const user = await authService.getAuthenticatedUser();
    if (!user) {
      securityLogger.error('Session validation failed', {
        timestamp: new Date().toISOString(),
        userId: auth.user?.id
      });

      store.dispatch({
        type: 'auth/setUnauthenticated',
        payload: { error: AUTH_ERROR_CODES.SESSION_EXPIRED }
      });
      return next();
    }

    // Update auth state
    store.dispatch({
      type: 'auth/setAuthenticated',
      payload: {
        user,
        token,
        sessionInfo: {
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + AUTH_TOKEN_CONFIG.REFRESH_THRESHOLD * 1000)
        }
      }
    });

    securityLogger.info('Authentication successful', {
      timestamp: new Date().toISOString(),
      userId: user.id,
      role: user.role
    });

    return next();
  } catch (error) {
    securityLogger.error('Authentication middleware error', {
      timestamp: new Date().toISOString(),
      error: error.message
    });

    store.dispatch({
      type: 'auth/setUnauthenticated',
      payload: { error: AUTH_ERROR_CODES.UNAUTHORIZED }
    });
    return next();
  }
};

/**
 * Enhanced role-based access control middleware with hierarchy support
 * @param {string[]} requiredRoles - Array of roles that can access the resource
 * @param {boolean} strictMode - If true, requires exact role match
 * @returns {Function} Middleware function
 */
export const requireAuth = (
  requiredRoles: string[],
  strictMode: boolean = false
): Function => {
  return async (store: Store, next: NextFunction): Promise<void> => {
    try {
      // Apply rate limiting
      await rateLimiter.consume(store.getState().session?.ip || '');

      const state = store.getState() as { auth: IAuthState };
      const { auth } = state;

      if (!auth.isAuthenticated || !auth.user) {
        throw new Error(AUTH_ERROR_CODES.UNAUTHORIZED);
      }

      const hasAccess = strictMode
        ? requiredRoles.includes(auth.user.role)
        : requiredRoles.some(role => {
            const roleHierarchy = AUTH_ROLES.ROLE_HIERARCHY[role] || [];
            return role === auth.user!.role || roleHierarchy.includes(auth.user!.role);
          });

      if (!hasAccess) {
        securityLogger.warn('Access denied - Insufficient permissions', {
          timestamp: new Date().toISOString(),
          userId: auth.user.id,
          requiredRoles,
          userRole: auth.user.role
        });

        store.dispatch({
          type: 'auth/accessDenied',
          payload: { error: AUTH_ERROR_CODES.PERMISSION_DENIED }
        });
        return next();
      }

      securityLogger.info('Access granted', {
        timestamp: new Date().toISOString(),
        userId: auth.user.id,
        role: auth.user.role,
        requiredRoles
      });

      return next();
    } catch (error) {
      securityLogger.error('Authorization middleware error', {
        timestamp: new Date().toISOString(),
        error: error.message
      });

      store.dispatch({
        type: 'auth/setUnauthenticated',
        payload: { error: AUTH_ERROR_CODES.UNAUTHORIZED }
      });
      return next();
    }
  };
};