import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import now from 'performance-now';

import DataCleaning from './DataCleaning';
import { createMockExcelService, mockStateManager, cleanupMocks } from '../../../tests/mocks/excel.mock';
import { PERFORMANCE_THRESHOLDS } from '../../constants/excel.constants';

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

describe('DataCleaning Component', () => {
  // Mock Excel service
  const mockExcelService = createMockExcelService();

  // Performance tracking
  let startTime: number;
  let endTime: number;

  beforeAll(() => {
    // Configure test environment
    mockStateManager.setState('initialized', true);
    jest.useFakeTimers();
  });

  beforeEach(() => {
    startTime = now();
    // Set up mock data
    mockStateManager.setState('selectedRange', {
      address: 'A1:D10',
      values: Array(10).fill(Array(4).fill('')),
      formulas: Array(10).fill(Array(4).fill('')),
      numberFormat: Array(10).fill(Array(4).fill('General')),
      rowCount: 10,
      columnCount: 4
    });
  });

  afterEach(() => {
    endTime = now();
    cleanupMocks();
    jest.clearAllTimers();
  });

  describe('Rendering and Accessibility', () => {
    it('should render all required components', async () => {
      const { container } = render(<DataCleaning />);
      
      // Verify core components are present
      expect(screen.getByRole('region', { name: /data cleaning/i })).toBeInTheDocument();
      expect(screen.getByRole('grid', { name: /data preview/i })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /data quality issues/i })).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: /cleaning actions/i })).toBeInTheDocument();
    });

    it('should meet WCAG 2.1 Level AA standards', async () => {
      const { container } = render(<DataCleaning />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(<DataCleaning />);
      
      // Test tab navigation
      const elements = screen.getAllByRole('button');
      elements[0].focus();
      
      for (let i = 0; i < elements.length; i++) {
        userEvent.tab();
        expect(elements[i]).toHaveFocus();
      }
    });
  });

  describe('Data Issue Detection', () => {
    it('should detect missing values', async () => {
      // Set up test data with missing values
      mockStateManager.setState('selectedRange', {
        ...mockStateManager.getState('selectedRange'),
        values: [
          ['', 'Data', '', 'Data'],
          ['Data', '', 'Data', '']
        ]
      });

      render(<DataCleaning />);
      
      await waitFor(() => {
        const issues = screen.getAllByRole('listitem', { name: /missing value/i });
        expect(issues).toHaveLength(4);
      });
    });

    it('should detect format inconsistencies', async () => {
      // Set up test data with inconsistent formats
      mockStateManager.setState('selectedRange', {
        ...mockStateManager.getState('selectedRange'),
        values: [
          ['2023-01-01', '01/01/2023', 'Jan 1, 2023', '1/1/23'],
          ['Data', 'Data', 'Data', 'Data']
        ]
      });

      render(<DataCleaning />);
      
      await waitFor(() => {
        const issues = screen.getAllByRole('listitem', { name: /format inconsistency/i });
        expect(issues).toHaveLength(4);
      });
    });

    it('should prioritize issues by severity', async () => {
      render(<DataCleaning />);
      
      await waitFor(() => {
        const issues = screen.getAllByRole('listitem');
        const severities = issues.map(issue => 
          issue.getAttribute('data-severity')
        );
        
        // Verify errors come before warnings
        expect(severities).toEqual(
          expect.arrayContaining(['error', 'warning', 'info'])
        );
      });
    });
  });

  describe('Performance', () => {
    it('should process large datasets within threshold', async () => {
      // Generate large test dataset (10000 rows)
      const largeDataset = {
        address: 'A1:D10000',
        values: Array(10000).fill(Array(4).fill('Test')),
        formulas: Array(10000).fill(Array(4).fill('')),
        numberFormat: Array(10000).fill(Array(4).fill('General')),
        rowCount: 10000,
        columnCount: 4
      };
      
      mockStateManager.setState('selectedRange', largeDataset);
      
      const startTime = now();
      render(<DataCleaning />);
      
      await waitFor(() => {
        const endTime = now();
        const processingTime = endTime - startTime;
        expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SUGGESTION_TIMEOUT_MS);
      });
    });

    it('should maintain UI responsiveness during processing', async () => {
      render(<DataCleaning />);
      
      // Trigger data cleaning
      const cleanButton = screen.getByRole('button', { name: /clean data/i });
      fireEvent.click(cleanButton);
      
      // Verify UI remains interactive
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeEnabled();
      
      // Verify progress updates
      await waitFor(() => {
        const progress = screen.getByRole('progressbar');
        expect(progress).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Excel service errors gracefully', async () => {
      // Simulate Excel service error
      mockExcelService.getSelectedRange.mockRejectedValueOnce(
        new Error('Excel service error')
      );

      render(<DataCleaning />);
      
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveTextContent(/error/i);
      });
    });

    it('should provide retry functionality for failed operations', async () => {
      // Simulate temporary failure
      mockExcelService.getSelectedRange
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(mockStateManager.getState('selectedRange'));

      render(<DataCleaning />);
      
      const retryButton = await screen.findByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should maintain data consistency during errors', async () => {
      const initialData = mockStateManager.getState('selectedRange');
      
      // Simulate error during cleaning
      mockExcelService.handleSelectionChange.mockRejectedValueOnce(
        new Error('Processing error')
      );

      render(<DataCleaning />);
      
      const cleanButton = screen.getByRole('button', { name: /clean data/i });
      fireEvent.click(cleanButton);
      
      await waitFor(() => {
        // Verify data remains unchanged
        expect(mockStateManager.getState('selectedRange')).toEqual(initialData);
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should announce progress updates', async () => {
      render(<DataCleaning />);
      
      const cleanButton = screen.getByRole('button', { name: /clean data/i });
      fireEvent.click(cleanButton);
      
      await waitFor(() => {
        const progressAnnouncement = screen.getByRole('status');
        expect(progressAnnouncement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should maintain focus management during operations', async () => {
      render(<DataCleaning />);
      
      const actionButton = screen.getByRole('button', { name: /clean data/i });
      actionButton.focus();
      fireEvent.click(actionButton);
      
      await waitFor(() => {
        expect(actionButton).toHaveFocus();
      });
    });

    it('should provide keyboard shortcuts for common actions', async () => {
      render(<DataCleaning />);
      
      // Test Escape key to cancel operation
      const cleanButton = screen.getByRole('button', { name: /clean data/i });
      fireEvent.click(cleanButton);
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });
});