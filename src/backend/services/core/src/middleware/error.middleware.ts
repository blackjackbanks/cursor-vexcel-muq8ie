/**
 * @fileoverview Express middleware for centralized error handling in the core service
 * Provides standardized error responses, security-aware logging, performance monitoring,
 * and compliance-ready error management
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as applicationinsights from 'applicationinsights';
import { logger } from '../utils/logger';
import { ErrorCode } from '@shared/types';
import { ERROR_CODES, PERFORMANCE_THRESHOLDS } from '@shared/constants';
import { config } from '../config';

// Global constants for error handling
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred';
const SENSITIVE_DATA_PATTERNS = ['password', 'token', 'key', 'secret', 'auth'];
const ERROR_SAMPLING_RATE = 0.1;
const HTTP_STATUS_CODES = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

/**
 * Interface for enhanced error response with security and monitoring context
 */
interface IEnhancedError extends Error {
    code?: ErrorCode;
    statusCode?: number;
    details?: Record<string, any>;
    correlationId?: string;
    securityLevel?: string;
}

/**
 * Centralized error handling middleware with security, monitoring, and compliance features
 */
export const errorHandler = (
    error: IEnhancedError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const startTime = process.hrtime();

    // Generate or retrieve correlation ID for request tracking
    const correlationId = error.correlationId || 
        applicationinsights.getCorrelationContext()?.operation?.id || 
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Mask sensitive data in error details
    const sanitizedError = maskSensitiveData(error);

    // Determine appropriate HTTP status code
    const statusCode = getHttpStatus(sanitizedError);

    // Format error response with security considerations
    const errorResponse = getErrorResponse(sanitizedError, {
        correlationId,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Log error with security context
    logger.error('Request error', sanitizedError, {
        correlationId,
        statusCode,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        clientIp: req.ip
    });

    // Track security-related errors
    if (isSecurityError(sanitizedError)) {
        logger.security('Security event detected', {
            correlationId,
            errorCode: sanitizedError.code,
            path: req.path,
            method: req.method,
            clientIp: req.ip
        });
    }

    // Calculate and track performance metrics
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    logger.performance('Error handling duration', {
        correlationId,
        duration,
        statusCode
    });

    // Apply error sampling for high-volume errors
    if (shouldSampleError(sanitizedError)) {
        logger.debug('Error sampled', {
            correlationId,
            errorCode: sanitizedError.code
        });
    }

    // Send error response to client
    res.status(statusCode).json({
        success: false,
        error: errorResponse
    });
};

/**
 * Formats error details into secure, standardized API error response
 */
function getErrorResponse(
    error: IEnhancedError,
    context: Record<string, any>
): Record<string, any> {
    return {
        code: error.code || ERROR_CODES.SYSTEM_ERROR,
        message: error.message || DEFAULT_ERROR_MESSAGE,
        correlationId: context.correlationId,
        timestamp: context.timestamp,
        path: context.path,
        details: error.details || {},
        service: 'core-service'
    };
}

/**
 * Maps error codes to appropriate HTTP status codes with security context
 */
function getHttpStatus(error: IEnhancedError): number {
    if (error.statusCode) {
        return error.statusCode;
    }

    switch (error.code) {
        case 'AI_SERVICE_UNAVAILABLE':
            return HTTP_STATUS_CODES.SERVICE_UNAVAILABLE;
        case 'FORMULA_GENERATION_FAILED':
            return HTTP_STATUS_CODES.BAD_REQUEST;
        case 'VALIDATION_ERROR':
            return HTTP_STATUS_CODES.BAD_REQUEST;
        case 'DATABASE_ERROR':
            return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
        default:
            return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
    }
}

/**
 * Masks sensitive data in error details for security
 */
function maskSensitiveData(error: IEnhancedError): IEnhancedError {
    const maskedError = { ...error };

    if (maskedError.details) {
        Object.keys(maskedError.details).forEach(key => {
            if (SENSITIVE_DATA_PATTERNS.some(pattern => 
                key.toLowerCase().includes(pattern))) {
                maskedError.details[key] = '********';
            }
        });
    }

    return maskedError;
}

/**
 * Determines if an error is security-related
 */
function isSecurityError(error: IEnhancedError): boolean {
    return error.code?.startsWith('SEC-') || 
           error.securityLevel === 'high' ||
           error.message?.toLowerCase().includes('security');
}

/**
 * Determines if an error should be sampled based on volume
 */
function shouldSampleError(error: IEnhancedError): boolean {
    return Math.random() < ERROR_SAMPLING_RATE;
}