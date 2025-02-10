/**
 * @fileoverview Express router configuration for data cleaning endpoints
 * Implements secure and performant routes for automated data cleaning operations
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.0
import { body, param, validationResult } from 'express-validator'; // ^7.0.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { CleaningController } from '../controllers/cleaning.controller';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { API_CONSTANTS, PERFORMANCE_THRESHOLDS } from '@shared/constants';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 900000; // 15 minutes
const RATE_LIMIT_MAX = 100;

/**
 * Configures and returns Express router with secured data cleaning endpoints
 * @param controller - Instance of CleaningController
 * @returns Configured Express router
 */
export function configureCleaningRoutes(controller: CleaningController): Router {
    const router = Router();

    // Configure rate limiting
    const cleaningRateLimiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW,
        max: RATE_LIMIT_MAX,
        message: {
            error: {
                code: 'DAT-009',
                message: 'Rate limit exceeded for data cleaning operations'
            }
        }
    });

    // Validation middleware for cleaning request
    const validateCleaningRequest = [
        body('workbookId').isUUID().withMessage('Invalid workbook ID'),
        body('worksheetId').isUUID().withMessage('Invalid worksheet ID'),
        body('range')
            .matches(/^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$/)
            .withMessage('Invalid Excel range format'),
        body('options').isObject().withMessage('Cleaning options must be an object'),
        body('options.removeDuplicates').isBoolean().optional(),
        body('options.fillMissingValues').isBoolean().optional(),
        body('options.standardizeFormats').isBoolean().optional()
    ];

    // Validation middleware for progress request
    const validateProgressRequest = [
        param('operationId').isUUID().withMessage('Invalid operation ID')
    ];

    /**
     * POST /clean
     * Initiates a data cleaning operation with comprehensive validation
     */
    router.post(
        '/clean',
        cleaningRateLimiter,
        validateCleaningRequest,
        cacheMiddleware({
            ttl: 300, // 5 minutes
            compression: true,
            excludePatterns: [/^\/health/],
            circuitBreaker: {
                failureThreshold: PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER.FAILURE_THRESHOLD,
                recoveryTimeout: PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER.RESET_TIMEOUT_MS
            }
        }),
        async (req, res, next) => {
            try {
                // Validate request
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'DAT-010',
                            message: 'Validation failed',
                            details: errors.array()
                        }
                    });
                }

                // Process cleaning request
                const result = await controller.cleanData(req.body);
                res.status(200).json(result);
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * GET /:operationId/progress
     * Retrieves progress of a cleaning operation with caching
     */
    router.get(
        '/:operationId/progress',
        validateProgressRequest,
        cacheMiddleware({
            ttl: 30, // 30 seconds
            compression: true
        }),
        async (req, res, next) => {
            try {
                // Validate request
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'DAT-011',
                            message: 'Invalid operation ID format',
                            details: errors.array()
                        }
                    });
                }

                // Get progress
                const progress = await controller.getProgress(req.params.operationId);
                res.status(200).json(progress);
            } catch (error) {
                next(error);
            }
        }
    );

    // Error handling middleware
    router.use((error: any, req: any, res: any, next: any) => {
        console.error('Data cleaning route error:', error);
        res.status(error.status || 500).json({
            success: false,
            error: {
                code: error.code || 'DAT-012',
                message: error.message || 'Internal server error',
                details: error.details || null
            }
        });
    });

    return router;
}