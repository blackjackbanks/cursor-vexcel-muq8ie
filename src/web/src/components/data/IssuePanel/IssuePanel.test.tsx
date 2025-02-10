import React from 'react'; // @version 18.2.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // @version 13.0.0
import userEvent from '@testing-library/user-event'; // @version 14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // @version 4.7.0
import { IssuePanel } from './IssuePanel';
import { useExcel } from '../../../hooks/useExcel';
import { PERFORMANCE_THRESHOLDS } from '../../../constants/excel.constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock useExcel hook
jest.mock('../../../hooks/useExcel');

// Mock data for testing
const mockIssues = [
    {
        id: 'issue-1',
        type: 'data-validation',
        severity: 'error',
        message: 'Invalid data format',
        range: 'A1:B10',
        affectedCells: 5,
        suggestedAction: 'Convert to number format'
    },
    {
        id: 'issue-2',
        type: 'missing-data',
        severity: 'warning',
        message: 'Missing values detected',
        range: 'C1:C5',
        affectedCells: 3,
        suggestedAction: 'Fill empty cells'
    },
    {
        id: 'issue-3',
        type: 'data-consistency',
        severity: 'info',
        message: 'Inconsistent date formats',
        range: 'D1:D10',
        affectedCells: 8,
        suggestedAction: 'Standardize date format'
    }
];

const mockOnIssueSelect = jest.fn();
const mockHighlightRange = jest.fn();

describe('IssuePanel Component', () => {
    // Setup before all tests
    beforeAll(() => {
        // Mock Excel context
        (useExcel as jest.Mock).mockReturnValue({
            highlightRange: mockHighlightRange
        });

        // Setup performance monitoring
        window.performance.mark = jest.fn();
        window.performance.measure = jest.fn();
    });

    // Setup before each test
    beforeEach(() => {
        jest.clearAllMocks();
        mockOnIssueSelect.mockClear();
        mockHighlightRange.mockClear();
    });

    // Cleanup after each test
    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('Rendering', () => {
        test('renders loading state correctly', async () => {
            const { container } = render(
                <IssuePanel 
                    issues={[]} 
                    onIssueSelect={mockOnIssueSelect}
                    isLoading={true}
                />
            );

            expect(screen.getByRole('region')).toBeInTheDocument();
            expect(screen.getByText('Data Quality Issues')).toBeInTheDocument();
            expect(container.querySelector('.loading-indicator')).toBeInTheDocument();
        });

        test('renders issue list with correct structure', () => {
            render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            // Verify issue groups
            expect(screen.getByRole('list')).toBeInTheDocument();
            expect(screen.getAllByRole('group')).toHaveLength(3); // error, warning, info groups

            // Verify individual issues
            mockIssues.forEach(issue => {
                const issueElement = screen.getByText(issue.message);
                expect(issueElement).toBeInTheDocument();
                expect(screen.getByText(`${issue.affectedCells} cells in ${issue.range}`)).toBeInTheDocument();
                if (issue.suggestedAction) {
                    expect(screen.getByText(issue.suggestedAction)).toBeInTheDocument();
                }
            });
        });

        test('renders empty state correctly', () => {
            render(
                <IssuePanel 
                    issues={[]}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            expect(screen.getByRole('region')).toBeInTheDocument();
            expect(screen.getByText('Data Quality Issues')).toBeInTheDocument();
            expect(screen.queryByRole('list')).toBeInTheDocument();
            expect(screen.queryByRole('group')).not.toBeInTheDocument();
        });
    });

    describe('Interaction Handling', () => {
        test('handles issue selection correctly', async () => {
            render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            const firstIssue = screen.getByText(mockIssues[0].message).closest('[role="button"]');
            expect(firstIssue).toBeInTheDocument();

            // Click issue
            await userEvent.click(firstIssue!);

            // Verify callbacks
            expect(mockHighlightRange).toHaveBeenCalledWith(mockIssues[0].range);
            expect(mockOnIssueSelect).toHaveBeenCalledWith(mockIssues[0]);

            // Verify ARIA live region update
            const liveRegion = screen.getByRole('status');
            expect(liveRegion).toHaveTextContent(`Selected issue: ${mockIssues[0].message}`);
        });

        test('supports keyboard navigation', async () => {
            render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            const issues = screen.getAllByRole('button');
            const firstIssue = issues[0];

            // Focus first issue
            firstIssue.focus();
            expect(document.activeElement).toBe(firstIssue);

            // Test arrow key navigation
            await userEvent.keyboard('[ArrowDown]');
            expect(document.activeElement).toBe(issues[1]);

            await userEvent.keyboard('[ArrowUp]');
            expect(document.activeElement).toBe(issues[0]);

            // Test selection with Enter
            await userEvent.keyboard('[Enter]');
            expect(mockOnIssueSelect).toHaveBeenCalledWith(mockIssues[0]);
        });
    });

    describe('Accessibility', () => {
        test('meets WCAG 2.1 Level AA requirements', async () => {
            const { container } = render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        test('has correct ARIA attributes', () => {
            render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            // Check main region
            expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Data Quality Issues Panel');

            // Check list structure
            expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'List of data quality issues');

            // Check issue groups
            const groups = screen.getAllByRole('group');
            expect(groups[0]).toHaveAttribute('aria-label', 'error issues');
            expect(groups[1]).toHaveAttribute('aria-label', 'warning issues');
            expect(groups[2]).toHaveAttribute('aria-label', 'info issues');

            // Check live region
            expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
        });
    });

    describe('Performance', () => {
        test('renders within performance threshold', async () => {
            const startTime = performance.now();

            render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS);
        });

        test('handles large datasets efficiently', async () => {
            // Generate large dataset
            const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
                ...mockIssues[0],
                id: `issue-${index}`,
                message: `Issue ${index}`
            }));

            const startTime = performance.now();

            render(
                <IssuePanel 
                    issues={largeDataset}
                    onIssueSelect={mockOnIssueSelect}
                    virtualizeList={true}
                />
            );

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS);
            expect(screen.getByRole('list')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        test('handles Excel interaction errors gracefully', async () => {
            mockHighlightRange.mockRejectedValueOnce(new Error('Excel API error'));

            render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            const firstIssue = screen.getByText(mockIssues[0].message).closest('[role="button"]');
            await userEvent.click(firstIssue!);

            // Verify error handling
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/Error handling issue selection/i)).toBeInTheDocument();
        });

        test('recovers from failed interactions', async () => {
            mockHighlightRange
                .mockRejectedValueOnce(new Error('First attempt failed'))
                .mockResolvedValueOnce(true);

            render(
                <IssuePanel 
                    issues={mockIssues}
                    onIssueSelect={mockOnIssueSelect}
                />
            );

            const firstIssue = screen.getByText(mockIssues[0].message).closest('[role="button"]');
            
            // First attempt fails
            await userEvent.click(firstIssue!);
            expect(screen.getByRole('alert')).toBeInTheDocument();

            // Second attempt succeeds
            await userEvent.click(firstIssue!);
            expect(mockOnIssueSelect).toHaveBeenCalledWith(mockIssues[0]);
        });
    });
});