/**
 * @fileoverview Authentication configuration for Excel Add-in frontend
 * Implements enterprise-grade Microsoft Identity authentication with Azure AD integration
 * @version 1.0.0
 */

import { Configuration, BrowserCacheLocation, LogLevel } from '@azure/msal-browser'; // v2.32.0
import { IUser } from '../interfaces/auth.interface';
import { AUTH_ROLES, AUTH_PERMISSIONS } from '../constants/auth.constants';

/**
 * Microsoft Authentication Library (MSAL) configuration
 * Implements OAuth 2.0 + JWT based authentication with Azure AD
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID!,
    authority: process.env.REACT_APP_AZURE_AUTHORITY!,
    redirectUri: process.env.REACT_APP_REDIRECT_URI!,
    postLogoutRedirectUri: process.env.REACT_APP_POST_LOGOUT_REDIRECT_URI!,
    validateAuthority: true,
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
    storeAuthStateInCookie: true,
    secureCookies: true
  },
  system: {
    allowRedirectInIframe: true,
    loggerOptions: {
      logLevel: LogLevel.Error,
      loggerCallback: (level: LogLevel, message: string) => {
        if (level > LogLevel.Error) {
          return;
        }
        console.error(`MSAL: ${message}`);
      },
      piiLoggingEnabled: false
    }
  }
};

/**
 * Login request configuration with organizational scopes
 */
export const loginRequest = {
  scopes: ['User.Read', 'profile', 'openid', 'offline_access'],
  prompt: 'select_account',
  extraQueryParameters: {
    domain_hint: 'organization'
  }
};

/**
 * Token management configuration with security hardening
 */
export const tokenConfig = {
  storageKey: 'excel_addin_auth_token',
  encryptionKey: process.env.REACT_APP_TOKEN_ENCRYPTION_KEY!,
  expiryBuffer: 300, // 5 minutes before expiry
  refreshThreshold: 600, // 10 minutes maximum refresh window
  maxRetryAttempts: 3,
  retryDelay: 1000, // Base delay in milliseconds
  securityHeaders: {
    'Content-Security-Policy': "default-src 'self'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
};

/**
 * API endpoints configuration with retry logic
 */
export const apiConfig = {
  baseUrl: process.env.REACT_APP_API_BASE_URL!,
  endpoints: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    validate: '/auth/validate',
    permissions: '/auth/permissions'
  },
  timeout: 30000, // 30 seconds
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  }
};

/**
 * Role-based permission mappings with granular access control
 * Implements the authorization matrix from specifications
 */
export const rolePermissions = {
  [AUTH_ROLES.BASIC_USER]: [
    AUTH_PERMISSIONS.FORMULA_GENERATION.READ,
    AUTH_PERMISSIONS.FORMULA_GENERATION.WRITE,
    AUTH_PERMISSIONS.DATA_CLEANING.READ,
    AUTH_PERMISSIONS.DATA_CLEANING.WRITE,
    AUTH_PERMISSIONS.VERSION_HISTORY.READ
  ],
  [AUTH_ROLES.POWER_USER]: [
    AUTH_PERMISSIONS.FORMULA_GENERATION.READ,
    AUTH_PERMISSIONS.FORMULA_GENERATION.WRITE,
    AUTH_PERMISSIONS.FORMULA_GENERATION.EXECUTE,
    AUTH_PERMISSIONS.DATA_CLEANING.READ,
    AUTH_PERMISSIONS.DATA_CLEANING.WRITE,
    AUTH_PERMISSIONS.DATA_CLEANING.EXECUTE,
    AUTH_PERMISSIONS.VERSION_HISTORY.READ,
    AUTH_PERMISSIONS.VERSION_HISTORY.WRITE
  ],
  [AUTH_ROLES.ADMIN]: [
    AUTH_PERMISSIONS.FORMULA_GENERATION.READ,
    AUTH_PERMISSIONS.FORMULA_GENERATION.WRITE,
    AUTH_PERMISSIONS.FORMULA_GENERATION.EXECUTE,
    AUTH_PERMISSIONS.DATA_CLEANING.READ,
    AUTH_PERMISSIONS.DATA_CLEANING.WRITE,
    AUTH_PERMISSIONS.DATA_CLEANING.EXECUTE,
    AUTH_PERMISSIONS.VERSION_HISTORY.READ,
    AUTH_PERMISSIONS.VERSION_HISTORY.WRITE,
    AUTH_PERMISSIONS.VERSION_HISTORY.DELETE,
    AUTH_PERMISSIONS.ADMIN_FUNCTIONS.READ,
    AUTH_PERMISSIONS.ADMIN_FUNCTIONS.WRITE,
    AUTH_PERMISSIONS.ADMIN_FUNCTIONS.EXECUTE,
    AUTH_PERMISSIONS.ADMIN_FUNCTIONS.MANAGE_USERS,
    AUTH_PERMISSIONS.ADMIN_FUNCTIONS.MANAGE_ROLES
  ],
  [AUTH_ROLES.AUDITOR]: [
    AUTH_PERMISSIONS.FORMULA_GENERATION.READ,
    AUTH_PERMISSIONS.DATA_CLEANING.READ,
    AUTH_PERMISSIONS.VERSION_HISTORY.READ,
    AUTH_PERMISSIONS.ADMIN_FUNCTIONS.READ
  ]
};

// Freeze all configurations to prevent runtime modifications
Object.freeze(msalConfig);
Object.freeze(loginRequest);
Object.freeze(tokenConfig);
Object.freeze(apiConfig);
Object.freeze(rolePermissions);