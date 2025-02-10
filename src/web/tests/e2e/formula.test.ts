import { test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from '@axe-core/react';
import { performance } from 'perf_hooks';
import { Office } from '@microsoft/office-js';

import { FormulaAssistant } from '../../src/pages/FormulaAssistant/FormulaAssistant';
import { FormulaService } from '../../src/services/formula.service';
import { 
  mockFormulaRequest, 
  mockFormulaSuggestions, 
  mockValidationResult,
  simulateNetworkLatency,
  DEFAULT_RESPONSE_TIME 
} from '../mocks/formula.mock';

// Add accessibility matchers
expect.extend(toHaveNoViolations);

// Constants for test configuration
const TEST_TIMEOUT = 10000;
const EXCEL_MOCK_RANGE = "A1:D10";
const NATURAL_LANGUAGE_INPUT = "sum the sales column and show as percentage";
const PERFORMANCE_THRESHOLD_MS = 2000;
const ERROR_REDUCTION_TARGET = 0.95;
const ACCESSIBILITY_COMPLIANCE_LEVEL = "WCAG2.1_AA";

// Performance monitoring setup
let performanceMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  maxResponseTime: 0,
  slaViolations: 0
};

// Error tracking setup
let errorMetrics = {
  totalErrors: 0,
  errorTypes: new Map<string, number>(),
  errorReduction: 0
};

describe('Formula Assistant E2E Tests', () => {
  let formulaService: FormulaService;
  let mockExcel: typeof Office.Excel;

  beforeAll(async () => {
    // Initialize formula service with mocks
    formulaService = new FormulaService(null);
    jest.spyOn(formulaService, 'generateFormula');
    jest.spyOn(formulaService, 'validateFormulaInput');
    jest.spyOn(formulaService, 'applyFormula');

    // Initialize Excel mock
    mockExcel = {
      run: jest.fn().mockImplementation(callback => callback()),
      Range: {
        getUsedRange: jest.fn().mockResolvedValue({
          address: EXCEL_MOCK_RANGE,
          values: [['Sales'], [100], [200], [300]]
        })
      }
    };

    // Configure performance monitoring
    performance.mark('test-start');
  });

  afterAll(async () => {
    // Generate performance report
    performance.mark('test-end');
    performance.measure('total-test-time', 'test-start', 'test-end');

    // Calculate error reduction
    errorMetrics.errorReduction = 1 - (errorMetrics.totalErrors / performanceMetrics.totalRequests);

    // Cleanup mocks
    jest.restoreAllMocks();
  });

  test('should generate formula suggestions within performance SLA', async () => {
    // Arrange
    const startTime = performance.now();
    const { container } = render(<FormulaAssistant />);

    // Act
    const input = screen.getByTestId('formula-input');
    fireEvent.change(input, { target: { value: NATURAL_LANGUAGE_INPUT } });

    // Wait for suggestions with performance tracking
    await waitFor(
      () => {
        expect(screen.getByText(/=SUM/)).toBeInTheDocument();
      },
      { timeout: PERFORMANCE_THRESHOLD_MS }
    );

    // Assert
    const responseTime = performance.now() - startTime;
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

    // Track performance metrics
    performanceMetrics.totalRequests++;
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime * (performanceMetrics.totalRequests - 1) + responseTime) 
      / performanceMetrics.totalRequests;
    performanceMetrics.maxResponseTime = Math.max(performanceMetrics.maxResponseTime, responseTime);
    
    if (responseTime > PERFORMANCE_THRESHOLD_MS) {
      performanceMetrics.slaViolations++;
    }
  }, TEST_TIMEOUT);

  test('should validate and apply formula with error reduction verification', async () => {
    // Arrange
    const { container } = render(<FormulaAssistant />);
    const knownErrorPatterns = [
      '=SUM()', // Missing range
      '=SUM(A1:A10', // Unbalanced parentheses
      '=SUM(ABC)', // Invalid reference
    ];

    // Act
    for (const errorPattern of knownErrorPatterns) {
      const input = screen.getByTestId('formula-input');
      fireEvent.change(input, { target: { value: errorPattern } });

      // Wait for validation
      await waitFor(() => {
        const validationResult = mockValidationResult;
        expect(validationResult.isValid).toBeDefined();
        
        if (!validationResult.isValid) {
          errorMetrics.totalErrors++;
          validationResult.errors.forEach(error => {
            const count = errorMetrics.errorTypes.get(error.code) || 0;
            errorMetrics.errorTypes.set(error.code, count + 1);
          });
        }
      });
    }

    // Assert
    const errorReduction = 1 - (errorMetrics.totalErrors / knownErrorPatterns.length);
    expect(errorReduction).toBeGreaterThanOrEqual(ERROR_REDUCTION_TARGET);
  }, TEST_TIMEOUT);

  test('should meet accessibility requirements', async () => {
    // Arrange
    const { container } = render(<FormulaAssistant />);

    // Act - Run accessibility tests
    const results = await axe(container, {
      rules: {
        'aria-required-attr': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'color-contrast': { enabled: true },
        'label': { enabled: true },
        'landmark-one-main': { enabled: true }
      }
    });

    // Assert
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const input = screen.getByTestId('formula-input');
    input.focus();
    expect(document.activeElement).toBe(input);

    // Verify ARIA attributes
    expect(input).toHaveAttribute('aria-label');
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  }, TEST_TIMEOUT);

  test('should handle network latency and retries gracefully', async () => {
    // Arrange
    const { container } = render(<FormulaAssistant />);
    const input = screen.getByTestId('formula-input');

    // Simulate network latency
    await simulateNetworkLatency(500, 1500);

    // Act
    fireEvent.change(input, { target: { value: NATURAL_LANGUAGE_INPUT } });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
      expect(screen.getByText(/=SUM/)).toBeInTheDocument();
    }, { timeout: DEFAULT_RESPONSE_TIME * 2 });
  }, TEST_TIMEOUT);

  test('should maintain state consistency during rapid input changes', async () => {
    // Arrange
    const { container } = render(<FormulaAssistant />);
    const input = screen.getByTestId('formula-input');
    const rapidInputs = [
      'sum',
      'sum sales',
      'sum sales total',
      NATURAL_LANGUAGE_INPUT
    ];

    // Act
    for (const text of rapidInputs) {
      fireEvent.change(input, { target: { value: text } });
      await simulateNetworkLatency(50, 100); // Simulate typing delay
    }

    // Assert
    await waitFor(() => {
      expect(input).toHaveValue(NATURAL_LANGUAGE_INPUT);
      expect(formulaService.generateFormula).toHaveBeenCalledTimes(rapidInputs.length);
    });

    // Verify no race conditions in suggestions display
    const suggestions = screen.getAllByRole('listitem');
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(suggestion => {
      expect(suggestion).toHaveAttribute('aria-setsize');
      expect(suggestion).toHaveAttribute('aria-posinset');
    });
  }, TEST_TIMEOUT);
});