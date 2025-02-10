/**
 * @fileoverview Authentication utility functions for Excel Add-in frontend
 * Implements secure token management, validation, and permission checking
 * @version 1.0.0
 * 
 * @requires jwt-decode@^3.1.2
 * @requires crypto-js@^4.1.1
 */

import jwtDecode, { JwtPayload } from 'jwt-decode';
import CryptoJS from 'crypto-js';
import { IUser } from '../interfaces/auth.interface';
import { AUTH_TOKEN_CONFIG, AUTH_ROLES, AUTH_ERROR_CODES } from '../constants/auth.constants';

// Type for decoded JWT with custom fields
interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
  permissions: string[];
}

// Permission check cache to optimize repeated checks
const permissionCache = new Map<string, boolean>();

/**
 * Retrieves and decrypts the JWT token from storage with security validation
 * @returns {string | null} Decrypted JWT token or null if not found/invalid
 */
export const getToken = (): string | null => {
  try {
    const encryptedToken = sessionStorage.getItem(AUTH_TOKEN_CONFIG.STORAGE_KEY);
    if (!encryptedToken) return null;

    // Verify storage integrity
    const fingerprint = sessionStorage.getItem(`${AUTH_TOKEN_CONFIG.STORAGE_KEY}_fingerprint`);
    const calculatedFingerprint = CryptoJS.SHA256(encryptedToken).toString();
    
    if (fingerprint !== calculatedFingerprint) {
      console.error('Storage integrity check failed');
      clearToken();
      return null;
    }

    // Decrypt token
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedToken,
      AUTH_TOKEN_CONFIG.ENCRYPTION_KEY
    );
    const token = decryptedBytes.toString(CryptoJS.enc.Utf8);

    return isTokenValid(token) ? token : null;
  } catch (error) {
    console.error('Error retrieving token:', error);
    clearToken();
    return null;
  }
};

/**
 * Encrypts and stores the JWT token with additional security measures
 * @param {string} token - JWT token to store
 */
export const setToken = (token: string): void => {
  try {
    if (!token || !isTokenValid(token)) {
      throw new Error('Invalid token provided');
    }

    // Encrypt token
    const encryptedToken = CryptoJS.AES.encrypt(
      token,
      AUTH_TOKEN_CONFIG.ENCRYPTION_KEY
    ).toString();

    // Generate and store fingerprint
    const fingerprint = CryptoJS.SHA256(encryptedToken).toString();
    
    sessionStorage.setItem(AUTH_TOKEN_CONFIG.STORAGE_KEY, encryptedToken);
    sessionStorage.setItem(`${AUTH_TOKEN_CONFIG.STORAGE_KEY}_fingerprint`, fingerprint);

    // Set refresh timer
    const decoded = jwtDecode<DecodedToken>(token);
    const expiresIn = (decoded.exp || 0) - Math.floor(Date.now() / 1000);
    
    if (expiresIn > AUTH_TOKEN_CONFIG.EXPIRY_BUFFER) {
      setTimeout(() => {
        dispatchRefreshEvent();
      }, (expiresIn - AUTH_TOKEN_CONFIG.EXPIRY_BUFFER) * 1000);
    }
  } catch (error) {
    console.error('Error setting token:', error);
    clearToken();
  }
};

/**
 * Enhanced token validation with security checks and refresh mechanism
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if token is valid and not expired
 */
export const isTokenValid = (token: string): boolean => {
  try {
    if (!token) return false;

    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Math.floor(Date.now() / 1000);

    // Verify token hasn't expired
    if (!decoded.exp || decoded.exp <= currentTime) {
      throw new Error(AUTH_ERROR_CODES.TOKEN_EXPIRED);
    }

    // Check if token is too old
    if (decoded.iat && (currentTime - decoded.iat) > AUTH_TOKEN_CONFIG.REFRESH_THRESHOLD) {
      throw new Error(AUTH_ERROR_CODES.SESSION_EXPIRED);
    }

    // Verify required claims
    if (!decoded.userId || !decoded.role) {
      throw new Error(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

/**
 * Advanced permission checking with role hierarchy and caching
 * @param {IUser} user - User object containing role and permissions
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has the required permission
 */
export const hasPermission = (user: IUser, permission: string): boolean => {
  try {
    const cacheKey = `${user.id}:${permission}`;
    
    // Check cache first
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey) || false;
    }

    // Check explicit permissions
    const hasExplicitPermission = user.permissions?.includes(permission) || false;

    // Check role hierarchy
    const roleHierarchy = AUTH_ROLES.ROLE_HIERARCHY[user.role] || [];
    const hasRolePermission = roleHierarchy.some(role => {
      const rolePermissions = AUTH_ROLES.ROLE_HIERARCHY[role] || [];
      return rolePermissions.includes(permission);
    });

    const hasAccess = hasExplicitPermission || hasRolePermission;
    
    // Cache the result
    permissionCache.set(cacheKey, hasAccess);
    
    return hasAccess;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
};

/**
 * Clears token and related security data from storage
 */
const clearToken = (): void => {
  sessionStorage.removeItem(AUTH_TOKEN_CONFIG.STORAGE_KEY);
  sessionStorage.removeItem(`${AUTH_TOKEN_CONFIG.STORAGE_KEY}_fingerprint`);
  permissionCache.clear();
};

/**
 * Dispatches custom event for token refresh
 */
const dispatchRefreshEvent = (): void => {
  const event = new CustomEvent('token:refresh', {
    detail: { timestamp: new Date().toISOString() }
  });
  window.dispatchEvent(event);
};