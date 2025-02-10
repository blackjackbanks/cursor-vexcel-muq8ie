/**
 * @fileoverview Core service configuration module with enhanced security, monitoring, and performance features
 * @version 1.0.0
 * @package dotenv ^16.0.0
 * @package opossum ^6.0.0
 * @package winston ^3.8.0
 */

import { config as dotenvConfig } from 'dotenv';
import { CircuitBreaker } from 'opossum';
import * as winston from 'winston';
import { API_CONSTANTS } from '../../../shared/constants';
import { CORE_SERVICE_CONFIG } from '../constants';
import { ServiceName } from '../../../shared/types';

// Initialize environment variables
dotenvConfig();

// Global configuration constants
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const CONFIG_SCHEMA_VERSION = '1.0';

/**
 * Comprehensive configuration interface for the core service
 */
interface IServiceConfig {
    server: {
        port: number;
        host: string;
        cors: {
            origins: string[];
            methods: string[];
            headers: string[];
        };
        rateLimit: {
            windowMs: number;
            max: number;
            standardHeaders: boolean;
            legacyHeaders: boolean;
        };
    };
    auth: {
        jwtSecret: string;
        tokenExpiry: string;
        azureAD: {
            tenantId: string;
            clientId: string;
            clientSecret: string;
            authority: string;
            scopes: string[];
        };
        rbac: {
            roles: string[];
            permissions: Record<string, string[]>;
        };
    };
    services: {
        ai: {
            url: string;
            timeout: number;
            retries: number;
            circuitBreaker: CircuitBreakerConfig;
        };
        data: {
            url: string;
            timeout: number;
            retries: number;
            circuitBreaker: CircuitBreakerConfig;
        };
    };
    logging: {
        level: string;
        format: string;
        transports: winston.transport[];
        maskFields: string[];
    };
    monitoring: {
        enabled: boolean;
        metricsPort: number;
        interval: number;
        healthCheck: {
            path: string;
            interval: number;
        };
        performance: {
            slaThreshold: number;
            errorThreshold: number;
        };
    };
}

interface CircuitBreakerConfig {
    timeout: number;
    resetTimeout: number;
    errorThreshold: number;
}

/**
 * Loads and validates environment-specific configuration with enhanced security and monitoring settings
 * @returns {IServiceConfig} Validated configuration object
 */
export function loadConfig(): IServiceConfig {
    const config: IServiceConfig = {
        server: {
            port: CORE_SERVICE_CONFIG.PORT,
            host: CORE_SERVICE_CONFIG.HOST,
            cors: {
                origins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://*.microsoft.com'],
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                headers: ['Authorization', 'Content-Type', 'X-Request-ID']
            },
            rateLimit: {
                windowMs: 60 * 1000, // 1 minute
                max: 100, // limit each IP to 100 requests per windowMs
                standardHeaders: true,
                legacyHeaders: false
            }
        },
        auth: {
            jwtSecret: process.env.JWT_SECRET || '',
            tokenExpiry: process.env.TOKEN_EXPIRY || '1h',
            azureAD: {
                tenantId: process.env.AZURE_AD_TENANT_ID || '',
                clientId: process.env.AZURE_AD_CLIENT_ID || '',
                clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
                authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
                scopes: ['user.read', 'excel.write']
            },
            rbac: {
                roles: ['basic', 'power', 'admin', 'auditor'],
                permissions: {
                    basic: ['formula.read', 'data.read'],
                    power: ['formula.write', 'data.write', 'version.read'],
                    admin: ['formula.*', 'data.*', 'version.*', 'admin.*'],
                    auditor: ['*.read', 'audit.*']
                }
            }
        },
        services: {
            ai: {
                url: process.env.AI_SERVICE_URL || 'http://ai-service:3001',
                timeout: 2000,
                retries: 3,
                circuitBreaker: {
                    timeout: 3000,
                    resetTimeout: 30000,
                    errorThreshold: 5
                }
            },
            data: {
                url: process.env.DATA_SERVICE_URL || 'http://data-service:3002',
                timeout: 2000,
                retries: 3,
                circuitBreaker: {
                    timeout: 3000,
                    resetTimeout: 30000,
                    errorThreshold: 5
                }
            }
        },
        logging: {
            level: IS_PRODUCTION ? 'info' : 'debug',
            format: 'json',
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'error.log', level: 'error' }),
                new winston.transports.File({ filename: 'combined.log' })
            ],
            maskFields: ['password', 'token', 'secret', 'clientSecret']
        },
        monitoring: {
            enabled: true,
            metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
            interval: 15000, // 15 seconds
            healthCheck: {
                path: '/health',
                interval: 30000 // 30 seconds
            },
            performance: {
                slaThreshold: 2000, // 2 seconds
                errorThreshold: 0.05 // 5% error rate threshold
            }
        }
    };

    validateConfig(config);
    return config;
}

/**
 * Performs comprehensive validation of the configuration including security and performance settings
 * @param {IServiceConfig} config - Configuration object to validate
 * @throws {Error} If configuration validation fails
 */
function validateConfig(config: IServiceConfig): void {
    // Validate required environment variables
    const requiredEnvVars = [
        'JWT_SECRET',
        'AZURE_AD_TENANT_ID',
        'AZURE_AD_CLIENT_ID',
        'AZURE_AD_CLIENT_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Validate security configuration
    if (config.auth.jwtSecret.length < 32) {
        throw new Error('JWT secret must be at least 32 characters long');
    }

    // Validate service endpoints
    if (!config.services.ai.url || !config.services.data.url) {
        throw new Error('Service URLs must be configured');
    }

    // Validate performance thresholds
    if (config.monitoring.performance.slaThreshold > 2000) {
        throw new Error('SLA threshold exceeds maximum allowed value of 2000ms');
    }
}

// Export the configuration object and loader function
export const config = loadConfig();