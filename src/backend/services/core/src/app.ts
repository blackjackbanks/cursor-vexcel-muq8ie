/**
 * @fileoverview Main application entry point for Excel Add-in Core Service
 * Configures Express application with enterprise-grade security, monitoring, and scalability features
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^6.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import * as applicationInsights from 'applicationinsights'; // ^2.5.0
import Redis from 'redis'; // ^4.5.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import CircuitBreaker from 'opossum'; // ^6.0.0

import { configureFormulaRoutes } from './routes/formula.routes';
import { configureVersionRoutes } from './routes/version.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { config } from './config';
import { ServiceName } from '../../shared/types';

// Global constants
const PORT = process.env.PORT || 3000;
const API_PREFIX = '/api/v1';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;
const CIRCUIT_BREAKER_TIMEOUT = 10000; // 10 seconds

/**
 * Configures comprehensive middleware chain with security, monitoring and performance features
 * @param app Express application instance
 */
const configureMiddleware = (app: Express): void => {
    // Initialize Application Insights
    applicationInsights
        .setup(config.monitoring.applicationInsights.key)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .start();

    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", config.services.ai.url, config.services.data.url]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));

    // CORS configuration
    app.use(cors({
        origin: config.server.cors.origins,
        methods: config.server.cors.methods,
        allowedHeaders: config.server.cors.headers,
        credentials: true,
        maxAge: 3600
    }));

    // Request parsing and compression
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use(compression());

    // Request logging with security context
    app.use(morgan('combined', {
        stream: {
            write: (message: string) => {
                logger.info('HTTP Request', { message, service: ServiceName.CORE });
            }
        },
        skip: (req: Request) => req.path === '/health'
    }));

    // Rate limiting per tenant
    const limiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW,
        max: RATE_LIMIT_MAX_REQUESTS,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
            return req.headers['x-tenant-id'] as string || req.ip;
        }
    });
    app.use(limiter);

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        res.json({
            status: 'healthy',
            service: ServiceName.CORE,
            timestamp: new Date().toISOString()
        });
    });
};

/**
 * Configures API routes with security middleware and controllers
 * @param app Express application instance
 */
const configureRoutes = (app: Express): void => {
    // Circuit breaker for external service calls
    const breaker = new CircuitBreaker(Promise.resolve, {
        timeout: CIRCUIT_BREAKER_TIMEOUT,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
    });

    breaker.on('open', () => {
        logger.warn('Circuit breaker opened', { service: ServiceName.CORE });
    });

    // API routes
    app.use(`${API_PREFIX}/formula`, configureFormulaRoutes());
    app.use(`${API_PREFIX}/version`, configureVersionRoutes());

    // Error handling
    app.use(errorHandler);

    // 404 handler
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            success: false,
            error: {
                code: 'ROUTE_NOT_FOUND',
                message: 'Requested route not found',
                service: ServiceName.CORE
            }
        });
    });
};

/**
 * Starts the Express server with graceful shutdown support
 * @param app Express application instance
 */
const startServer = async (app: Express): Promise<void> => {
    try {
        // Initialize Redis connection
        const redis = Redis.createClient({
            url: config.redis.url,
            retryStrategy: (times: number) => Math.min(times * 100, 3000)
        });

        await redis.connect();
        logger.info('Redis connected successfully');

        // Start HTTP server
        const server = app.listen(PORT, () => {
            logger.info(`Server started successfully`, {
                port: PORT,
                environment: process.env.NODE_ENV,
                service: ServiceName.CORE
            });
        });

        // Graceful shutdown
        const shutdown = async () => {
            logger.info('Shutting down server...');
            
            server.close(async () => {
                await redis.quit();
                logger.info('Server shutdown complete');
                process.exit(0);
            });

            // Force shutdown after timeout
            setTimeout(() => {
                logger.error('Forced shutdown due to timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logger.error('Server startup failed', { error });
        process.exit(1);
    }
};

// Initialize Express application
const app = express();
configureMiddleware(app);
configureRoutes(app);

// Export for testing
export { app, startServer };

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    startServer(app);
}