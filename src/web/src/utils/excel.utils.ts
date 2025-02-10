/**
 * @fileoverview Excel utility functions for range manipulation, formula validation,
 * and task pane management with performance optimization and type safety
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { Excel } from '@microsoft/office-js'; // @version 1.1.0
import {
    WorkbookState,
    RangeSelection,
    ExcelError,
    TaskPaneConfig
} from '../types/excel.types';
import {
    TASK_PANE_DIMENSIONS,
    EXCEL_EVENTS,
    EXCEL_ERROR_CODES,
    PERFORMANCE_THRESHOLDS
} from '../constants/excel.constants';

/**
 * Validates if the selected Excel range is within performance thresholds
 * and suitable for AI processing with enhanced validation checks
 * @param range - The range selection to validate
 * @returns Promise resolving to validation result with error details if invalid
 */
export async function validateRange(
    range: RangeSelection
): Promise<{ isValid: boolean; error?: ExcelError }> {
    try {
        // Check for null or undefined range
        if (!range) {
            return {
                isValid: false,
                error: {
                    code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                    message: 'Invalid range selection: Range is null or undefined',
                    details: {},
                    timestamp: new Date(),
                    severity: 'error'
                }
            };
        }

        // Validate range dimensions
        const cellCount = range.rowCount * range.columnCount;
        if (cellCount > PERFORMANCE_THRESHOLDS.MAX_RANGE_SIZE) {
            return {
                isValid: false,
                error: {
                    code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                    message: `Range size exceeds maximum limit of ${PERFORMANCE_THRESHOLDS.MAX_RANGE_SIZE} cells`,
                    details: { cellCount, maxAllowed: PERFORMANCE_THRESHOLDS.MAX_RANGE_SIZE },
                    timestamp: new Date(),
                    severity: 'error'
                }
            };
        }

        // Validate range content and format
        return await Excel.run(async (context) => {
            const excelRange = context.workbook.worksheets.getActiveWorksheet().getRange(range.address);
            excelRange.load(['mergeAreas', 'numberFormat']);
            
            await context.sync();

            // Check for merged cells
            if (excelRange.mergeAreas.count > 1) {
                return {
                    isValid: false,
                    error: {
                        code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                        message: 'Range contains merged cells which are not supported',
                        details: { mergedAreas: excelRange.mergeAreas.count },
                        timestamp: new Date(),
                        severity: 'error'
                    }
                };
            }

            return { isValid: true };
        });
    } catch (error) {
        return {
            isValid: false,
            error: {
                code: EXCEL_ERROR_CODES.RANGE_SELECTION_FAILED,
                message: 'Failed to validate range',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            }
        };
    }
}

/**
 * Formats an Excel range address to a standardized format
 * @param address - The range address to format
 * @returns Formatted range address
 * @throws {Error} If address format is invalid
 */
export function formatRangeAddress(address: string): string {
    if (!address || typeof address !== 'string') {
        throw new Error('Invalid range address provided');
    }

    // Remove whitespace and convert to uppercase
    const formattedAddress = address.replace(/\s/g, '').toUpperCase();

    // Validate address format using regex
    const addressRegex = /^(\$?[A-Z]+\$?\d+)(:(\$?[A-Z]+\$?\d+))?$/;
    if (!addressRegex.test(formattedAddress)) {
        throw new Error('Invalid range address format');
    }

    return formattedAddress;
}

/**
 * Calculates the appropriate task pane width based on screen size and constraints
 * @param screenWidth - The current screen width in pixels
 * @returns Calculated task pane width in pixels
 */
export function calculateTaskPaneWidth(screenWidth: number): number {
    if (!screenWidth || screenWidth <= 0) {
        return TASK_PANE_DIMENSIONS.DEFAULT_WIDTH;
    }

    // Calculate maximum allowed width (30% of screen width)
    const maxAllowedWidth = Math.floor(screenWidth * 0.3);

    // Ensure width is within constraints
    return Math.min(
        Math.max(
            TASK_PANE_DIMENSIONS.MIN_WIDTH,
            Math.min(maxAllowedWidth, TASK_PANE_DIMENSIONS.DEFAULT_WIDTH)
        ),
        TASK_PANE_DIMENSIONS.MAX_WIDTH
    );
}

/**
 * Validates Excel formula syntax, length, and checks for circular references
 * @param formula - The formula to validate
 * @returns Promise resolving to validation result with error details
 */
export async function validateFormula(
    formula: string
): Promise<{ isValid: boolean; error?: ExcelError }> {
    try {
        // Check formula length
        if (!formula || formula.length > PERFORMANCE_THRESHOLDS.MAX_FORMULA_LENGTH) {
            return {
                isValid: false,
                error: {
                    code: EXCEL_ERROR_CODES.FORMULA_VALIDATION_FAILED,
                    message: `Formula exceeds maximum length of ${PERFORMANCE_THRESHOLDS.MAX_FORMULA_LENGTH} characters`,
                    details: { 
                        formulaLength: formula?.length,
                        maxAllowed: PERFORMANCE_THRESHOLDS.MAX_FORMULA_LENGTH 
                    },
                    timestamp: new Date(),
                    severity: 'error'
                }
            };
        }

        return await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getActiveWorksheet();
            const range = sheet.getRange('A1');
            
            // Attempt to set formula to validate syntax
            range.formulas = [[formula]];
            
            try {
                await context.sync();
                
                // Check for circular references
                const dependencies = range.getDependents();
                dependencies.load('address');
                await context.sync();

                if (dependencies.address) {
                    const circularRef = dependencies.address.includes(range.address);
                    if (circularRef) {
                        return {
                            isValid: false,
                            error: {
                                code: EXCEL_ERROR_CODES.FORMULA_VALIDATION_FAILED,
                                message: 'Formula contains circular references',
                                details: { 
                                    formula,
                                    dependencies: dependencies.address 
                                },
                                timestamp: new Date(),
                                severity: 'error'
                            }
                        };
                    }
                }

                return { isValid: true };
            } catch (error) {
                return {
                    isValid: false,
                    error: {
                        code: EXCEL_ERROR_CODES.FORMULA_VALIDATION_FAILED,
                        message: 'Invalid formula syntax',
                        details: { 
                            formula,
                            error: error.message 
                        },
                        timestamp: new Date(),
                        severity: 'error'
                    }
                };
            }
        });
    } catch (error) {
        return {
            isValid: false,
            error: {
                code: EXCEL_ERROR_CODES.FORMULA_VALIDATION_FAILED,
                message: 'Failed to validate formula',
                details: { error: error.message },
                timestamp: new Date(),
                severity: 'error'
            }
        };
    }
}