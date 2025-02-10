/**
 * @fileoverview Enhanced Excel formula controller implementing secure, monitored,
 * and performance-optimized HTTP endpoints for formula generation, validation,
 * and optimization using AI services
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { CircuitBreaker } from 'circuit-breaker-ts'; // ^1.0.0
import compression from 'compression'; // ^1.7.4
import rateLimit from 'express-rate-limit'; // ^6.7.0

import { FormulaService } from '../services/formula.service';
import { validateRequest } from '../middleware/validation.middleware';
import { errorHandler } from '../middleware/error.middleware';
import { 
    IFormulaRequest,
    IFormulaSuggestionResponse,
    IFormulaValidationResult,
    ErrorSeverity,
    FormulaErrorCode
} from '../interfaces/formula.interface';
import { logger } from '../utils/logger';
import { CORE_SERVICE_CONFIG, FORMULA_ENDPOINTS, PERFORMANCE_CONFIG } from '../constants';
import { ServiceName } from '../../../shared/types';

/**
 * Enhanced controller class for Excel formula operations with comprehensive
 * security, monitoring, and performance optimizations
 */
export class FormulaController {
    private readonly _formulaService: FormulaService;
    private readonly _aiCircuitBreaker: CircuitBreaker;
    private readonly _compressionMiddleware: any;
    private readonly _correlationIdMiddleware: any;

    constructor(
        formulaService: FormulaService,
        circuitBreaker: CircuitBreaker
    ) {
        this._formulaService = formulaService;
        this._aiCircuitBreaker = circuitBreaker;

        // Initialize compression middleware
        this._compressionMiddleware = compression({
            level: 6,
            threshold: 1024
        });

        // Initialize correlation tracking
        this._correlationIdMiddleware = this.correlationIdMiddleware.bind(this);

        // Configure rate limiters
        this.configureRateLimits();
    }

    /**
     * Handles formula generation requests with enhanced security and performance monitoring
     * @route POST /api/v1/formula/suggest
     */
    public async generateFormula(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const startTime = Date.now();
        const correlationId = req.headers['x-correlation-id'] as string;

        try {
            // Apply compression for large responses
            this._compressionMiddleware(req, res, async () => {
                const formulaRequest = req.body as IFormulaRequest;

                // Track request metrics
                logger.info('Formula generation request received', {
                    correlationId,
                    input: formulaRequest.input.substring(0, 100)
                });

                // Use circuit breaker for AI service calls
                const suggestions = await this._aiCircuitBreaker.fire(
                    async () => await this._formulaService.generateFormula(
                        formulaRequest,
                        correlationId
                    )
                );

                // Calculate processing time
                const processingTime = Date.now() - startTime;

                // Track performance metrics
                logger.trackMetric('formula_generation_time', processingTime, {
                    correlationId,
                    success: true
                });

                res.status(StatusCodes.OK).json({
                    success: true,
                    data: suggestions,
                    processingTime
                });
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles formula validation requests with enhanced error tracking
     * @route POST /api/v1/formula/validate
     */
    public async validateFormula(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const startTime = Date.now();
        const correlationId = req.headers['x-correlation-id'] as string;

        try {
            const { formula, context } = req.body;

            // Track validation request
            logger.info('Formula validation request received', {
                correlationId,
                formulaLength: formula.length
            });

            const validationResult = await this._formulaService.validateFormula(
                formula,
                context,
                correlationId
            );

            // Track validation metrics
            const processingTime = Date.now() - startTime;
            logger.trackMetric('formula_validation_time', processingTime, {
                correlationId,
                success: validationResult.isValid
            });

            res.status(StatusCodes.OK).json({
                success: true,
                data: validationResult,
                processingTime
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles formula optimization requests with performance tracking
     * @route POST /api/v1/formula/optimize
     */
    public async optimizeFormula(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const startTime = Date.now();
        const correlationId = req.headers['x-correlation-id'] as string;

        try {
            const { formula, context } = req.body;

            // Track optimization request
            logger.info('Formula optimization request received', {
                correlationId,
                formulaLength: formula.length
            });

            const optimizationResult = await this._formulaService.optimizeFormula(
                formula,
                context,
                correlationId
            );

            // Track optimization metrics
            const processingTime = Date.now() - startTime;
            logger.trackMetric('formula_optimization_time', processingTime, {
                correlationId,
                success: true
            });

            res.status(StatusCodes.OK).json({
                success: true,
                data: optimizationResult,
                processingTime
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Configures rate limits for formula endpoints
     */
    private configureRateLimits(): void {
        const formulaRateLimit = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 100, // limit each IP to 100 requests per windowMs
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                success: false,
                error: {
                    code: FormulaErrorCode.RATE_LIMIT_EXCEEDED,
                    message: 'Too many requests, please try again later',
                    severity: ErrorSeverity.ERROR
                }
            }
        });

        // Apply rate limits to routes
        this.generateFormula = formulaRateLimit(this.generateFormula.bind(this));
        this.validateFormula = formulaRateLimit(this.validateFormula.bind(this));
        this.optimizeFormula = formulaRateLimit(this.optimizeFormula.bind(this));
    }

    /**
     * Middleware for correlation ID tracking
     */
    private correlationIdMiddleware(
        req: Request,
        res: Response,
        next: NextFunction
    ): void {
        if (!req.headers['x-correlation-id']) {
            req.headers['x-correlation-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        next();
    }
}