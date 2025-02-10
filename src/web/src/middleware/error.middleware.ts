/**
 * @fileoverview Error handling middleware for Excel Add-in frontend
 * Implements comprehensive error detection, assessment, and response handling
 * following security protocol compliance
 * @version 1.0.0
 */

import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS, ERROR_CODES } from '../constants/api.constants';
import { IAuthError } from '../interfaces/auth.interface';

/**
 * Interface for standardized error response structure
 */
interface IErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  severity: ErrorSeverity;
  trackingId: string;
  stack?: string;
}

/**
 * Enum for error severity levels following security protocol
 */
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Formats error details into a standardized response structure
 * @param error - The error object to format
 * @param severity - The assessed severity level
 * @returns Formatted error response object
 */
const formatErrorResponse = (
  error: Error & { code?: string; details?: Record<string, unknown> },
  severity: ErrorSeverity
): IErrorResponse => {
  // Generate unique tracking ID for error tracing
  const trackingId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Sanitize error message to prevent sensitive data exposure
  const sanitizedMessage = error.message.replace(/[^\w\s-]/gi, '');

  const errorResponse: IErrorResponse = {
    code: error.code || ERROR_CODES.SERVER_ERROR,
    message: sanitizedMessage,
    timestamp: new Date().toISOString(),
    severity,
    trackingId,
    details: error.details
  };

  // Include stack trace only in development environment
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  return errorResponse;
};

/**
 * Assesses error severity based on error type and impact
 * @param error - The error to assess
 * @returns Assessed severity level
 */
const assessErrorSeverity = (error: Error): ErrorSeverity => {
  if (error instanceof IAuthError) {
    return ErrorSeverity.HIGH;
  }

  switch (error.name) {
    case 'NetworkError':
      return ErrorSeverity.MEDIUM;
    case 'ValidationError':
      return ErrorSeverity.LOW;
    case 'SecurityError':
      return ErrorSeverity.CRITICAL;
    default:
      return ErrorSeverity.MEDIUM;
  }
};

/**
 * Maps error types to appropriate HTTP status codes
 * @param error - The error to map
 * @returns Corresponding HTTP status code
 */
const mapErrorToStatusCode = (error: Error): number => {
  if (error instanceof IAuthError) {
    return HTTP_STATUS.UNAUTHORIZED;
  }

  switch (error.name) {
    case 'ValidationError':
      return HTTP_STATUS.BAD_REQUEST;
    case 'NetworkError':
      return HTTP_STATUS.SERVICE_UNAVAILABLE;
    case 'SecurityError':
      return HTTP_STATUS.UNAUTHORIZED;
    default:
      return HTTP_STATUS.SERVER_ERROR;
  }
};

/**
 * Main error handling middleware implementing security protocol stages
 * @param error - The error object to handle
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Stage 1: Detection - Log error with context
  console.error('Error detected:', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack
  });

  // Stage 2: Assessment - Determine severity and status code
  const severity = assessErrorSeverity(error);
  const statusCode = mapErrorToStatusCode(error);

  // Stage 3: Response Formation
  const errorResponse = formatErrorResponse(error, severity);

  // Stage 4: Metrics and Monitoring
  if (severity >= ErrorSeverity.HIGH) {
    // Trigger alerts for high severity errors
    // This would integrate with your monitoring system
    console.error('High severity error detected:', errorResponse);
  }

  // Add error to metrics for monitoring
  // This would integrate with your metrics collection system
  const errorMetrics = {
    timestamp: new Date().toISOString(),
    code: errorResponse.code,
    severity,
    path: req.path,
    trackingId: errorResponse.trackingId
  };

  // Stage 5: Response
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;