/**
 * @fileoverview Authentication interfaces and types for Excel Add-in frontend
 * Implements type definitions for OAuth 2.0 + JWT based authentication with RBAC
 * @version 1.0.0
 */

/**
 * Available user roles in the system with corresponding string literals
 * Used for role-based access control (RBAC)
 */
export enum UserRole {
    BASIC_USER = 'basic_user',
    POWER_USER = 'power_user',
    ADMIN = 'admin',
    AUDITOR = 'auditor'
}

/**
 * Interface representing an authenticated user with immutable properties
 * Ensures type safety for user-related operations
 */
export interface IUser {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly role: UserRole;
    readonly lastLogin: Date;
    readonly preferences: { [key: string]: any };
}

/**
 * Interface representing the authentication state in Redux store
 * Maintains immutable state with strict null checking
 */
export interface IAuthState {
    readonly isAuthenticated: boolean;
    readonly user: IUser | null;
    readonly token: string | null;
    readonly loading: boolean;
    readonly error: IAuthError | null;
    readonly lastUpdated: Date;
}

/**
 * Interface representing the authentication API response
 * Contains JWT token and user information
 */
export interface IAuthResponse {
    readonly token: string;
    readonly user: IUser;
    readonly expiresIn: number;
    readonly refreshToken: string;
}

/**
 * Enumeration of possible authentication error codes
 * Maps to specific error scenarios for proper error handling
 */
export enum AuthErrorCode {
    INVALID_CREDENTIALS = 'SEC-001',
    TOKEN_EXPIRED = 'SEC-002',
    INVALID_TOKEN = 'SEC-003',
    UNAUTHORIZED = 'SEC-004',
    SERVER_ERROR = 'SEC-005'
}

/**
 * Interface representing authentication errors
 * Provides detailed error information for debugging and user feedback
 */
export interface IAuthError {
    readonly code: AuthErrorCode;
    readonly message: string;
    readonly timestamp: Date;
    readonly details: Record<string, unknown>;
}