/**
 * @fileoverview Core initialization and configuration file for the Excel Add-in
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 * @package react-dom@18.2.0
 */

import * as Office from '@microsoft/office-js'; // @version 1.1.0
import * as ReactDOM from 'react-dom'; // @version 18.2.0
import { excelConfig } from './config/excel.config';
import { ExcelService } from './services/excel.service';
import { TaskPaneConfig } from './types/excel.types';
import {
    TASK_PANE_DIMENSIONS,
    EXCEL_ERROR_CODES,
    PERFORMANCE_THRESHOLDS
} from './constants/excel.constants';

/**
 * Performance monitoring decorator for tracking initialization metrics
 */
function performanceMonitor(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
        const startTime = performance.now();
        try {
            const result = await originalMethod.apply(this, args);
            const duration = performance.now() - startTime;
            console.info(`${propertyKey} completed in ${duration}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`${propertyKey} failed after ${duration}ms`, error);
            throw error;
        }
    };
    return descriptor;
}

/**
 * Error boundary decorator for comprehensive error handling
 */
function errorBoundary(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
        try {
            return await originalMethod.apply(this, args);
        } catch (error) {
            await handleError({
                code: EXCEL_ERROR_CODES.INITIALIZATION_FAILED,
                message: `Error in ${propertyKey}`,
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            });
            throw error;
        }
    };
    return descriptor;
}

/**
 * Initializes the Excel Add-in with comprehensive error handling
 * and performance monitoring
 */
@performanceMonitor
@errorBoundary
async function initializeOfficeAddin(): Promise<void> {
    try {
        // Start performance monitoring
        const initStart = performance.now();

        // Initialize Office.js
        await new Promise<void>((resolve, reject) => {
            Office.onReady((info) => {
                if (info.host === Office.HostType.Excel) {
                    resolve();
                } else {
                    reject(new Error('Invalid host application'));
                }
            });
        });

        // Initialize Excel service
        const excelService = new ExcelService();
        await excelService.initialize();

        // Configure task pane
        await configureTaskPane(excelConfig.taskPane);

        // Initialize React application in strict mode
        const container = document.getElementById('root');
        if (!container) {
            throw new Error('Root container not found');
        }

        ReactDOM.render(
            <React.StrictMode>
                <App excelService={excelService} />
            </React.StrictMode>,
            container
        );

        // Record initialization performance
        const initDuration = performance.now() - initStart;
        console.info(`Add-in initialization completed in ${initDuration}ms`);

    } catch (error) {
        await handleError({
            code: EXCEL_ERROR_CODES.INITIALIZATION_FAILED,
            message: 'Failed to initialize Office Add-in',
            details: { error: error.message },
            timestamp: new Date(),
            severity: 'error'
        });
        throw error;
    }
}

/**
 * Configures the task pane with strict dimension validation
 * and performance optimization
 */
@performanceMonitor
@errorBoundary
async function configureTaskPane(config: TaskPaneConfig): Promise<void> {
    try {
        // Validate task pane dimensions
        if (
            config.width < TASK_PANE_DIMENSIONS.MIN_WIDTH ||
            config.width > TASK_PANE_DIMENSIONS.MAX_WIDTH
        ) {
            throw new Error('Invalid task pane dimensions');
        }

        // Configure task pane
        Office.context.ui.taskPanes.getItem('MainTaskPane').then((taskPane) => {
            taskPane.width = config.width;
            taskPane.visibility = config.visibility;

            // Apply Office Fluent Design System styles
            document.body.classList.add('ms-Fabric');
            document.body.classList.add('is-focusVisible');

            // Set up responsive behavior
            window.addEventListener('resize', () => {
                const newWidth = Math.max(
                    TASK_PANE_DIMENSIONS.MIN_WIDTH,
                    Math.min(window.innerWidth * 0.3, TASK_PANE_DIMENSIONS.MAX_WIDTH)
                );
                taskPane.width = newWidth;
            });
        });

    } catch (error) {
        await handleError({
            code: EXCEL_ERROR_CODES.INITIALIZATION_FAILED,
            message: 'Failed to configure task pane',
            details: { error: error.message },
            timestamp: new Date(),
            severity: 'error'
        });
        throw error;
    }
}

/**
 * Handles errors with detailed reporting and user feedback
 */
async function handleError(error: ExcelError): Promise<void> {
    // Log error details
    console.error('Excel Add-in Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
        severity: error.severity
    });

    // Show user-friendly error message
    Office.context.ui.displayDialogAsync(
        'errorDialog.html',
        { height: 30, width: 20 },
        (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
                console.error('Failed to display error dialog', result.error);
            }
        }
    );

    // Report error to monitoring system
    if (error.severity === 'error') {
        // Implement error reporting logic
    }
}

// Initialize the Add-in when Office.js is ready
Office.initialize = async (reason: Office.InitializationReason) => {
    try {
        await initializeOfficeAddin();
    } catch (error) {
        console.error('Critical initialization error:', error);
        // Implement fallback behavior or graceful degradation
    }
};

export default initializeOfficeAddin;