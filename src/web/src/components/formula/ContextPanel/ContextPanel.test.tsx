/**
 * @fileoverview Test suite for ContextPanel component
 * Validates rendering, accessibility, performance, and interaction behaviors
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // @version 13.4.0
import userEvent from '@testing-library/user-event'; // @version 14.4.0
import { axe, toHaveNoViolations } from '@axe-core/react'; // @version 4.7.3
import { performance } from 'jest-performance'; // @version 1.0.0
import { ContextPanel } from './ContextPanel';
import { IFormulaContext } from '../../../interfaces/formula.interface';
import { PERFORMANCE_THRESHOLDS } from '../../../constants/excel.constants';
import { ThemeMode } from '../../../types/theme.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme context
const mockTheme = {
    mode: ThemeMode.LIGHT,
    colors: {
        text: '#000000',
        background: '#FFFFFF',
        primary: '#0078D4',
        secondary: '#E1DFDD'
    }
};

/**
 * Creates mock formula context data for testing
 */
const mockFormulaContext = (overrides = {}): IFormulaContext => ({
    selectedRange: {
        address: 'A1:D10',
        values: [['Test']],
        formulas: [['=SUM(A1:A10)']],
        numberFormat: [['General']],
        rowCount: 10,
        columnCount: 4
    },
    workbookContext: {
        sheets: ['Sheet1', 'Sheet2'],
        namedRanges: { 'TestRange': 'Sheet1!A1:D10' },
        customFunctions: ['CUSTOM.FUNCTION']
    },
    environmentContext: {
        locale: 'en-US',
        timeZone: 'UTC',
        platform: 'Windows'
    },
    ...overrides
});

/**
 * Mock formula preferences
 */
const mockPreferences = {
    style: 'modern',
    complexityLevel: 'intermediate',
    locale: 'en-US',
    performanceOptimization: {
        enableParallelProcessing: true,
        useGPUAcceleration: false,
        optimizeMemoryUsage: true,
        enablePrecompilation: true
    },
    cachePreferences: {
        maxAge: 300000,
        revalidate: true,
        staleWhileRevalidate: true,
        prefetch: true
    },
    aiModelVersion: '1.0.0'
};

describe('ContextPanel Component', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('Rendering and Display', () => {
        it('should render all sections correctly', () => {
            render(
                <ContextPanel
                    context={mockFormulaContext()}
                    preferences={mockPreferences}
                />
            );

            // Verify section headers
            expect(screen.getByText('Selected Range')).toBeInTheDocument();
            expect(screen.getByText('Workbook Context')).toBeInTheDocument();
            expect(screen.getByText('Formula Preferences')).toBeInTheDocument();
            expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        });

        it('should display selected range information accurately', () => {
            const context = mockFormulaContext();
            render(
                <ContextPanel
                    context={context}
                    preferences={mockPreferences}
                />
            );

            expect(screen.getByText('A1:D10')).toBeInTheDocument();
            expect(screen.getByText(`Rows: ${context.selectedRange.rowCount}`)).toBeInTheDocument();
            expect(screen.getByText(`Columns: ${context.selectedRange.columnCount}`)).toBeInTheDocument();
        });

        it('should update when context changes', async () => {
            const { rerender } = render(
                <ContextPanel
                    context={mockFormulaContext()}
                    preferences={mockPreferences}
                />
            );

            const updatedContext = mockFormulaContext({
                selectedRange: {
                    ...mockFormulaContext().selectedRange,
                    address: 'B2:E11'
                }
            });

            rerender(
                <ContextPanel
                    context={updatedContext}
                    preferences={mockPreferences}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('B2:E11')).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility Compliance', () => {
        it('should meet WCAG 2.1 Level AA standards', async () => {
            const { container } = render(
                <ContextPanel
                    context={mockFormulaContext()}
                    preferences={mockPreferences}
                />
            );

            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('should have proper ARIA labels and roles', () => {
            render(
                <ContextPanel
                    context={mockFormulaContext()}
                    preferences={mockPreferences}
                />
            );

            expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Formula Context Panel');
            expect(screen.getAllByRole('region')).toHaveLength(4);
        });

        it('should support keyboard navigation', () => {
            render(
                <ContextPanel
                    context={mockFormulaContext()}
                    preferences={mockPreferences}
                />
            );

            const sections = screen.getAllByRole('region');
            sections.forEach(section => {
                expect(section).toHaveAttribute('tabIndex', '0');
            });
        });
    });

    describe('Performance Validation', () => {
        it('should render within performance threshold', async () => {
            performance.mark('renderStart');

            render(
                <ContextPanel
                    context={mockFormulaContext()}
                    preferences={mockPreferences}
                />
            );

            performance.mark('renderEnd');
            performance.measure('renderTime', 'renderStart', 'renderEnd');

            const measurements = performance.getEntriesByName('renderTime');
            expect(measurements[0].duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS);
        });

        it('should handle large data sets efficiently', async () => {
            const largeContext = mockFormulaContext({
                selectedRange: {
                    ...mockFormulaContext().selectedRange,
                    rowCount: 1000,
                    columnCount: 100
                }
            });

            performance.mark('largeDataStart');

            render(
                <ContextPanel
                    context={largeContext}
                    preferences={mockPreferences}
                />
            );

            performance.mark('largeDataEnd');
            performance.measure('largeDataTime', 'largeDataStart', 'largeDataEnd');

            const measurements = performance.getEntriesByName('largeDataTime');
            expect(measurements[0].duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS * 2);
        });
    });

    describe('Error Handling', () => {
        it('should handle undefined context gracefully', () => {
            render(
                <ContextPanel
                    context={undefined as any}
                    preferences={mockPreferences}
                />
            );

            expect(screen.getByText('No context available')).toBeInTheDocument();
        });

        it('should display error state for invalid range', () => {
            const invalidContext = mockFormulaContext({
                selectedRange: {
                    ...mockFormulaContext().selectedRange,
                    address: 'INVALID_RANGE'
                }
            });

            render(
                <ContextPanel
                    context={invalidContext}
                    preferences={mockPreferences}
                />
            );

            expect(screen.getByText('Invalid range selection')).toBeInTheDocument();
        });
    });

    describe('High Contrast Theme Support', () => {
        it('should render correctly in high contrast mode', () => {
            const highContrastTheme = {
                ...mockTheme,
                mode: ThemeMode.HIGH_CONTRAST
            };

            render(
                <ContextPanel
                    context={mockFormulaContext()}
                    preferences={mockPreferences}
                    theme={highContrastTheme}
                />
            );

            const panel = screen.getByRole('complementary');
            expect(panel).toHaveStyle({
                border: '2px solid currentColor'
            });
        });
    });
});