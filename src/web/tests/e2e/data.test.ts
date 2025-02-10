/**
 * @fileoverview End-to-end tests for data cleaning functionality in Excel Add-in
 * @version 1.0.0
 * @package jest@29.0.0
 * @package @testing-library/react@14.0.0
 * @package @testing-library/user-event@14.0.0
 * @package axe-core@4.7.0
 * @package jest-performance@1.0.0
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { performance } from 'jest-performance';
import { createMockExcelService } from '../mocks/excel.mock';
import DataCleaning from '../../src/pages/DataCleaning/DataCleaning';
import { PERFORMANCE_THRESHOLDS } from '../../src/constants/excel.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('DataCleaning Page E2E Tests', () => {
  // Mock data for testing
  const mockRange = {
    address: 'A1:D10',
    values: Array(10).fill(Array(4).fill(null)).map((row, i) => 
      row.map((_, j) => i === 0 ? `Header${j + 1}` : `Value${i}${j + 1}`)
    ),
    formulas: Array(10).fill(Array(4).fill('')),
    numberFormat: Array(10).fill(Array(4).fill('General')),
    rowCount: 10,
    columnCount: 4
  };

  const mockIssues = [
    {
      id: 'missing-2-3',
      type: 'Missing Value',
      severity: 'error',
      message: 'Empty cell detected at R2C3',
      range: 'B2',
      affectedCells: 1
    },
    {
      id: 'format-3-2',
      type: 'Inconsistent Format',
      severity: 'warning',
      message: 'Date format inconsistency at R3C2',
      range: 'C3',
      affectedCells: 1
    }
  ];

  // Setup mocks and test environment
  let mockExcelService;
  let user;

  beforeEach(async () => {
    // Initialize mock Excel service
    mockExcelService = createMockExcelService();
    mockExcelService.getSelectedRange.mockResolvedValue(mockRange);

    // Initialize user event instance
    user = userEvent.setup();

    // Render component with mocks
    render(<DataCleaning excelService={mockExcelService} />);

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should load and display data preview correctly', async () => {
    // Verify data preview rendering
    const preview = screen.getByRole('region', { name: /data preview/i });
    expect(preview).toBeInTheDocument();

    // Check header row
    const headers = within(preview).getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    headers.forEach((header, index) => {
      expect(header).toHaveTextContent(`Header${index + 1}`);
    });

    // Check data cells
    const cells = within(preview).getAllByRole('cell');
    expect(cells.length).toBeGreaterThan(0);
  });

  test('should detect and display data quality issues', async () => {
    // Verify issue panel rendering
    const issuePanel = screen.getByRole('region', { name: /data quality issues/i });
    expect(issuePanel).toBeInTheDocument();

    // Check issue list
    const issues = within(issuePanel).getAllByRole('listitem');
    expect(issues).toHaveLength(mockIssues.length);

    // Verify issue details
    const errorIssue = screen.getByText(/empty cell detected/i);
    expect(errorIssue).toBeInTheDocument();
    const warningIssue = screen.getByText(/date format inconsistency/i);
    expect(warningIssue).toBeInTheDocument();
  });

  test('should handle batch processing of large datasets', async () => {
    // Setup large dataset mock
    const largeRange = {
      ...mockRange,
      values: Array(5000).fill(Array(4).fill(null)),
      rowCount: 5000
    };
    mockExcelService.getSelectedRange.mockResolvedValue(largeRange);

    // Start batch processing
    const applyButton = screen.getByRole('button', { name: /apply actions/i });
    await user.click(applyButton);

    // Verify progress tracking
    const progressBar = await screen.findByRole('progressbar');
    expect(progressBar).toBeInTheDocument();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: PERFORMANCE_THRESHOLDS.SUGGESTION_TIMEOUT_MS });

    // Verify performance
    expect(performance.now()).toBeLessThan(PERFORMANCE_THRESHOLDS.SUGGESTION_TIMEOUT_MS);
  });

  test('should maintain accessibility compliance', async () => {
    // Run axe accessibility tests
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();

    // Test keyboard navigation
    const firstAction = screen.getByRole('checkbox', { name: /fix missing value/i });
    await user.tab();
    expect(firstAction).toHaveFocus();

    // Test ARIA attributes
    const issuePanel = screen.getByRole('region', { name: /data quality issues/i });
    expect(issuePanel).toHaveAttribute('aria-labelledby');

    // Test focus management during processing
    const applyButton = screen.getByRole('button', { name: /apply actions/i });
    await user.click(applyButton);
    expect(applyButton).toHaveAttribute('aria-busy', 'true');
  });

  test('should handle error states gracefully', async () => {
    // Simulate API error
    mockExcelService.getSelectedRange.mockRejectedValueOnce(new Error('API Error'));

    // Trigger action that causes error
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Verify error message
    const errorMessage = await screen.findByRole('alert');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent(/error occurred/i);
  });

  test('should support undo/redo operations', async () => {
    // Apply cleaning action
    const action = screen.getByRole('checkbox', { name: /fix missing value/i });
    await user.click(action);
    const applyButton = screen.getByRole('button', { name: /apply actions/i });
    await user.click(applyButton);

    // Verify undo capability
    const undoButton = screen.getByRole('button', { name: /undo/i });
    expect(undoButton).toBeEnabled();
    await user.click(undoButton);

    // Verify Excel service calls
    expect(mockExcelService.undoLastOperation).toHaveBeenCalled();
  });

  test('should meet performance requirements for data operations', async () => {
    // Start performance measurement
    performance.mark('start-data-cleaning');

    // Trigger data cleaning operation
    const action = screen.getByRole('checkbox', { name: /fix missing value/i });
    await user.click(action);
    const applyButton = screen.getByRole('button', { name: /apply actions/i });
    await user.click(applyButton);

    // End performance measurement
    performance.mark('end-data-cleaning');
    performance.measure('data-cleaning', 'start-data-cleaning', 'end-data-cleaning');

    // Verify performance meets requirements
    const measures = performance.getEntriesByName('data-cleaning');
    expect(measures[0].duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SUGGESTION_TIMEOUT_MS);
  });
});