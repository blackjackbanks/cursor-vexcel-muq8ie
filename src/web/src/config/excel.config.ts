/**
 * @fileoverview Excel Add-in configuration management with enhanced security and validation
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 * @package crypto-js@4.1.1
 */

import * as Office from '@microsoft/office-js'; // @version 1.1.0
import * as CryptoJS from 'crypto-js'; // @version 4.1.1
import { TaskPaneConfig } from '../types/excel.types';
import {
    TASK_PANE_DIMENSIONS,
    EXCEL_EVENTS,
    EXCEL_ERROR_CODES,
    PERFORMANCE_THRESHOLDS,
    TASK_PANE_POSITIONS
} from '../constants/excel.constants';

/**
 * Default configuration for the Excel Add-in
 * Following Microsoft Office Fluent Design System specifications
 */
const DEFAULT_CONFIG = {
    version: '1.0.0',
    taskPane: {
        width: TASK_PANE_DIMENSIONS.DEFAULT_WIDTH,
        minWidth: TASK_PANE_DIMENSIONS.MIN_WIDTH,
        maxWidth: TASK_PANE_DIMENSIONS.MAX_WIDTH,
        position: TASK_PANE_POSITIONS.RIGHT,
        isCollapsed: false,
        visibility: 'visible' as const,
        theme: {
            colorScheme: 'fluent',
            highContrast: false
        }
    },
    performance: {
        syncInterval: PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS,
        suggestionTimeout: PERFORMANCE_THRESHOLDS.SUGGESTION_TIMEOUT_MS,
        maxFormulaLength: PERFORMANCE_THRESHOLDS.MAX_FORMULA_LENGTH,
        maxRangeSize: PERFORMANCE_THRESHOLDS.MAX_RANGE_SIZE,
        cacheTimeout: PERFORMANCE_THRESHOLDS.CACHE_DURATION_MS,
        maxRetryAttempts: PERFORMANCE_THRESHOLDS.MAX_RETRY_ATTEMPTS,
        retryDelay: PERFORMANCE_THRESHOLDS.RETRY_DELAY_MS,
        batchSize: PERFORMANCE_THRESHOLDS.BATCH_SIZE,
        maxConcurrentRequests: PERFORMANCE_THRESHOLDS.MAX_CONCURRENT_REQUESTS
    },
    security: {
        encryptionKey: process.env.CONFIG_ENCRYPTION_KEY,
        configAccessRoles: ['admin', 'powerUser'],
        minPasswordLength: 12,
        sessionTimeout: 3600000, // 1 hour
        maxLoginAttempts: 5
    }
} as const;

/**
 * Environment-specific configuration overrides
 */
const environmentConfigs: Record<string, Partial<typeof DEFAULT_CONFIG>> = {
    development: {
        performance: {
            syncInterval: 5000, // Longer sync interval for development
            maxRetryAttempts: 5
        }
    },
    production: {
        security: {
            sessionTimeout: 1800000, // 30 minutes for production
            maxLoginAttempts: 3
        }
    }
};

/**
 * Validates Excel configuration values against allowed ranges and constraints
 * @throws {Error} If configuration validation fails
 */
const validateConfig = (config: typeof DEFAULT_CONFIG): boolean => {
    // Version validation
    if (!config.version.match(/^\d+\.\d+\.\d+$/)) {
        throw new Error(EXCEL_ERROR_CODES.INITIALIZATION_FAILED);
    }

    // Task pane validation
    if (
        config.taskPane.width < config.taskPane.minWidth ||
        config.taskPane.width > config.taskPane.maxWidth
    ) {
        throw new Error('Invalid task pane dimensions');
    }

    // Performance validation
    if (
        config.performance.syncInterval < 1000 ||
        config.performance.maxFormulaLength > 32768
    ) {
        throw new Error('Invalid performance configuration');
    }

    // Security validation
    if (!config.security.encryptionKey || config.security.minPasswordLength < 8) {
        throw new Error('Invalid security configuration');
    }

    return true;
};

/**
 * Encrypts sensitive configuration values
 */
const encryptSensitiveValues = (value: string): string => {
    if (!process.env.CONFIG_ENCRYPTION_KEY) {
        throw new Error('Encryption key not found');
    }
    return CryptoJS.AES.encrypt(value, process.env.CONFIG_ENCRYPTION_KEY).toString();
};

/**
 * Decrypts sensitive configuration values
 */
const decryptSensitiveValues = (encrypted: string): string => {
    if (!process.env.CONFIG_ENCRYPTION_KEY) {
        throw new Error('Encryption key not found');
    }
    const bytes = CryptoJS.AES.decrypt(encrypted, process.env.CONFIG_ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Retrieves Excel Add-in configuration based on environment and user settings
 */
export const getExcelConfig = (
    environment: string,
    userSettings?: Partial<typeof DEFAULT_CONFIG>
): typeof DEFAULT_CONFIG => {
    // Get environment-specific overrides
    const envConfig = environmentConfigs[environment] || {};

    // Merge configurations
    const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...envConfig,
        ...userSettings
    };

    // Validate merged configuration
    validateConfig(mergedConfig);

    return mergedConfig;
};

/**
 * Updates configuration values with validation and access control
 */
export const updateConfig = (
    updates: Partial<typeof DEFAULT_CONFIG>,
    userContext: { roles: string[] }
): typeof DEFAULT_CONFIG => {
    // Verify user permissions
    if (!userContext.roles.some(role => DEFAULT_CONFIG.security.configAccessRoles.includes(role))) {
        throw new Error('Unauthorized configuration update attempt');
    }

    // Create updated configuration
    const updatedConfig = {
        ...DEFAULT_CONFIG,
        ...updates
    };

    // Validate updates
    validateConfig(updatedConfig);

    // Encrypt sensitive values if present
    if (updates.security?.encryptionKey) {
        updatedConfig.security.encryptionKey = encryptSensitiveValues(updates.security.encryptionKey);
    }

    return updatedConfig;
};

/**
 * Export default configuration and utility functions
 */
export const excelConfig = {
    ...DEFAULT_CONFIG,
    getConfig: getExcelConfig,
    updateConfig,
    validateConfig
};

// Freeze the exported configuration to prevent runtime modifications
Object.freeze(excelConfig);