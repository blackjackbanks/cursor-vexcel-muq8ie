/**
 * Authentication Constants for Excel Add-in Frontend
 * @version 1.0.0
 * @description Defines authentication-related constants including token configuration,
 * endpoints, error codes, authorization roles, and permissions with TypeScript type safety
 */

/**
 * Authentication API endpoint paths with versioning
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH: '/api/v1/auth/refresh',
  VERIFY: '/api/v1/auth/verify',
  STATUS: '/api/v1/auth/status'
} as const;

/**
 * JWT token configuration with security settings
 * EXPIRY_BUFFER: Time in seconds before token expiry to trigger refresh (5 minutes)
 * REFRESH_THRESHOLD: Maximum time in seconds to allow token refresh (10 minutes)
 */
export const AUTH_TOKEN_CONFIG = {
  STORAGE_KEY: 'excel_addin_auth_token',
  EXPIRY_BUFFER: 300,
  REFRESH_THRESHOLD: 600,
  MAX_REFRESH_ATTEMPTS: 3,
  TOKEN_TYPE: 'Bearer',
  STORAGE_METHOD: 'sessionStorage'
} as const;

/**
 * Authentication error codes with expanded error handling
 * Format: SEC-XXX where XXX is a numeric code
 */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'SEC-001',
  TOKEN_EXPIRED: 'SEC-002',
  REFRESH_FAILED: 'SEC-003',
  UNAUTHORIZED: 'SEC-004',
  SESSION_EXPIRED: 'SEC-005',
  INVALID_TOKEN: 'SEC-006',
  MAX_REFRESH_EXCEEDED: 'SEC-007',
  PERMISSION_DENIED: 'SEC-008'
} as const;

/**
 * User role constants with role hierarchy
 * Defines the organizational structure of user access levels
 */
export const AUTH_ROLES = {
  BASIC_USER: 'BASIC_USER',
  POWER_USER: 'POWER_USER',
  ADMIN: 'ADMIN',
  AUDITOR: 'AUDITOR',
  ROLE_HIERARCHY: {
    ADMIN: ['POWER_USER', 'BASIC_USER'],
    POWER_USER: ['BASIC_USER'],
    AUDITOR: ['BASIC_USER']
  }
} as const;

/**
 * Granular RBAC permission constants with action-based control
 * Format: resource:action for consistent permission naming
 */
export const AUTH_PERMISSIONS = {
  FORMULA_GENERATION: {
    READ: 'formula:read',
    WRITE: 'formula:write',
    EXECUTE: 'formula:execute'
  },
  DATA_CLEANING: {
    READ: 'data:read',
    WRITE: 'data:write',
    EXECUTE: 'data:execute'
  },
  VERSION_HISTORY: {
    READ: 'version:read',
    WRITE: 'version:write',
    DELETE: 'version:delete'
  },
  ADMIN_FUNCTIONS: {
    READ: 'admin:read',
    WRITE: 'admin:write',
    EXECUTE: 'admin:execute',
    MANAGE_USERS: 'admin:users',
    MANAGE_ROLES: 'admin:roles'
  }
} as const;

// Type definitions for better TypeScript support
export type AuthEndpoint = typeof AUTH_ENDPOINTS[keyof typeof AUTH_ENDPOINTS];
export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];
export type UserRole = keyof typeof AUTH_ROLES;
export type Permission = typeof AUTH_PERMISSIONS[keyof typeof AUTH_PERMISSIONS][keyof typeof AUTH_PERMISSIONS[keyof typeof AUTH_PERMISSIONS]];

// Ensure immutability of constants
Object.freeze(AUTH_ENDPOINTS);
Object.freeze(AUTH_TOKEN_CONFIG);
Object.freeze(AUTH_ERROR_CODES);
Object.freeze(AUTH_ROLES);
Object.freeze(AUTH_PERMISSIONS);