/**
 * @fileoverview Express router configuration for version control endpoints in the Excel Add-in core service
 * Implements secure, performant, and monitored routes for version history, change tracking, and rollback
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { CircuitBreaker } from 'opossum'; // v6.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import cacheManager from 'cache-manager'; // v4.1.0
import { VersionController } from '../controllers/version.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { IVersion } from '../interfaces/version.interface';
import { logger } from '../utils/logger';
import { PERFORMANCE_CONFIG, ERROR_MESSAGES } from '../constants';

// Version control route paths
const VERSION_ROUTES = {
    CREATE: '/versions',
    GET: '/versions/:id',
    LIST: '/versions/workbook/:workbookId',
    REVERT: '/versions/:id/revert'
} as const;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: ERROR_MESSAGES.ERROR_CODES.RATE_LIMIT
};

// Cache configuration
const CACHE_CONFIG = {
    ttl: PERFORMANCE_CONFIG.CACHE_TTL.VERSION_HISTORY,
    exclude: ['/versions/*/revert']
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
    timeout: PERFORMANCE_CONFIG.CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
};

/**
 * Configures and returns an Express router with secured version control endpoints
 * @param controller - Version controller instance
 * @returns Configured Express router
 */
export function configureVersionRoutes(controller: VersionController): Router {
    const router = Router();
    const memoryCache = cacheManager.caching({ store: 'memory', max: 100, ttl: CACHE_CONFIG.ttl });

    // Apply global middleware
    router.use(authenticate);
    router.use(rateLimit(RATE_LIMIT_CONFIG));

    // Circuit breaker for version operations
    const versionBreaker = new CircuitBreaker(async (...args) => {
        return await Promise.resolve(args);
    }, CIRCUIT_BREAKER_CONFIG);

    versionBreaker.on('open', () => {
        logger.error('Version control circuit breaker opened', {
            service: 'version-routes',
            event: 'circuit-breaker-open'
        });
    });

    // Create new version
    router.post(
        VERSION_ROUTES.CREATE,
        validateRequest('createVersion'),
        async (req, res, next) => {
            const startTime = Date.now();
            try {
                const version = await controller.createVersion(req.body);
                logger.info('Version created successfully', {
                    versionId: version.id,
                    duration: Date.now() - startTime
                });
                res.status(201).json({ success: true, data: version });
            } catch (error) {
                next(error);
            }
        }
    );

    // Get specific version with caching
    router.get(
        VERSION_ROUTES.GET,
        async (req, res, next) => {
            const { id } = req.params;
            const cacheKey = `version:${id}`;

            try {
                // Check cache first
                const cachedVersion = await memoryCache.get<IVersion>(cacheKey);
                if (cachedVersion) {
                    return res.json({ success: true, data: cachedVersion });
                }

                // Get version through circuit breaker
                const version = await versionBreaker.fire(
                    controller.getVersion(id)
                );

                // Cache the result
                await memoryCache.set(cacheKey, version);

                res.json({ success: true, data: version });
            } catch (error) {
                next(error);
            }
        }
    );

    // List versions for workbook with pagination
    router.get(
        VERSION_ROUTES.LIST,
        async (req, res, next) => {
            const { workbookId } = req.params;
            const { page = 1, pageSize = 10 } = req.query;

            try {
                const versions = await controller.listVersions(
                    workbookId,
                    Number(page),
                    Number(pageSize)
                );

                res.json({
                    success: true,
                    data: versions,
                    pagination: {
                        page: Number(page),
                        pageSize: Number(pageSize),
                        total: versions.length
                    }
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Revert to specific version
    router.post(
        VERSION_ROUTES.REVERT,
        validateRequest('revertVersion'),
        async (req, res, next) => {
            const { id } = req.params;
            const startTime = Date.now();

            try {
                const revertedVersion = await controller.revertToVersion(id);

                // Clear cache for affected versions
                await memoryCache.del(`version:${id}`);

                logger.info('Version revert successful', {
                    originalVersionId: id,
                    newVersionId: revertedVersion.id,
                    duration: Date.now() - startTime
                });

                res.json({ success: true, data: revertedVersion });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}