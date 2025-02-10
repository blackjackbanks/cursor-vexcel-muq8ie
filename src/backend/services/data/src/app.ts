/**
 * @fileoverview Production-grade Express application entry point for the data service
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.0
import helmet from 'helmet'; // ^7.0.0
import cors from 'cors'; // ^2.8.5
import morgan from 'morgan'; // ^1.10.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import { register, collectDefaultMetrics } from 'prom-client'; // ^14.2.0

import { DatabaseService } from './config/database';
import { RedisCache } from './config/redis';
import { 
  API_CONSTANTS, 
  ERROR_CODES, 
  PERFORMANCE_THRESHOLDS, 
  SERVICE_NAMES 
} from '../../../shared/constants';

// Initialize monitoring
collectDefaultMetrics({ prefix: `${SERVICE_NAMES.DATA_SERVICE}_` });

// Global error type
interface ApiError extends Error {
  statusCode?: number;
  errorCode?: string;
}

// Initialize core services
const db = new DatabaseService();
const cache = new RedisCache(null);

/**
 * Initializes and configures the Express application with comprehensive security and monitoring
 */
async function initializeApp(): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
  }));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Logging
  app.use(morgan('combined'));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use(limiter);

  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    const dbHealth = await db.healthCheck();
    const cacheHealth = await cache.getMetrics();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: SERVICE_NAMES.DATA_SERVICE,
      dependencies: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        cache: cacheHealth.errors === 0 ? 'healthy' : 'degraded'
      }
    });
  });

  // Metrics endpoint for monitoring
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  // Circuit breaker configuration
  const breaker = new CircuitBreaker(async (req: Request) => {
    // Implementation for protected routes
    return Promise.resolve();
  }, {
    timeout: PERFORMANCE_THRESHOLDS.DEFAULT_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER.RESET_TIMEOUT_MS
  });

  // Global error handling
  app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
    console.error('[Error]', {
      message: err.message,
      stack: err.stack,
      code: err.errorCode,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(err.statusCode || 500).json({
      error: {
        message: err.message,
        code: err.errorCode || ERROR_CODES.DATABASE.CONNECTION_ERROR,
        requestId: req.headers['x-request-id']
      }
    });
  });

  return app;
}

/**
 * Starts the Express server with advanced error handling and graceful shutdown
 */
async function startServer(app: Express): Promise<void> {
  try {
    // Initialize database connection
    await db.initialize();
    console.log('Database connection established');

    const port = process.env.PORT || 3002;
    const server = app.listen(port, () => {
      console.log(`Data service listening on port ${port}`);
    });

    // Graceful shutdown handler
    process.on('SIGTERM', async () => {
      await handleGracefulShutdown(server, db, cache);
    });

    process.on('SIGINT', async () => {
      await handleGracefulShutdown(server, db, cache);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Manages graceful shutdown of server and resources
 */
async function handleGracefulShutdown(
  server: any,
  db: DatabaseService,
  cache: RedisCache
): Promise<void> {
  console.log('Initiating graceful shutdown...');

  // Stop accepting new connections
  server.close(async () => {
    try {
      // Close database connections
      await db.disconnect();
      console.log('Database connections closed');

      // Clear metrics
      await register.clear();
      console.log('Metrics cleared');

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, PERFORMANCE_THRESHOLDS.DEFAULT_TIMEOUT_MS);
}

// Initialize and start the application
const app = initializeApp().then(startServer);

// Export for testing
export { app };