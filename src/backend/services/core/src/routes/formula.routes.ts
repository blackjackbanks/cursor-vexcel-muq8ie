/**
 * @fileoverview Express router configuration for Excel formula-related endpoints
 * Implements secure, monitored, and performant routes for formula generation,
 * validation, and optimization with comprehensive middleware chains
 * @version 1.0.0
 */

import { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import now from 'performance-now';

import { FormulaController } from '../controllers/formula.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { logger } from '../utils/logger';
import { CORE_SERVICE_CONFIG, FORMULA_ENDPOINTS, PERFORMANCE_CONFIG } from '../constants';
import { ServiceName } from '../../../shared/types';

// Configure rate limiters for different endpoints
const generateRateLimiter = new RateLimiterMemory({
    points: 100,
    duration: 60, // 1 minute
    blockDuration: 60 // 1 minute block if exceeded
});

const validateRateLimiter = new RateLimiterMemory({
    points: 200,
    duration: 60
});

const optimizeRateLimiter = new RateLimiterMemory({
    points: 50,
    duration: 60
});

/**
 * Configures and returns an Express router with formula-related endpoints
 * @param formulaController Initialized FormulaController instance
 * @returns Configured Express router
 */
export const configureFormulaRoutes = (formulaController: FormulaController): Router => {
    const router = Router({ strict: true });

    // Configure CORS for Excel Add-in origins
    const corsOptions = {
        origin: CORE_SERVICE_CONFIG.server.cors.origins,
        methods: ['POST'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
        maxAge: 3600
    };

    // Apply global middleware
    router.use(cors(corsOptions));
    router.use(helmet());

    // Performance monitoring middleware
    const performanceMonitor = (req: any, res: any, next: any) => {
        const startTime = now();
        res.on('finish', () => {
            const duration = now() - startTime;
            logger.trackMetric('formula_route_duration', duration, {
                path: req.path,
                method: req.method,
                correlationId: req.headers['x-correlation-id']
            });

            if (duration > PERFORMANCE_CONFIG.REQUEST_TIMEOUT) {
                logger.warn('Route performance threshold exceeded', {
                    duration,
                    path: req.path,
                    threshold: PERFORMANCE_CONFIG.REQUEST_TIMEOUT
                });
            }
        });
        next();
    };

    // Rate limiting middleware with monitoring
    const rateLimitHandler = (limiter: RateLimiterMemory) => async (req: any, res: any, next: any) => {
        try {
            await limiter.consume(req.ip);
            next();
        } catch (error) {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path,
                correlationId: req.headers['x-correlation-id']
            });
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests, please try again later',
                    service: ServiceName.CORE
                }
            });
        }
    };

    // Formula generation endpoint
    router.post(
        FORMULA_ENDPOINTS.SUGGEST,
        authenticate,
        authorize(['basic', 'power', 'admin'], ['formula.generate']),
        rateLimitHandler(generateRateLimiter),
        validateRequest('formulaGeneration'),
        performanceMonitor,
        formulaController.generateFormula.bind(formulaController)
    );

    // Formula validation endpoint
    router.post(
        FORMULA_ENDPOINTS.VALIDATE,
        authenticate,
        authorize(['basic', 'power', 'admin'], ['formula.validate']),
        rateLimitHandler(validateRateLimiter),
        validateRequest('formulaValidation'),
        performanceMonitor,
        formulaController.validateFormula.bind(formulaController)
    );

    // Formula optimization endpoint
    router.post(
        FORMULA_ENDPOINTS.OPTIMIZE,
        authenticate,
        authorize(['power', 'admin'], ['formula.optimize']),
        rateLimitHandler(optimizeRateLimiter),
        validateRequest('formulaOptimization'),
        performanceMonitor,
        formulaController.optimizeFormula.bind(formulaController)
    );

    // Health check endpoint for monitoring
    router.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: ServiceName.CORE,
            timestamp: new Date().toISOString()
        });
    });

    return router;
};