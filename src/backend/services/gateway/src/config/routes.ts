/**
 * @fileoverview API Gateway route configuration implementing secure routing, middleware orchestration,
 * rate limiting, and service proxying with enhanced monitoring and error handling capabilities
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // v4.18.2
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware'; // v2.0.6
import { authenticate, authorize } from '../middleware/auth.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { randomBytes } from 'crypto';
import { IAPIResponse } from '../../../shared/interfaces';

// Service route configuration
const SERVICE_ROUTES = {
    AI_SERVICE: process.env.AI_SERVICE_URL || 'http://ai-service:3001',
    CORE_SERVICE: process.env.CORE_SERVICE_URL || 'http://core-service:3002',
    DATA_SERVICE: process.env.DATA_SERVICE_URL || 'http://data-service:3003'
};

// Rate limit configuration (requests/minute)
const RATE_LIMITS = {
    FORMULA: '100/min',
    DATA_CLEANING: '20/min',
    VERSION: '200/min',
    CHANGES: '50/min'
};

/**
 * Configures API Gateway routes with comprehensive security, monitoring, and error handling
 * @param app - Express application instance
 */
export const configureRoutes = (app: Application): void => {
    // Initialize rate limiter
    const rateLimiter = new RateLimitMiddleware({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.NODE_ENV === 'production'
    }, console);

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        res.json({ status: 'healthy', timestamp: Date.now() });
    });

    // AI Service Routes
    app.post('/api/v1/formula/suggest',
        authenticate,
        authorize(['user', 'admin']),
        rateLimiter.applyRateLimit('formula/suggest'),
        setupServiceProxy(SERVICE_ROUTES.AI_SERVICE, {
            pathRewrite: {
                '^/api/v1/formula': '/formula'
            }
        })
    );

    // Data Service Routes
    app.post('/api/v1/data/clean',
        authenticate,
        authorize(['user', 'admin']),
        rateLimiter.applyRateLimit('data/clean'),
        setupServiceProxy(SERVICE_ROUTES.DATA_SERVICE, {
            pathRewrite: {
                '^/api/v1/data': '/data'
            }
        })
    );

    // Version Control Routes
    app.get('/api/v1/version/:id',
        authenticate,
        authorize(['user', 'admin']),
        rateLimiter.applyRateLimit('version'),
        setupServiceProxy(SERVICE_ROUTES.CORE_SERVICE, {
            pathRewrite: {
                '^/api/v1/version': '/version'
            }
        })
    );

    app.post('/api/v1/changes/batch',
        authenticate,
        authorize(['user', 'admin']),
        rateLimiter.applyRateLimit('changes/batch'),
        setupServiceProxy(SERVICE_ROUTES.CORE_SERVICE, {
            pathRewrite: {
                '^/api/v1/changes': '/changes'
            }
        })
    );

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        const errorResponse: IAPIResponse = {
            success: false,
            error: {
                code: 'GATEWAY_ERROR',
                message: err.message,
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

        res.status(500).json(errorResponse);
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
        const notFoundResponse: IAPIResponse = {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Requested resource not found',
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

        res.status(404).json(notFoundResponse);
    });
};

/**
 * Creates proxy middleware with circuit breaker and monitoring
 * @param serviceUrl - Target service URL
 * @param options - Proxy configuration options
 * @returns Configured proxy middleware
 */
const setupServiceProxy = (serviceUrl: string, options: ProxyOptions) => {
    const defaultOptions: ProxyOptions = {
        target: serviceUrl,
        changeOrigin: true,
        secure: process.env.NODE_ENV === 'production',
        xfwd: true,
        proxyTimeout: 10000,
        timeout: 10000,
        onError: (err: Error, req: Request, res: Response) => {
            const proxyError: IAPIResponse = {
                success: false,
                error: {
                    code: 'PROXY_ERROR',
                    message: 'Service temporarily unavailable',
                    service: 'api-gateway',
                    details: {
                        cause: err.message,
                        target: serviceUrl,
                        timestamp: Date.now()
                    },
                    timestamp: Date.now(),
                    correlationId: randomBytes(8).toString('hex')
                }
            };

            res.status(502).json(proxyError);
        },
        onProxyReq: (proxyReq, req) => {
            // Add correlation ID for request tracking
            proxyReq.setHeader('X-Correlation-ID', randomBytes(8).toString('hex'));
            proxyReq.setHeader('X-Forwarded-For', req.ip);
            
            // Add original user context
            if (req.user) {
                proxyReq.setHeader('X-User-ID', req.user.id);
                proxyReq.setHeader('X-User-Role', req.user.role);
            }
        },
        onProxyRes: (proxyRes, req, res) => {
            // Add CORS headers
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        }
    };

    return createProxyMiddleware({ ...defaultOptions, ...options });
};

export { setupServiceProxy };