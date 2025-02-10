/**
 * @fileoverview Comprehensive test suite for AuthService with enhanced security features
 * Tests authentication flow, token management, device validation, and Redis cluster integration
 * @version 1.0.0
 */

import { AuthService } from '../src/services/auth.service';
import { IAPIResponse } from '../../../shared/interfaces';
import * as msal from '@azure/msal-node'; // v2.1.0
import Redis from 'ioredis-mock'; // v8.2.2
import { randomBytes } from 'crypto';

// Mock configurations and constants
const TEST_USER = {
    id: 'test-user-id',
    email: 'test@company.com',
    deviceId: 'test-device-001',
    role: 'user'
};

const MOCK_AUTH_CODE = 'mock-auth-code';
const MOCK_JWT_SECRET = 'test-jwt-secret';
const MOCK_DEVICE_FINGERPRINT = 'device-fingerprint-hash';

// Mock Redis cluster
let redisMock: Redis.Cluster;
let authService: AuthService;

// Mock MSAL client
jest.mock('@azure/msal-node', () => {
    return {
        ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
            acquireTokenByCode: jest.fn().mockResolvedValue({
                uniqueId: TEST_USER.id,
                account: { username: TEST_USER.email },
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token'
            }),
            acquireTokenByRefreshToken: jest.fn().mockResolvedValue({
                uniqueId: TEST_USER.id,
                account: { username: TEST_USER.email },
                accessToken: 'mock-new-access-token',
                refreshToken: 'mock-new-refresh-token'
            })
        }))
    };
});

describe('AuthService', () => {
    beforeAll(async () => {
        // Setup environment variables
        process.env.MSAL_CONFIG = JSON.stringify({
            auth: {
                clientId: 'mock-client-id',
                authority: 'https://mock.authority'
            }
        });
        process.env.JWT_SECRET = MOCK_JWT_SECRET;
        process.env.REDIS_URL = 'redis://localhost:6379';

        // Initialize Redis mock cluster
        redisMock = new Redis.Cluster([
            {
                host: 'localhost',
                port: 6379
            }
        ]);

        // Initialize AuthService with mocked dependencies
        authService = new AuthService();
    });

    afterAll(async () => {
        await redisMock.quit();
        jest.clearAllMocks();
    });

    describe('authenticateUser', () => {
        it('should successfully authenticate user with valid device context', async () => {
            const response = await authService.authenticateUser(
                MOCK_AUTH_CODE,
                TEST_USER.deviceId
            );

            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('accessToken');
            expect(response.data).toHaveProperty('refreshToken');
            expect(response.data).toHaveProperty('deviceContext');
            expect(response.data?.deviceContext.deviceId).toBe(TEST_USER.deviceId);
        });

        it('should fail authentication with invalid auth code', async () => {
            const response = await authService.authenticateUser(
                '',
                TEST_USER.deviceId
            );

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('AUTH_FAILED');
        });

        it('should create token family on successful authentication', async () => {
            const response = await authService.authenticateUser(
                MOCK_AUTH_CODE,
                TEST_USER.deviceId
            );

            expect(response.success).toBe(true);
            const familyKey = await redisMock.keys('auth:refresh:family:*');
            expect(familyKey.length).toBeGreaterThan(0);
        });
    });

    describe('validateToken', () => {
        let validToken: string;

        beforeEach(async () => {
            const authResponse = await authService.authenticateUser(
                MOCK_AUTH_CODE,
                TEST_USER.deviceId
            );
            validToken = authResponse.data?.accessToken || '';
        });

        it('should validate a legitimate token with correct device context', async () => {
            const response = await authService.validateToken(
                validToken,
                TEST_USER.deviceId
            );

            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
        });

        it('should reject token with invalid device ID', async () => {
            const response = await authService.validateToken(
                validToken,
                'invalid-device-id'
            );

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('TOKEN_VALIDATION_FAILED');
        });

        it('should reject expired token', async () => {
            // Fast-forward time by 2 hours
            jest.advanceTimersByTime(2 * 60 * 60 * 1000);

            const response = await authService.validateToken(
                validToken,
                TEST_USER.deviceId
            );

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('TOKEN_VALIDATION_FAILED');
        });
    });

    describe('refreshUserToken', () => {
        let refreshToken: string;

        beforeEach(async () => {
            const authResponse = await authService.authenticateUser(
                MOCK_AUTH_CODE,
                TEST_USER.deviceId
            );
            refreshToken = authResponse.data?.refreshToken || '';
        });

        it('should successfully refresh tokens with valid refresh token', async () => {
            const response = await authService.refreshUserToken(
                refreshToken,
                TEST_USER.deviceId
            );

            expect(response.success).toBe(true);
            expect(response.data?.accessToken).toBeDefined();
            expect(response.data?.refreshToken).toBeDefined();
            expect(response.data?.deviceContext).toBeDefined();
        });

        it('should maintain token family relationship after refresh', async () => {
            const response = await authService.refreshUserToken(
                refreshToken,
                TEST_USER.deviceId
            );

            expect(response.success).toBe(true);
            const familyKeys = await redisMock.keys('auth:refresh:family:*');
            expect(familyKeys.length).toBe(1);
        });

        it('should reject refresh with invalid token', async () => {
            const response = await authService.refreshUserToken(
                'invalid-refresh-token',
                TEST_USER.deviceId
            );

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('TOKEN_REFRESH_FAILED');
        });
    });

    describe('logoutUser', () => {
        let accessToken: string;

        beforeEach(async () => {
            const authResponse = await authService.authenticateUser(
                MOCK_AUTH_CODE,
                TEST_USER.deviceId
            );
            accessToken = authResponse.data?.accessToken || '';
        });

        it('should successfully logout and cleanup token family', async () => {
            const response = await authService.logoutUser(
                accessToken,
                TEST_USER.deviceId
            );

            expect(response.success).toBe(true);
            const familyKeys = await redisMock.keys('auth:refresh:family:*');
            expect(familyKeys.length).toBe(0);
        });

        it('should clear device-specific cache on logout', async () => {
            await authService.logoutUser(accessToken, TEST_USER.deviceId);

            const cacheKeys = await redisMock.keys('auth:token:*');
            expect(cacheKeys.length).toBe(0);
        });

        it('should fail logout with invalid token', async () => {
            const response = await authService.logoutUser(
                'invalid-token',
                TEST_USER.deviceId
            );

            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('LOGOUT_FAILED');
        });
    });

    describe('Security Event Handling', () => {
        it('should handle Redis connection errors gracefully', async () => {
            const errorSpy = jest.spyOn(console, 'error');
            redisMock.emit('error', new Error('Redis connection lost'));

            expect(errorSpy).toHaveBeenCalledWith(
                'Redis security event:',
                expect.any(Error)
            );
            errorSpy.mockRestore();
        });

        it('should cleanup resources on SIGTERM', async () => {
            const cleanupSpy = jest.spyOn(authService as any, 'cleanup');
            process.emit('SIGTERM', 'SIGTERM');

            expect(cleanupSpy).toHaveBeenCalled();
            cleanupSpy.mockRestore();
        });
    });
});