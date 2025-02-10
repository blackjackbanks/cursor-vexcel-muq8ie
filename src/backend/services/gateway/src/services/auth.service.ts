/**
 * @fileoverview Enhanced authentication service implementing secure OAuth 2.0 flow with 
 * device-based validation, token fingerprinting, and comprehensive session management
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import * as msal from '@azure/msal-node'; // v2.1.0
import Redis from 'ioredis'; // v5.3.2
import { randomBytes } from 'crypto';
import { generateToken, verifyToken } from '../utils/jwt';
import { IAPIResponse } from '../../../shared/interfaces';

// Environment variables and constants
const MSAL_CONFIG = JSON.parse(process.env.MSAL_CONFIG!);
const REDIS_URL = process.env.REDIS_URL!;
const TOKEN_CACHE_PREFIX = 'auth:token:';
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '1h';
const REFRESH_TOKEN_FAMILY_PREFIX = 'auth:refresh:family:';

/**
 * Interface for token family tracking
 */
interface ITokenFamily {
    familyId: string;
    deviceId: string;
    lastRotation: number;
    tokens: string[];
}

/**
 * Interface for authentication result
 */
interface IAuthResult {
    accessToken: string;
    refreshToken: string;
    deviceContext: {
        deviceId: string;
        fingerprint: string;
        lastAuthenticated: number;
    };
}

@injectable()
export class AuthService {
    private msalClient: msal.ConfidentialClientApplication;
    private redisClient: Redis.Cluster;
    private tokenManager: TokenManager;

    constructor() {
        // Initialize MSAL client with secure configuration
        this.msalClient = new msal.ConfidentialClientApplication(MSAL_CONFIG);

        // Setup Redis cluster client with enhanced security
        this.redisClient = new Redis.Cluster([
            {
                host: REDIS_URL,
                port: 6379,
                tls: true
            }
        ], {
            redisOptions: {
                password: process.env.REDIS_PASSWORD,
                enableTLSForSentinelMode: true,
                maxRetriesPerRequest: 3
            }
        });

        // Initialize token manager
        this.tokenManager = new TokenManager(this.redisClient);

        // Setup security event listeners
        this.setupSecurityEventListeners();
    }

    /**
     * Authenticates user with enhanced security including device validation
     * @param code - Authorization code from OAuth flow
     * @param deviceId - Unique device identifier
     * @returns Promise resolving to authentication result
     */
    public async authenticateUser(
        code: string,
        deviceId: string
    ): Promise<IAPIResponse<IAuthResult>> {
        try {
            // Validate inputs
            if (!code || !deviceId) {
                throw new Error('Missing required authentication parameters');
            }

            // Exchange code for tokens
            const authResult = await this.msalClient.acquireTokenByCode({
                code,
                scopes: ['User.Read', 'offline_access'],
                redirectUri: process.env.REDIRECT_URI
            });

            if (!authResult) {
                throw new Error('Failed to acquire tokens');
            }

            // Generate device fingerprint and create token family
            const familyId = randomBytes(16).toString('hex');
            const tokenFamily: ITokenFamily = {
                familyId,
                deviceId,
                lastRotation: Date.now(),
                tokens: []
            };

            // Generate enhanced JWT tokens
            const accessToken = await generateToken(
                {
                    id: authResult.uniqueId!,
                    email: authResult.account!.username,
                    role: 'user'
                },
                deviceId
            );

            // Cache token family
            await this.tokenManager.createTokenFamily(familyId, tokenFamily);

            // Store MSAL refresh token securely
            await this.tokenManager.cacheRefreshToken(
                familyId,
                authResult.refreshToken!,
                deviceId
            );

            return {
                success: true,
                data: {
                    accessToken,
                    refreshToken: authResult.refreshToken!,
                    deviceContext: {
                        deviceId,
                        fingerprint: randomBytes(32).toString('hex'),
                        lastAuthenticated: Date.now()
                    }
                }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'AUTH_FAILED',
                    message: error.message,
                    service: 'api-gateway',
                    details: {},
                    timestamp: Date.now(),
                    correlationId: randomBytes(8).toString('hex')
                }
            };
        }
    }

    /**
     * Enhanced token validation with device context and fingerprint verification
     * @param token - JWT token to validate
     * @param deviceId - Device identifier for validation
     * @returns Promise resolving to validation result
     */
    public async validateToken(
        token: string,
        deviceId: string
    ): Promise<IAPIResponse> {
        try {
            // Perform comprehensive token validation
            const validationResult = await verifyToken(token, deviceId);

            if (!validationResult.success) {
                throw new Error(validationResult.error?.message);
            }

            // Check token family status
            const familyId = (validationResult.data as any).family;
            const isValidFamily = await this.tokenManager.validateTokenFamily(
                familyId,
                deviceId
            );

            if (!isValidFamily) {
                throw new Error('Invalid token family');
            }

            return validationResult;
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'TOKEN_VALIDATION_FAILED',
                    message: error.message,
                    service: 'api-gateway',
                    details: {},
                    timestamp: Date.now(),
                    correlationId: randomBytes(8).toString('hex')
                }
            };
        }
    }

    /**
     * Secure token refresh with rotation and family tracking
     * @param refreshToken - Current refresh token
     * @param deviceId - Device identifier for validation
     * @returns Promise resolving to new token pair
     */
    public async refreshUserToken(
        refreshToken: string,
        deviceId: string
    ): Promise<IAPIResponse<IAuthResult>> {
        try {
            // Validate refresh token family
            const familyId = await this.tokenManager.getTokenFamily(refreshToken);
            if (!familyId) {
                throw new Error('Invalid refresh token');
            }

            // Acquire new tokens from MSAL
            const authResult = await this.msalClient.acquireTokenByRefreshToken({
                refreshToken,
                scopes: ['User.Read', 'offline_access']
            });

            if (!authResult) {
                throw new Error('Token refresh failed');
            }

            // Generate new enhanced JWT
            const accessToken = await generateToken(
                {
                    id: authResult.uniqueId!,
                    email: authResult.account!.username,
                    role: 'user'
                },
                deviceId
            );

            // Update token family
            await this.tokenManager.rotateTokenFamily(
                familyId,
                authResult.refreshToken!,
                deviceId
            );

            return {
                success: true,
                data: {
                    accessToken,
                    refreshToken: authResult.refreshToken!,
                    deviceContext: {
                        deviceId,
                        fingerprint: randomBytes(32).toString('hex'),
                        lastAuthenticated: Date.now()
                    }
                }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'TOKEN_REFRESH_FAILED',
                    message: error.message,
                    service: 'api-gateway',
                    details: {},
                    timestamp: Date.now(),
                    correlationId: randomBytes(8).toString('hex')
                }
            };
        }
    }

    /**
     * Comprehensive logout with token revocation and session cleanup
     * @param token - Current access token
     * @param deviceId - Device identifier for validation
     * @returns Promise resolving to logout result
     */
    public async logoutUser(
        token: string,
        deviceId: string
    ): Promise<IAPIResponse> {
        try {
            // Validate token and device context
            const validationResult = await this.validateToken(token, deviceId);
            if (!validationResult.success) {
                throw new Error('Invalid token');
            }

            const tokenData = validationResult.data as any;
            const familyId = tokenData.family;

            // Revoke token family
            await this.tokenManager.revokeTokenFamily(familyId);

            // Clear device-specific cache
            await this.tokenManager.clearDeviceCache(deviceId);

            return {
                success: true,
                data: {
                    message: 'Logout successful',
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'LOGOUT_FAILED',
                    message: error.message,
                    service: 'api-gateway',
                    details: {},
                    timestamp: Date.now(),
                    correlationId: randomBytes(8).toString('hex')
                }
            };
        }
    }

    /**
     * Sets up security event listeners for token management
     * @private
     */
    private setupSecurityEventListeners(): void {
        this.redisClient.on('error', (error) => {
            console.error('Redis security event:', error);
            // Implement security alert mechanism here
        });

        process.on('SIGTERM', async () => {
            await this.cleanup();
        });
    }

    /**
     * Performs cleanup operations on service shutdown
     * @private
     */
    private async cleanup(): Promise<void> {
        try {
            await this.redisClient.quit();
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

/**
 * Token management class for handling token families and rotation
 * @private
 */
class TokenManager {
    constructor(private redis: Redis.Cluster) {}

    async createTokenFamily(
        familyId: string,
        family: ITokenFamily
    ): Promise<void> {
        await this.redis.set(
            `${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`,
            JSON.stringify(family),
            'EX',
            7 * 24 * 3600 // 7 days
        );
    }

    async validateTokenFamily(
        familyId: string,
        deviceId: string
    ): Promise<boolean> {
        const family = await this.getTokenFamilyById(familyId);
        return family?.deviceId === deviceId;
    }

    async rotateTokenFamily(
        familyId: string,
        newToken: string,
        deviceId: string
    ): Promise<void> {
        const family = await this.getTokenFamilyById(familyId);
        if (family) {
            family.tokens.push(newToken);
            family.lastRotation = Date.now();
            await this.createTokenFamily(familyId, family);
        }
    }

    async revokeTokenFamily(familyId: string): Promise<void> {
        await this.redis.del(`${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`);
    }

    private async getTokenFamilyById(
        familyId: string
    ): Promise<ITokenFamily | null> {
        const family = await this.redis.get(
            `${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`
        );
        return family ? JSON.parse(family) : null;
    }

    async getTokenFamily(refreshToken: string): Promise<string | null> {
        // Implementation for getting token family from refresh token
        return null;
    }

    async cacheRefreshToken(
        familyId: string,
        refreshToken: string,
        deviceId: string
    ): Promise<void> {
        await this.redis.set(
            `${TOKEN_CACHE_PREFIX}${refreshToken}`,
            JSON.stringify({ familyId, deviceId }),
            'EX',
            7 * 24 * 3600 // 7 days
        );
    }

    async clearDeviceCache(deviceId: string): Promise<void> {
        // Implementation for clearing device-specific cache
        const keys = await this.redis.keys(`${TOKEN_CACHE_PREFIX}*`);
        for (const key of keys) {
            const value = await this.redis.get(key);
            if (value && JSON.parse(value).deviceId === deviceId) {
                await this.redis.del(key);
            }
        }
    }
}