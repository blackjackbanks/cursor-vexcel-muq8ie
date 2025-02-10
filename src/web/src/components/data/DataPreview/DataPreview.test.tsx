import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { ThemeProvider } from '@fluentui/react';

import DataPreview from './DataPreview';
import { createMockExcelService, mockRangeSelection, mockStateManager, cleanupMocks } from '../../../tests/mocks/excel.mock';
import type { RangeSelection, ExcelError } from '../../../types/excel.types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock react-virtual
jest.mock('react-virtual', () => ({
  useVirtual: jest.fn().mockImplementation(() => ({
    virtualItems: [
      { index: 0, start: 0, size: 35, measureRef: jest.fn() },
      { index: 1, start: 35, size: 35, measureRef: jest.fn() }
    ],
    totalSize: 70,
    scrollToIndex: jest.fn()
  }))
}));

// Test data constants
const MOCK_LARGE_DATASET: RangeSelection = {
  address: 'A1:D1000',
  values: Array(1000).fill(Array(4).fill('test')),
  formulas: Array(1000).fill(Array(4).fill('')),
  numberFormat: Array(1000).fill(Array(4).fill('General')),
  rowCount: 1000,
  columnCount: 4
};

const MOCK_ERROR: ExcelError = {
  code: 'DATA_LOAD_ERROR',
  message: 'Failed to load data preview',
  details: {},
  timestamp: new Date(),
  severity: 'error'
};

const MOCK_SUGGESTIONS = [
  {
    rowIndex: 0,
    columnIndex: 1,
    suggestion: 'Data format inconsistent',
    type: 'warning' as const
  }
];

describe('DataPreview Component', () => {
  // Setup before all tests
  beforeAll(() => {
    // Configure test environment
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  // Setup before each test
  beforeEach(() => {
    mockStateManager.setState('initialized', true);
  });

  // Cleanup after each test
  afterEach(() => {
    cleanupMocks();
  });

  describe('Rendering Tests', () => {
    it('renders loading state correctly', () => {
      const mockExcelService = createMockExcelService();
      const { container } = render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={null}
            isLoading={true}
          />
        </ThemeProvider>
      );

      expect(screen.getByLabelText('Loading data preview')).toBeInTheDocument();
      expect(container.querySelector('.ms-Spinner')).toBeInTheDocument();
    });

    it('renders error state correctly', () => {
      const mockExcelService = createMockExcelService();
      render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={null}
            error={MOCK_ERROR}
          />
        </ThemeProvider>
      );

      expect(screen.getByText(MOCK_ERROR.message)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'Error loading data preview');
    });

    it('renders empty state when no range is selected', () => {
      const mockExcelService = createMockExcelService();
      render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={null}
          />
        </ThemeProvider>
      );

      expect(screen.getByText('No data available in selected range')).toBeInTheDocument();
    });

    it('renders data preview table with correct structure', () => {
      const mockExcelService = createMockExcelService();
      render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={mockRangeSelection}
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Column Value1/i })).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(3); // Header + 2 data rows
    });
  });

  describe('Virtualization Tests', () => {
    it('handles large datasets efficiently', async () => {
      const mockExcelService = createMockExcelService();
      const { container } = render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={MOCK_LARGE_DATASET}
            virtualizerConfig={{
              overscan: 5,
              estimateSize: () => 35
            }}
          />
        </ThemeProvider>
      );

      // Verify only virtualized rows are rendered
      const renderedRows = container.querySelectorAll('tr');
      expect(renderedRows.length).toBeLessThan(MOCK_LARGE_DATASET.rowCount);
    });

    it('maintains scroll position during updates', async () => {
      const mockExcelService = createMockExcelService();
      const { rerender } = render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={MOCK_LARGE_DATASET}
          />
        </ThemeProvider>
      );

      const container = screen.getByRole('region');
      fireEvent.scroll(container, { target: { scrollTop: 500 } });

      rerender(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={MOCK_LARGE_DATASET}
          />
        </ThemeProvider>
      );

      expect(container.scrollTop).toBe(500);
    });
  });

  describe('Accessibility Tests', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const mockExcelService = createMockExcelService();
      const { container } = render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={mockRangeSelection}
          />
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      const mockExcelService = createMockExcelService();
      render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={mockRangeSelection}
          />
        </ThemeProvider>
      );

      const cells = screen.getAllByRole('cell');
      cells[0].focus();
      expect(document.activeElement).toBe(cells[0]);

      fireEvent.keyDown(cells[0], { key: 'Tab' });
      expect(document.activeElement).toBe(cells[1]);
    });

    it('provides correct ARIA attributes', () => {
      const mockExcelService = createMockExcelService();
      render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={mockRangeSelection}
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Excel data preview table');
      expect(screen.getByRole('row', { name: 'Column headers' })).toBeInTheDocument();
    });
  });

  describe('Excel Integration Tests', () => {
    it('handles range selection changes', async () => {
      const mockExcelService = createMockExcelService();
      const { rerender } = render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={mockRangeSelection}
          />
        </ThemeProvider>
      );

      const newRange = {
        ...mockRangeSelection,
        values: [['NewValue1', 'NewValue2'], ['NewValue3', 'NewValue4']]
      };

      rerender(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={newRange}
          />
        </ThemeProvider>
      );

      expect(screen.getByText('NewValue1')).toBeInTheDocument();
    });

    it('displays suggestions correctly', () => {
      const mockExcelService = createMockExcelService();
      render(
        <ThemeProvider>
          <DataPreview
            excelService={mockExcelService}
            selectedRange={mockRangeSelection}
            suggestions={MOCK_SUGGESTIONS}
          />
        </ThemeProvider>
      );

      const cell = screen.getAllByRole('cell')[1]; // Second cell (index 1)
      expect(cell).toHaveAttribute('aria-label', 'Cell at row 1, column 2');
      expect(cell).toHaveAttribute('selected', 'true');
    });
  });
});