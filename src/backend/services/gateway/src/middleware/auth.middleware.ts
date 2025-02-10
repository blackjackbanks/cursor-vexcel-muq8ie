/**
 * @fileoverview Enhanced authentication middleware for API Gateway service
 * Implements secure JWT validation with device fingerprinting and comprehensive security logging
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { verifyToken } from '../utils/jwt';
import { AuthService } from '../services/auth.service';
import { IAPIResponse } from '../../../shared/interfaces';
import { randomBytes } from 'crypto';

// Constants for authentication configuration
const PUBLIC_ROUTES = ['/auth/login', '/auth/refresh', '/health'];
const MAX_AUTH_ATTEMPTS = 3;
const AUTH_LOCKOUT_DURATION = 300000; // 5 minutes in milliseconds

// Initialize rate limiting cache
const rateLimitCache = new Map<string, { attempts: number; lockoutUntil?: number }>();

/**
 * Interface for enhanced token validation result
 */
interface ITokenValidationResult {
    token: string;
    isValid: boolean;
    deviceId?: string;
    securityContext?: {
        fingerprint: string;
        lastAuthenticated: number;
        deviceInfo: Record<string, any>;
    };
}

/**
 * Enhanced authentication middleware with device validation and security logging
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Skip authentication for public routes
        if (PUBLIC_ROUTES.includes(req.path)) {
            return next();
        }

        // Check rate limiting
        const clientIp = req.ip;
        const rateLimit = rateLimitCache.get(clientIp) || { attempts: 0 };

        if (rateLimit.lockoutUntil && Date.now() < rateLimit.lockoutUntil) {
            throw new Error('Account temporarily locked due to multiple failed attempts');
        }

        // Extract and validate token
        const tokenValidation = await extractToken(req);
        if (!tokenValidation.isValid) {
            throw new Error('Invalid authorization header format');
        }

        // Get device fingerprint from headers
        const deviceId = req.headers['x-device-id'] as string;
        if (!deviceId) {
            throw new Error('Missing device identifier');
        }

        // Verify token with enhanced security checks
        const authService = new AuthService();
        const validationResult = await authService.validateToken(
            tokenValidation.token,
            deviceId
        );

        if (!validationResult.success) {
            // Update rate limiting counters
            rateLimit.attempts++;
            if (rateLimit.attempts >= MAX_AUTH_ATTEMPTS) {
                rateLimit.lockoutUntil = Date.now() + AUTH_LOCKOUT_DURATION;
            }
            rateLimitCache.set(clientIp, rateLimit);

            throw new Error(validationResult.error?.message || 'Token validation failed');
        }

        // Reset rate limiting on successful authentication
        rateLimitCache.delete(clientIp);

        // Attach enriched user data to request
        req.user = validationResult.data;
        req.securityContext = {
            deviceId,
            fingerprint: tokenValidation.securityContext?.fingerprint,
            lastAuthenticated: Date.now(),
            correlationId: randomBytes(8).toString('hex')
        };

        // Log successful authentication
        await authService.logSecurityEvent({
            type: 'authentication',
            status: 'success',
            userId: req.user.id,
            deviceId,
            timestamp: Date.now(),
            metadata: {
                ip: clientIp,
                userAgent: req.headers['user-agent'],
                correlationId: req.securityContext.correlationId
            }
        });

        next();
    } catch (error) {
        const errorResponse: IAPIResponse = {
            success: false,
            error: {
                code: 'AUTH_FAILED',
                message: error.message,
                service: 'api-gateway',
                details: {
                    path: req.path,
                    method: req.method,
                    timestamp: Date.now()
                },
                timestamp: Date.now(),
                correlationId: randomBytes(8).toString('hex')
            }
        };

        // Log authentication failure
        const authService = new AuthService();
        await authService.logSecurityEvent({
            type: 'authentication',
            status: 'failure',
            error: error.message,
            deviceId: req.headers['x-device-id'] as string,
            timestamp: Date.now(),
            metadata: {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                correlationId: errorResponse.error.correlationId
            }
        });

        res.status(401).json(errorResponse);
    }
};

/**
 * Helper function to extract and validate JWT token from request headers
 * @param req - Express request object
 * @returns Promise resolving to token validation result
 */
const extractToken = async (req: Request): Promise<ITokenValidationResult> => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return { token: '', isValid: false };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return { token: '', isValid: false };
    }

    const token = parts[1];
    if (!token || token.length < 32 || !/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(token)) {
        return { token: '', isValid: false };
    }

    return {
        token,
        isValid: true,
        deviceId: req.headers['x-device-id'] as string,
        securityContext: {
            fingerprint: randomBytes(32).toString('hex'),
            lastAuthenticated: Date.now(),
            deviceInfo: {
                userAgent: req.headers['user-agent'],
                ip: req.ip
            }
        }
    };
};