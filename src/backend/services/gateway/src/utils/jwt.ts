/**
 * @fileoverview JWT utility functions for secure token generation, verification, and management
 * Implements enhanced security features including token fingerprinting, blacklisting, and rotation
 * @version 1.0.0
 */

import { sign, verify, JwtPayload, SignOptions } from 'jsonwebtoken'; // v9.0.0
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis'; // v5.3.0
import { IAPIResponse, IUser } from '../../../shared/interfaces';

// Environment variables and constants
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const TOKEN_ALGORITHM = 'HS256';
const REDIS_PREFIX = 'token_blacklist:';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);

/**
 * Interface for JWT token payload with enhanced security claims
 */
interface ITokenPayload extends JwtPayload {
    user: Omit<IUser, 'password'>;
    fingerprint: string;
    deviceId: string;
    family?: string;
}

/**
 * Generates a secure token fingerprint using SHA-256
 * @param deviceId - Unique device identifier
 * @returns Generated fingerprint hash
 */
const generateFingerprint = (deviceId: string): string => {
    const random = randomBytes(32).toString('hex');
    return createHash('sha256')
        .update(`${deviceId}:${random}`)
        .digest('hex');
};

/**
 * Generates a new JWT token with enhanced security features
 * @param user - User object containing id, email, and role
 * @param deviceId - Unique device identifier
 * @returns Promise resolving to generated JWT token
 */
export const generateToken = async (
    user: IUser,
    deviceId: string
): Promise<string> => {
    try {
        // Validate required user fields
        if (!user.id || !user.email || !user.role) {
            throw new Error('Invalid user object');
        }

        // Generate token fingerprint
        const fingerprint = generateFingerprint(deviceId);

        // Create token payload with security claims
        const payload: ITokenPayload = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            fingerprint,
            deviceId,
            iat: Math.floor(Date.now() / 1000),
            nbf: Math.floor(Date.now() / 1000),
            jti: randomBytes(16).toString('hex')
        };

        // Sign token with configured options
        const signOptions: SignOptions = {
            expiresIn: JWT_EXPIRY,
            algorithm: TOKEN_ALGORITHM
        };

        const token = sign(payload, JWT_SECRET!, signOptions);

        // Store fingerprint in Redis
        await redis.setex(
            `fingerprint:${payload.jti}`,
            3600, // 1 hour
            fingerprint
        );

        return token;
    } catch (error) {
        throw new Error(`Token generation failed: ${error.message}`);
    }
};

/**
 * Verifies and decodes a JWT token with enhanced security checks
 * @param token - JWT token to verify
 * @param deviceId - Device identifier for validation
 * @returns Promise resolving to API response with decoded token or error
 */
export const verifyToken = async (
    token: string,
    deviceId: string
): Promise<IAPIResponse> => {
    try {
        if (!token) {
            return {
                success: false,
                error: {
                    code: 'TOKEN_MISSING',
                    message: 'No token provided',
                    service: 'api-gateway',
                    details: {},
                    timestamp: Date.now(),
                    correlationId: randomBytes(8).toString('hex')
                }
            };
        }

        // Verify token signature and decode payload
        const decoded = verify(token, JWT_SECRET!, {
            algorithms: [TOKEN_ALGORITHM]
        }) as ITokenPayload;

        // Check if token is blacklisted
        const isBlacklisted = await redis.exists(`${REDIS_PREFIX}${decoded.jti}`);
        if (isBlacklisted) {
            throw new Error('Token has been revoked');
        }

        // Verify token fingerprint
        const storedFingerprint = await redis.get(`fingerprint:${decoded.jti}`);
        if (!storedFingerprint || storedFingerprint !== decoded.fingerprint) {
            throw new Error('Invalid token fingerprint');
        }

        // Verify device ID
        if (decoded.deviceId !== deviceId) {
            throw new Error('Invalid device ID');
        }

        return {
            success: true,
            data: decoded
        };
    } catch (error) {
        return {
            success: false,
            error: {
                code: 'TOKEN_INVALID',
                message: error.message,
                service: 'api-gateway',
                details: {},
                timestamp: Date.now(),
                correlationId: randomBytes(8).toString('hex')
            }
        };
    }
};

/**
 * Generates new token pair with secure rotation
 * @param refreshToken - Current refresh token
 * @param deviceId - Device identifier for validation
 * @returns Promise resolving to API response with new token pair
 */
export const refreshToken = async (
    refreshToken: string,
    deviceId: string
): Promise<IAPIResponse> => {
    try {
        // Verify refresh token
        const decoded = verify(refreshToken, JWT_SECRET!, {
            algorithms: [TOKEN_ALGORITHM]
        }) as ITokenPayload;

        // Check if refresh token is blacklisted
        const isBlacklisted = await redis.exists(`${REDIS_PREFIX}${decoded.jti}`);
        if (isBlacklisted) {
            throw new Error('Refresh token has been revoked');
        }

        // Generate new token pair
        const newAccessToken = await generateToken(decoded.user, deviceId);
        const newRefreshToken = sign(
            {
                ...decoded,
                family: decoded.jti, // Link to previous token
                jti: randomBytes(16).toString('hex')
            },
            JWT_SECRET!,
            {
                expiresIn: REFRESH_TOKEN_EXPIRY,
                algorithm: TOKEN_ALGORITHM
            }
        );

        // Blacklist old refresh token
        await redis.setex(
            `${REDIS_PREFIX}${decoded.jti}`,
            7 * 24 * 3600, // 7 days
            'revoked'
        );

        return {
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                code: 'REFRESH_FAILED',
                message: error.message,
                service: 'api-gateway',
                details: {},
                timestamp: Date.now(),
                correlationId: randomBytes(8).toString('hex')
            }
        };
    }
};

/**
 * Invalidates tokens using Redis blacklist
 * @param token - Token to revoke
 * @param type - Token type ('access' or 'refresh')
 * @returns Promise resolving to API response indicating revocation status
 */
export const revokeToken = async (
    token: string,
    type: 'access' | 'refresh'
): Promise<IAPIResponse> => {
    try {
        const decoded = verify(token, JWT_SECRET!, {
            algorithms: [TOKEN_ALGORITHM]
        }) as ITokenPayload;

        // Add token to blacklist
        const expiryTime = type === 'access' ? 3600 : 7 * 24 * 3600;
        await redis.setex(
            `${REDIS_PREFIX}${decoded.jti}`,
            expiryTime,
            JSON.stringify({
                userId: decoded.user.id,
                type,
                revokedAt: Date.now()
            })
        );

        // Clean up fingerprint
        await redis.del(`fingerprint:${decoded.jti}`);

        return {
            success: true,
            data: {
                message: 'Token revoked successfully',
                tokenId: decoded.jti
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                code: 'REVOCATION_FAILED',
                message: error.message,
                service: 'api-gateway',
                details: {},
                timestamp: Date.now(),
                correlationId: randomBytes(8).toString('hex')
            }
        };
    }
};