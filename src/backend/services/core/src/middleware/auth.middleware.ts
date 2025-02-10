/**
 * @fileoverview Enhanced authentication and authorization middleware for Core service
 * Implements JWT validation, role-based access control, and security monitoring
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import now from 'performance-now'; // v2.1.0
import { logger } from '../utils/logger';
import { verifyToken } from '../../../gateway/src/utils/jwt';
import { errorHandler } from './error.middleware';
import { IAPIResponse, IUser } from '../../../shared/interfaces';

// Authentication error messages
const AUTH_ERROR_MESSAGES = {
    TOKEN_MISSING: 'Authentication token is required',
    TOKEN_INVALID: 'Invalid authentication token',
    UNAUTHORIZED: 'Unauthorized access',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    INVALID_ORIGIN: 'Invalid request origin',
    TOKEN_EXPIRED: 'Authentication token has expired'
} as const;

// Performance monitoring thresholds
const PERFORMANCE_THRESHOLDS = {
    AUTH_WARNING_MS: 1500,  // Warning threshold for auth processing
    AUTH_CRITICAL_MS: 2000  // Critical threshold for auth processing
} as const;

/**
 * Enhanced authentication middleware with performance monitoring and security logging
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const startTime = now();
    const correlationId = req.headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error(AUTH_ERROR_MESSAGES.TOKEN_MISSING);
        }

        const token = authHeader.split(' ')[1];
        const deviceId = req.headers['x-device-id'] as string;

        // Verify JWT token with enhanced security
        const verificationResult = await verifyToken(token, deviceId);
        if (!verificationResult.success) {
            throw new Error(verificationResult.error?.message || AUTH_ERROR_MESSAGES.TOKEN_INVALID);
        }

        // Extract user data from verified token
        const userData = verificationResult.data?.user;
        if (!userData) {
            throw new Error(AUTH_ERROR_MESSAGES.TOKEN_INVALID);
        }

        // Attach user data to request
        req.user = userData as IUser;

        // Log successful authentication
        logger.info('Authentication successful', {
            userId: userData.id,
            correlationId,
            deviceId,
            processingTime: now() - startTime
        });

        // Monitor authentication performance
        const processingTime = now() - startTime;
        if (processingTime > PERFORMANCE_THRESHOLDS.AUTH_CRITICAL_MS) {
            logger.error('Authentication performance critical', {
                processingTime,
                correlationId,
                threshold: PERFORMANCE_THRESHOLDS.AUTH_CRITICAL_MS
            });
        } else if (processingTime > PERFORMANCE_THRESHOLDS.AUTH_WARNING_MS) {
            logger.warn('Authentication performance degraded', {
                processingTime,
                correlationId,
                threshold: PERFORMANCE_THRESHOLDS.AUTH_WARNING_MS
            });
        }

        next();
    } catch (error) {
        const processingTime = now() - startTime;
        
        // Log authentication failure with security context
        logger.security('Authentication failed', {
            error: error.message,
            correlationId,
            clientIp: req.ip,
            userAgent: req.headers['user-agent'],
            processingTime
        });

        // Handle error with security context
        errorHandler(error, req, res, next);
    }
};

/**
 * Enhanced authorization middleware with role-based access control
 */
export const authorize = (allowedRoles: string[], requiredPermissions: string[] = []) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const startTime = now();
        const correlationId = req.headers['x-correlation-id'];

        try {
            const user = req.user as IUser;
            if (!user) {
                throw new Error(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
            }

            // Verify user role
            if (!allowedRoles.includes(user.role)) {
                logger.security('Unauthorized role access attempt', {
                    userId: user.id,
                    role: user.role,
                    requiredRoles: allowedRoles,
                    correlationId
                });
                throw new Error(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
            }

            // Verify user permissions
            if (requiredPermissions.length > 0) {
                const hasRequiredPermissions = requiredPermissions.every(permission =>
                    user.permissions.includes(permission) ||
                    user.permissions.includes(`${permission.split('.')[0]}.*`) ||
                    user.permissions.includes('*.*')
                );

                if (!hasRequiredPermissions) {
                    logger.security('Unauthorized permission access attempt', {
                        userId: user.id,
                        userPermissions: user.permissions,
                        requiredPermissions,
                        correlationId
                    });
                    throw new Error(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
                }
            }

            // Log successful authorization
            logger.info('Authorization successful', {
                userId: user.id,
                role: user.role,
                permissions: requiredPermissions,
                processingTime: now() - startTime,
                correlationId
            });

            next();
        } catch (error) {
            const processingTime = now() - startTime;

            // Log authorization failure
            logger.security('Authorization failed', {
                error: error.message,
                correlationId,
                processingTime,
                path: req.path,
                method: req.method
            });

            // Handle error with security context
            errorHandler(error, req, res, next);
        }
    };
};

// Extend Express Request interface to include user property
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}