/**
 * @fileoverview Comprehensive test suite for API Gateway validating route configuration,
 * middleware chains, service proxy functionality, rate limiting, authentication, and circuit breaker behavior
 * @version 1.0.0
 */

import { Express } from 'express';
import express from 'express'; // v4.18.2
import supertest from 'supertest'; // v6.3.3
import nock from 'nock'; // v13.3.1
import RedisMock from 'redis-mock'; // v0.56.3
import CircuitBreaker from 'circuit-breaker-js'; // v0.0.1
import { configureRoutes, setupServiceProxy } from '../src/config/routes';
import { authMiddleware } from '../src/middleware/auth.middleware';
import { RateLimitMiddleware } from '../src/middleware/rate-limit.middleware';
import { IAPIResponse } from '../../../shared/interfaces';

// Mock Redis client
jest.mock('redis', () => RedisMock);

describe('API Gateway Routes', () => {
    let app: Express;
    let request: supertest.SuperTest<supertest.Test>;
    let rateLimiter: RateLimitMiddleware;
    let mockCircuitBreaker: CircuitBreaker;

    const SERVICE_ROUTES = {
        AI_SERVICE: 'http://ai-service:3001',
        CORE_SERVICE: 'http://core-service:3002',
        DATA_SERVICE: 'http://data-service:3003'
    };

    const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const VALID_DEVICE_ID = '123e4567-e89b-12d3-a456-426614174000';

    beforeAll(async () => {
        // Initialize Express app
        app = express();
        app.use(express.json());

        // Initialize rate limiter with mock Redis
        rateLimiter = new RateLimitMiddleware({
            host: 'localhost',
            port: 6379,
            tls: false
        }, console);

        // Initialize circuit breaker
        mockCircuitBreaker = new CircuitBreaker({
            windowDuration: 10000,
            numBuckets: 10,
            timeoutDuration: 3000,
            errorThreshold: 50,
            volumeThreshold: 10
        });

        // Configure routes
        configureRoutes(app);

        // Initialize supertest
        request = supertest(app);

        // Configure nock for service mocking
        nock.disableNetConnect();
        nock.enableNetConnect('127.0.0.1');
    });

    afterAll(async () => {
        // Clean up mocks and connections
        nock.cleanAll();
        nock.enableNetConnect();
        await rateLimiter.shutdown();
    });

    describe('Route Configuration', () => {
        test('should configure all required endpoints', async () => {
            const endpoints = [
                { path: '/health', method: 'GET' },
                { path: '/api/v1/formula/suggest', method: 'POST' },
                { path: '/api/v1/data/clean', method: 'POST' },
                { path: '/api/v1/version/123', method: 'GET' },
                { path: '/api/v1/changes/batch', method: 'POST' }
            ];

            for (const endpoint of endpoints) {
                const response = await request[endpoint.method.toLowerCase()](endpoint.path)
                    .set('Authorization', `Bearer ${VALID_JWT}`)
                    .set('x-device-id', VALID_DEVICE_ID);

                expect(response.status).not.toBe(404);
            }
        });

        test('should return 404 for non-existent routes', async () => {
            const response = await request.get('/non-existent-route');
            expect(response.status).toBe(404);
            expect(response.body).toMatchObject({
                success: false,
                error: {
                    code: 'NOT_FOUND'
                }
            });
        });
    });

    describe('Authentication Middleware', () => {
        test('should reject requests without authentication', async () => {
            const response = await request.post('/api/v1/formula/suggest');
            expect(response.status).toBe(401);
            expect(response.body).toMatchObject({
                success: false,
                error: {
                    code: 'AUTH_FAILED'
                }
            });
        });

        test('should reject invalid JWT tokens', async () => {
            const response = await request.post('/api/v1/formula/suggest')
                .set('Authorization', 'Bearer invalid.token')
                .set('x-device-id', VALID_DEVICE_ID);

            expect(response.status).toBe(401);
        });

        test('should validate device fingerprint', async () => {
            const response = await request.post('/api/v1/formula/suggest')
                .set('Authorization', `Bearer ${VALID_JWT}`)
                .set('x-device-id', 'invalid-device');

            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('AUTH_FAILED');
        });
    });

    describe('Rate Limiting', () => {
        test('should enforce formula endpoint rate limits', async () => {
            const endpoint = '/api/v1/formula/suggest';
            const requests = Array(101).fill(null);

            for (const [index, _] of requests.entries()) {
                const response = await request.post(endpoint)
                    .set('Authorization', `Bearer ${VALID_JWT}`)
                    .set('x-device-id', VALID_DEVICE_ID);

                if (index < 100) {
                    expect(response.status).not.toBe(429);
                } else {
                    expect(response.status).toBe(429);
                    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
                }
            }
        });

        test('should include rate limit headers', async () => {
            const response = await request.post('/api/v1/formula/suggest')
                .set('Authorization', `Bearer ${VALID_JWT}`)
                .set('x-device-id', VALID_DEVICE_ID);

            expect(response.headers).toHaveProperty('x-ratelimit-limit');
            expect(response.headers).toHaveProperty('x-ratelimit-remaining');
            expect(response.headers).toHaveProperty('x-ratelimit-reset');
        });
    });

    describe('Service Proxy', () => {
        test('should proxy requests to appropriate services', async () => {
            // Mock AI service
            nock(SERVICE_ROUTES.AI_SERVICE)
                .post('/formula')
                .reply(200, { success: true, data: { formula: 'SUM(A1:A10)' } });

            const response = await request.post('/api/v1/formula/suggest')
                .set('Authorization', `Bearer ${VALID_JWT}`)
                .set('x-device-id', VALID_DEVICE_ID)
                .send({ text: 'sum range A1 to A10' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });

        test('should handle service unavailability', async () => {
            nock(SERVICE_ROUTES.AI_SERVICE)
                .post('/formula')
                .replyWithError('Service unavailable');

            const response = await request.post('/api/v1/formula/suggest')
                .set('Authorization', `Bearer ${VALID_JWT}`)
                .set('x-device-id', VALID_DEVICE_ID)
                .send({ text: 'sum range A1 to A10' });

            expect(response.status).toBe(502);
            expect(response.body.error.code).toBe('PROXY_ERROR');
        });

        test('should trigger circuit breaker on repeated failures', async () => {
            // Simulate multiple service failures
            nock(SERVICE_ROUTES.AI_SERVICE)
                .post('/formula')
                .times(5)
                .replyWithError('Service unavailable');

            const requests = Array(6).fill(null);
            for (const _ of requests) {
                await request.post('/api/v1/formula/suggest')
                    .set('Authorization', `Bearer ${VALID_JWT}`)
                    .set('x-device-id', VALID_DEVICE_ID)
                    .send({ text: 'sum range A1 to A10' });
            }

            // Circuit should be open now
            const response = await request.post('/api/v1/formula/suggest')
                .set('Authorization', `Bearer ${VALID_JWT}`)
                .set('x-device-id', VALID_DEVICE_ID)
                .send({ text: 'sum range A1 to A10' });

            expect(response.status).toBe(503);
            expect(response.body.error.code).toBe('CIRCUIT_OPEN');
        });
    });

    describe('Performance Requirements', () => {
        test('should meet response time SLA', async () => {
            nock(SERVICE_ROUTES.AI_SERVICE)
                .post('/formula')
                .delay(100) // Simulate 100ms service processing
                .reply(200, { success: true, data: { formula: 'SUM(A1:A10)' } });

            const startTime = Date.now();
            await request.post('/api/v1/formula/suggest')
                .set('Authorization', `Bearer ${VALID_JWT}`)
                .set('x-device-id', VALID_DEVICE_ID)
                .send({ text: 'sum range A1 to A10' });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(responseTime).toBeLessThan(2000); // 2-second SLA
        });
    });
});