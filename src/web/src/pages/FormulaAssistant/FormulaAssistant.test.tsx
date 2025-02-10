import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { jest, expect, describe, beforeEach, afterEach } from '@jest/globals';

import { FormulaAssistant } from './FormulaAssistant';
import {
  mockFormulaContext,
  mockFormulaSuggestions,
  mockValidationResult,
  mockPerformanceMetrics,
  simulateNetworkLatency,
  mockFormulaService
} from '../../../tests/mocks/formula.mock';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock hooks and services
jest.mock('../../../hooks/useFormula');
jest.mock('@microsoft/office-js');
jest.mock('../../../services/performance');
jest.mock('../../../services/i18n');

describe('FormulaAssistant Component', () => {
  // Setup performance monitoring
  const mockPerformance = {
    now: jest.fn(),
    mark: jest.fn(),
    measure: jest.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup performance monitoring
    global.performance = mockPerformance as any;
    mockPerformance.now.mockReturnValue(0);

    // Mock useFormula hook
    const mockUseFormula = require('../../../hooks/useFormula').useFormula;
    mockUseFormula.mockReturnValue({
      input: '',
      suggestions: [],
      isLoading: false,
      error: null,
      performance: mockPerformanceMetrics,
      accessibility: {
        ariaLabel: 'Formula input',
        ariaLive: 'polite',
        ariaAtomic: true
      },
      handleInputChange: jest.fn(),
      applyFormula: jest.fn()
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Initial Rendering', () => {
    it('should render FormulaAssistant with all required elements', async () => {
      const { container } = render(<FormulaAssistant />);

      // Check main container
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Formula Assistant');

      // Check formula input
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Formula input');

      // Verify accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle RTL layout and translations', () => {
      render(<FormulaAssistant />, {
        wrapper: ({ children }) => (
          <div dir="rtl" lang="ar">
            {children}
          </div>
        )
      });

      const mainContainer = screen.getByRole('main');
      const computedStyles = window.getComputedStyle(mainContainer);
      expect(computedStyles.direction).toBe('rtl');
    });
  });

  describe('Formula Suggestion Generation', () => {
    it('should generate suggestions within 2-second SLA', async () => {
      const startTime = performance.now();
      const { rerender } = render(<FormulaAssistant />);

      // Simulate user input
      const input = screen.getByRole('textbox');
      await userEvent.type(input, '=SUM(A1:A10)');

      // Wait for suggestions with SLA check
      await waitFor(() => {
        expect(screen.getByRole('list', { name: 'Formula suggestions' })).toBeInTheDocument();
      }, { timeout: 2000 });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should display loading state during suggestion generation', async () => {
      const mockUseFormula = require('../../../hooks/useFormula').useFormula;
      mockUseFormula.mockReturnValue({
        ...mockUseFormula(),
        isLoading: true
      });

      render(<FormulaAssistant />);
      
      expect(screen.getByText('Generating suggestions...')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Formula Application', () => {
    it('should apply selected formula to Excel with proper error handling', async () => {
      const mockApplyFormula = jest.fn();
      const mockUseFormula = require('../../../hooks/useFormula').useFormula;
      mockUseFormula.mockReturnValue({
        ...mockUseFormula(),
        suggestions: mockFormulaSuggestions,
        applyFormula: mockApplyFormula
      });

      render(<FormulaAssistant />);

      // Select and apply formula
      const suggestion = screen.getByText(mockFormulaSuggestions[0].formula);
      await userEvent.click(suggestion);
      
      expect(mockApplyFormula).toHaveBeenCalledWith(mockFormulaSuggestions[0].formula);
    });

    it('should handle formula application errors gracefully', async () => {
      const mockApplyFormula = jest.fn().mockRejectedValue(new Error('Application failed'));
      const mockUseFormula = require('../../../hooks/useFormula').useFormula;
      mockUseFormula.mockReturnValue({
        ...mockUseFormula(),
        suggestions: mockFormulaSuggestions,
        applyFormula: mockApplyFormula,
        error: 'Application failed'
      });

      render(<FormulaAssistant />);

      expect(screen.getByRole('alert')).toHaveTextContent('Application failed');
    });
  });

  describe('Accessibility Compliance', () => {
    it('should be keyboard navigable', async () => {
      render(<FormulaAssistant />);
      
      const input = screen.getByRole('textbox');
      input.focus();
      expect(document.activeElement).toBe(input);

      // Tab navigation
      userEvent.tab();
      expect(document.activeElement).toHaveAttribute('role', 'button');
    });

    it('should announce suggestion updates', async () => {
      const mockUseFormula = require('../../../hooks/useFormula').useFormula;
      mockUseFormula.mockReturnValue({
        ...mockUseFormula(),
        suggestions: mockFormulaSuggestions
      });

      render(<FormulaAssistant />);

      const suggestionsList = screen.getByRole('list', { name: 'Formula suggestions' });
      expect(suggestionsList).toHaveAttribute('aria-live', 'polite');
    });

    it('should pass comprehensive accessibility audit', async () => {
      const { container } = render(<FormulaAssistant />);

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'aria-allowed-attr': { enabled: true },
          'aria-required-children': { enabled: true },
          'aria-required-parent': { enabled: true }
        }
      });

      expect(results).toHaveNoViolations();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track and report performance metrics', async () => {
      const { rerender } = render(<FormulaAssistant />);

      // Simulate formula generation
      const input = screen.getByRole('textbox');
      await userEvent.type(input, '=SUM(A1:A10)');

      await waitFor(() => {
        const metrics = mockPerformanceMetrics;
        expect(metrics.totalRequestTime).toBeLessThan(2000);
        expect(metrics.processingTime).toBeLessThan(500);
      });
    });

    it('should optimize rendering performance', async () => {
      const renderStart = performance.now();
      const { rerender } = render(<FormulaAssistant />);
      const renderEnd = performance.now();

      expect(renderEnd - renderStart).toBeLessThan(16); // 60fps threshold
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors with proper ARIA attributes', async () => {
      const mockUseFormula = require('../../../hooks/useFormula').useFormula;
      mockUseFormula.mockReturnValue({
        ...mockUseFormula(),
        error: 'Invalid formula syntax'
      });

      render(<FormulaAssistant />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Invalid formula syntax');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    it('should recover gracefully from errors', async () => {
      const mockUseFormula = require('../../../hooks/useFormula').useFormula;
      const mockHandleInputChange = jest.fn();
      
      mockUseFormula.mockReturnValue({
        ...mockUseFormula(),
        error: 'Initial error',
        handleInputChange: mockHandleInputChange
      });

      render(<FormulaAssistant />);

      // Clear error state
      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, '=SUM(A1:A10)');

      expect(mockHandleInputChange).toHaveBeenCalled();
    });
  });
});