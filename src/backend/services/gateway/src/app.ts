/**
 * @fileoverview Main application entry point for the API Gateway service implementing
 * secure request routing, authentication, rate limiting, and service orchestration
 * @version 1.0.0
 */

import express from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import compression from 'compression'; // v1.7.4
import { configureRoutes } from './config/routes';
import { authMiddleware } from './middleware/auth.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import * as promClient from 'prom-client'; // v14.2.0
import { IAPIResponse } from '../../../shared/interfaces';
import { randomBytes } from 'crypto';

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [];
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 900000; // 15 minutes

// Initialize Express application
const app = express();

/**
 * Initializes and configures comprehensive Express middleware stack
 * @param app Express application instance
 */
const initializeMiddleware = (app: express.Application): void => {
    // Initialize Prometheus metrics
    const register = new promClient.Registry();
    promClient.collectDefaultMetrics({ register });

    // Enhanced security headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", ...CORS_ORIGINS]
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
        origin: (origin, callback) => {
            if (!origin || CORS_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID'],
        credentials: true,
        maxAge: 86400 // 24 hours
    }));

    // Compression and parsing
    app.use(compression());
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Request correlation ID
    app.use((req, res, next) => {
        res.locals.correlationId = randomBytes(8).toString('hex');
        next();
    });

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (error) {
            res.status(500).json({ error: 'Failed to collect metrics' });
        }
    });

    // Initialize rate limiter
    const rateLimiter = new RateLimitMiddleware({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: NODE_ENV === 'production'
    }, console);

    // Apply authentication middleware
    app.use(authMiddleware);
};

/**
 * Configures comprehensive error handling middleware
 * @param app Express application instance
 */
const setupErrorHandling = (app: express.Application): void => {
    // Global error handler
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        const errorResponse: IAPIResponse = {
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: NODE_ENV === 'production' ? 'Internal server error' : err.message,
                service: 'api-gateway',
                details: NODE_ENV === 'production' ? {} : {
                    stack: err.stack,
                    path: req.path,
                    method: req.method
                },
                timestamp: Date.now(),
                correlationId: res.locals.correlationId
            }
        };

        res.status(500).json(errorResponse);
    });

    // 404 handler
    app.use((req: express.Request, res: express.Response) => {
        const notFoundResponse: IAPIResponse = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Requested resource not found',
                service: 'api-gateway',
                details: {
                    path: req.path,
                    method: req.method
                },
                timestamp: Date.now(),
                correlationId: res.locals.correlationId
            }
        };

        res.status(404).json(notFoundResponse);
    });
};

/**
 * Initializes and starts the Express server
 * @param app Express application instance
 */
const startServer = async (app: express.Application): Promise<void> => {
    try {
        // Initialize middleware
        initializeMiddleware(app);

        // Configure routes
        configureRoutes(app);

        // Setup error handling
        setupErrorHandling(app);

        // Start server
        app.listen(PORT, () => {
            console.log(`API Gateway listening on port ${PORT} in ${NODE_ENV} mode`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer(app);

export { app };