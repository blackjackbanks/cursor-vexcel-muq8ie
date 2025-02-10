import React from 'react'; // v18.2.0
import { render, fireEvent, waitFor, screen } from '@testing-library/react'; // v14.0.0
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7.0

import { FormulaInput } from './FormulaInput';
import { useFormula } from '../../../hooks/useFormula';
import { mockFormulaContext, createMockFormulaSuggestion } from '../../../tests/mocks/formula.mock';
import { FormulaStyle, ComplexityLevel } from '../../../types/formula.types';

// Mock useFormula hook
jest.mock('../../../hooks/useFormula');

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock performance.now() for consistent timing tests
const mockPerformanceNow = jest.fn(() => performance.now());
global.performance.now = mockPerformanceNow;

describe('FormulaInput Component', () => {
    // Mock functions for useFormula hook
    const mockGenerateSuggestions = jest.fn().mockImplementation(() => 
        Promise.resolve(['SUM(A1:A10)', 'AVERAGE(A1:A10)'])
    );
    const mockValidateInput = jest.fn().mockImplementation(() => 
        ({ isValid: true, errors: [] })
    );
    const mockSetFormulaInput = jest.fn();

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Mock useFormula implementation
        (useFormula as jest.Mock).mockImplementation(() => ({
            handleInputChange: mockSetFormulaInput,
            isLoading: false,
            suggestions: [],
            error: null,
            generateSuggestions: mockGenerateSuggestions,
            validateInput: mockValidateInput
        }));

        // Reset performance timer
        mockPerformanceNow.mockClear();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    test('renders formula input correctly', async () => {
        const { container } = render(
            <FormulaInput 
                placeholder="Enter your formula..."
                ariaLabel="Excel formula input"
            />
        );

        // Verify textarea exists
        const textarea = screen.getByRole('textbox');
        expect(textarea).toBeInTheDocument();

        // Verify ARIA attributes
        expect(textarea).toHaveAttribute('aria-label', 'Excel formula input');
        expect(textarea).toHaveAttribute('aria-invalid', 'false');
        expect(textarea).toHaveAttribute('spellcheck', 'false');

        // Verify placeholder
        expect(textarea).toHaveAttribute('placeholder', 'Enter your formula...');

        // Run accessibility tests
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    test('handles user input correctly with debouncing', async () => {
        const user = userEvent.setup();
        render(<FormulaInput />);

        const textarea = screen.getByRole('textbox');
        const formulaText = '=SUM(A1:A10)';

        // Type formula text
        await user.type(textarea, formulaText);

        // Verify input value updated
        expect(textarea).toHaveValue(formulaText);

        // Wait for debounced input handler
        await waitFor(() => {
            expect(mockSetFormulaInput).toHaveBeenCalledWith(formulaText);
        }, { timeout: 1000 });

        // Verify validation triggered
        expect(mockValidateInput).toHaveBeenCalledWith(formulaText);
    });

    test('generates suggestions within SLA (2 seconds)', async () => {
        const startTime = performance.now();
        render(<FormulaInput />);

        const textarea = screen.getByRole('textbox');
        await userEvent.type(textarea, '=SUM(');

        // Wait for suggestions
        await waitFor(() => {
            expect(mockGenerateSuggestions).toHaveBeenCalled();
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Verify response time under 2 seconds
        expect(responseTime).toBeLessThan(2000);

        // Verify suggestions displayed
        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('handles validation errors correctly', async () => {
        // Mock validation error
        mockValidateInput.mockImplementationOnce(() => ({
            isValid: false,
            errors: [{ message: 'Invalid formula syntax' }]
        }));

        render(<FormulaInput />);
        const textarea = screen.getByRole('textbox');

        // Type invalid formula
        await userEvent.type(textarea, '=SUM(A1:A10))');

        // Wait for error state
        await waitFor(() => {
            expect(textarea).toHaveAttribute('aria-invalid', 'true');
            expect(screen.getByRole('alert')).toHaveTextContent('Invalid formula syntax');
        });

        // Verify error message accessibility
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');

        // Test error recovery
        await userEvent.clear(textarea);
        await userEvent.type(textarea, '=SUM(A1:A10)');

        await waitFor(() => {
            expect(textarea).toHaveAttribute('aria-invalid', 'false');
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    test('meets accessibility requirements', async () => {
        const { container } = render(<FormulaInput />);

        // Run axe accessibility tests
        const results = await axe(container);
        expect(results).toHaveNoViolations();

        const textarea = screen.getByRole('textbox');

        // Test keyboard navigation
        await userEvent.tab();
        expect(textarea).toHaveFocus();

        // Test ARIA labels
        expect(textarea).toHaveAttribute('aria-label');
        expect(textarea).toHaveAttribute('aria-invalid');
        expect(textarea).toHaveAttribute('aria-describedby');

        // Test screen reader compatibility
        expect(textarea).toHaveAttribute('role', 'textbox');
        expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
    });

    test('handles loading state correctly', async () => {
        (useFormula as jest.Mock).mockImplementation(() => ({
            handleInputChange: mockSetFormulaInput,
            isLoading: true,
            suggestions: [],
            error: null
        }));

        render(<FormulaInput />);

        // Verify loading state
        expect(screen.getByRole('textbox')).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    });

    test('handles clear button functionality', async () => {
        render(<FormulaInput defaultValue="=SUM(A1:A10)" />);
        
        const clearButton = screen.getByRole('button', { name: /clear/i });
        const textarea = screen.getByRole('textbox');

        // Verify initial state
        expect(textarea).toHaveValue('=SUM(A1:A10)');
        expect(clearButton).toBeEnabled();

        // Clear input
        await userEvent.click(clearButton);

        // Verify cleared state
        expect(textarea).toHaveValue('');
        expect(clearButton).toBeDisabled();
    });

    test('handles keyboard shortcuts correctly', async () => {
        const onSubmit = jest.fn();
        render(<FormulaInput onSubmit={onSubmit} />);

        const textarea = screen.getByRole('textbox');
        await userEvent.type(textarea, '=SUM(A1:A10)');

        // Test Ctrl+Enter submission
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        expect(onSubmit).toHaveBeenCalledWith('=SUM(A1:A10)');

        // Test Cmd+Enter for macOS
        await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
        expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    test('auto-resizes textarea based on content', async () => {
        render(<FormulaInput />);
        const textarea = screen.getByRole('textbox');
        const initialHeight = textarea.clientHeight;

        // Add multiple lines of text
        await userEvent.type(textarea, '=SUMIFS(\n A1:A10,\n B1:B10,\n "Criteria")');

        // Verify height increased
        expect(textarea.clientHeight).toBeGreaterThan(initialHeight);
    });
});