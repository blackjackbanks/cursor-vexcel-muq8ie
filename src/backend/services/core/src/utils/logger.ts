/**
 * @fileoverview Enhanced logging utility for Excel Add-in core service with security monitoring
 * and Azure Application Insights integration
 * @version 1.0.0
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as applicationinsights from 'applicationinsights';
import { logging as loggingConfig, azure } from '../config';
import { ServiceName } from '../../../shared/types';
import { ERROR_CODES } from '../../../shared/constants';

// Global constants for logging configuration
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  security: 0 // Security events have highest priority
};

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'key',
  'secret',
  'credential',
  'clientSecret'
];

/**
 * Enhanced CoreLogger class with security monitoring and performance tracking
 */
class CoreLogger {
  private logger: winston.Logger;
  private appInsights: applicationinsights.TelemetryClient;
  private serviceName: ServiceName = ServiceName.CORE;

  constructor() {
    this.initializeAppInsights();
    this.initializeLogger();
  }

  /**
   * Initializes Azure Application Insights for enhanced monitoring
   */
  private initializeAppInsights(): void {
    applicationinsights
      .setup(azure.applicationInsights.instrumentationKey)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true)
      .setUseDiskRetryCaching(true)
      .start();

    this.appInsights = applicationinsights.defaultClient;
  }

  /**
   * Initializes Winston logger with enhanced configuration
   */
  private initializeLogger(): void {
    const customLevels = {
      levels: LOG_LEVELS,
      colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'blue',
        security: 'magenta'
      }
    };

    winston.addColors(customLevels.colors);

    this.logger = winston.createLogger({
      levels: customLevels.levels,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        this.maskSensitiveData(),
        this.addMetadata()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true
        }),
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true
        })
      ]
    });
  }

  /**
   * Custom format for masking sensitive data in logs
   */
  private maskSensitiveData() {
    return winston.format((info) => {
      const masked = { ...info };
      
      const maskValue = (obj: any) => {
        if (typeof obj !== 'object') return;
        
        Object.keys(obj).forEach(key => {
          if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
            obj[key] = '********';
          } else if (typeof obj[key] === 'object') {
            maskValue(obj[key]);
          }
        });
      };

      maskValue(masked);
      return masked;
    })();
  }

  /**
   * Adds metadata to log entries
   */
  private addMetadata() {
    return winston.format((info) => {
      return {
        ...info,
        service: this.serviceName,
        environment: process.env.NODE_ENV,
        correlationId: this.getCorrelationId(),
        version: process.env.npm_package_version
      };
    })();
  }

  /**
   * Generates or retrieves correlation ID for distributed tracing
   */
  private getCorrelationId(): string {
    return applicationinsights.getCorrelationContext()?.operation?.id || 
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logs error messages with enhanced context
   */
  public error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorDetails = {
      message,
      stack: error?.stack,
      code: error?.name || ERROR_CODES.SYSTEM_ERROR,
      ...metadata
    };

    this.logger.error(errorDetails);
    this.appInsights.trackException({ exception: error || new Error(message) });
  }

  /**
   * Logs security events with enhanced monitoring
   */
  public security(message: string, context: Record<string, any>): void {
    const securityEvent = {
      message,
      type: 'SecurityEvent',
      severity: 'High',
      ...context
    };

    this.logger.log('security', securityEvent);
    this.appInsights.trackEvent({ name: 'SecurityEvent', properties: securityEvent });
  }

  /**
   * Logs warning messages
   */
  public warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn({ message, ...metadata });
  }

  /**
   * Logs informational messages
   */
  public info(message: string, metadata?: Record<string, any>): void {
    this.logger.info({ message, ...metadata });
  }

  /**
   * Logs debug messages
   */
  public debug(message: string, metadata?: Record<string, any>): void {
    this.logger.debug({ message, ...metadata });
  }

  /**
   * Tracks custom metrics
   */
  public trackMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.appInsights.trackMetric({ name, value });
    this.logger.info(`Metric: ${name}`, { metric: value, ...metadata });
  }
}

// Export singleton instance
export const logger = new CoreLogger();