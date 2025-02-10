import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import SuggestionPanel from './SuggestionPanel';
import { 
    mockFormulaSuggestions, 
    createMockFormulaSuggestion, 
    mockPerformanceMetrics,
    simulateNetworkLatency 
} from '../../../tests/mocks/formula.mock';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock performance monitoring
const mockPerformanceNow = jest.spyOn(performance, 'now');
const mockIntersectionObserver = jest.fn();

// Setup test environment
beforeAll(() => {
    window.IntersectionObserver = mockIntersectionObserver;
    mockPerformanceNow.mockImplementation(() => Date.now());
});

// Helper function to render component with common props
const renderSuggestionPanel = (props = {}) => {
    const defaultProps = {
        suggestions: mockFormulaSuggestions,
        isLoading: false,
        error: null,
        ...props
    };
    return render(<SuggestionPanel {...defaultProps} />);
};

describe('SuggestionPanel Component', () => {
    describe('Rendering and Layout', () => {
        it('should render without errors', () => {
            const { container } = renderSuggestionPanel();
            expect(container).toBeInTheDocument();
        });

        it('should display loading spinner when isLoading is true', () => {
            renderSuggestionPanel({ isLoading: true });
            expect(screen.getByRole('status')).toHaveTextContent('Generating formula suggestions');
        });

        it('should display error message when error is present', () => {
            const errorMessage = 'Failed to fetch suggestions';
            renderSuggestionPanel({ error: errorMessage });
            expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
        });

        it('should display empty state message when no suggestions are available', () => {
            renderSuggestionPanel({ suggestions: [] });
            expect(screen.getByRole('status')).toHaveTextContent('No formula suggestions available');
        });
    });

    describe('Accessibility Compliance', () => {
        it('should meet WCAG 2.1 Level AA standards', async () => {
            const { container } = renderSuggestionPanel();
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('should support keyboard navigation', async () => {
            renderSuggestionPanel();
            const firstSuggestion = screen.getAllByRole('listitem')[0];
            
            // Tab to first suggestion
            await userEvent.tab();
            expect(firstSuggestion).toHaveFocus();

            // Tab to Apply button
            await userEvent.tab();
            expect(screen.getAllByRole('button', { name: /apply/i })[0]).toHaveFocus();
        });

        it('should have proper ARIA labels and roles', () => {
            renderSuggestionPanel();
            expect(screen.getByRole('region')).toHaveAttribute(
                'aria-label',
                expect.stringContaining('formula suggestions available')
            );
        });

        it('should announce suggestion updates to screen readers', async () => {
            const { rerender } = renderSuggestionPanel();
            const newSuggestions = [createMockFormulaSuggestion()];
            
            rerender(<SuggestionPanel suggestions={newSuggestions} isLoading={false} error={null} />);
            
            await waitFor(() => {
                expect(screen.getByRole('region')).toHaveAttribute(
                    'aria-label',
                    '1 formula suggestions available'
                );
            });
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should render suggestions within 2-second SLA', async () => {
            const startTime = performance.now();
            renderSuggestionPanel();
            
            await waitFor(() => {
                const renderTime = performance.now() - startTime;
                expect(renderTime).toBeLessThan(2000);
            });
        });

        it('should efficiently handle large suggestion lists', async () => {
            const largeSuggestionList = Array(100)
                .fill(null)
                .map(() => createMockFormulaSuggestion());
            
            const startTime = performance.now();
            renderSuggestionPanel({ suggestions: largeSuggestionList });
            
            await waitFor(() => {
                const renderTime = performance.now() - startTime;
                expect(renderTime).toBeLessThan(2000);
            });
        });

        it('should maintain performance with rapid suggestion updates', async () => {
            const { rerender } = renderSuggestionPanel();
            const updateTimes: number[] = [];

            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                const newSuggestions = [createMockFormulaSuggestion()];
                
                rerender(
                    <SuggestionPanel 
                        suggestions={newSuggestions} 
                        isLoading={false} 
                        error={null} 
                    />
                );
                
                updateTimes.push(performance.now() - startTime);
                await simulateNetworkLatency(50, 100);
            }

            const averageUpdateTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length;
            expect(averageUpdateTime).toBeLessThan(100);
        });
    });

    describe('User Interactions', () => {
        it('should handle suggestion selection', async () => {
            const mockHandleSelect = jest.fn();
            const mockHandleExplain = jest.fn();
            
            const { container } = render(
                <SuggestionPanel 
                    suggestions={mockFormulaSuggestions}
                    isLoading={false}
                    error={null}
                    onSelect={mockHandleSelect}
                    onExplain={mockHandleExplain}
                />
            );

            const firstSuggestion = screen.getAllByRole('listitem')[0];
            const applyButton = within(firstSuggestion).getByRole('button', { name: /apply/i });
            
            await userEvent.click(applyButton);
            expect(mockHandleSelect).toHaveBeenCalledWith(mockFormulaSuggestions[0].formula);
        });

        it('should handle explanation requests', async () => {
            const mockHandleExplain = jest.fn();
            
            render(
                <SuggestionPanel 
                    suggestions={mockFormulaSuggestions}
                    isLoading={false}
                    error={null}
                    onExplain={mockHandleExplain}
                />
            );

            const explainButton = screen.getAllByRole('button', { name: /explain/i })[0];
            await userEvent.click(explainButton);
            
            expect(mockHandleExplain).toHaveBeenCalledWith(mockFormulaSuggestions[0].formula);
        });

        it('should handle retry on error', async () => {
            const mockRetry = jest.fn();
            
            renderSuggestionPanel({ 
                error: 'Failed to fetch suggestions',
                onRetry: mockRetry 
            });

            const retryButton = screen.getByRole('button', { name: /retry/i });
            await userEvent.click(retryButton);
            
            expect(mockRetry).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should display error boundary fallback', () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            render(
                <SuggestionPanel 
                    suggestions={[{ invalid: 'data' }] as any}
                    isLoading={false}
                    error={null}
                />
            );

            expect(screen.getByRole('alert')).toBeInTheDocument();
            consoleError.mockRestore();
        });

        it('should handle network errors gracefully', async () => {
            const mockRetry = jest.fn();
            
            renderSuggestionPanel({
                error: 'Network error occurred',
                onRetry: mockRetry
            });

            expect(screen.getByRole('alert')).toHaveTextContent('Network error occurred');
            expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
        });
    });
});