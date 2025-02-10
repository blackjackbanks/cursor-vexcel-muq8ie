import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createTheme } from '@fluentui/theme';
import Error from './Error';

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock functions for event handlers
const mockDismiss = jest.fn();
const mockRetry = jest.fn();

// Create theme for testing
const theme = createTheme();

// Helper to render components with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Error Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render basic error message correctly', () => {
      renderWithTheme(<Error message="Test error message" />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render with custom icon', () => {
      renderWithTheme(<Error message="Test error" iconName="Warning" />);
      
      const icon = screen.getByTitle('Test error');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('data-icon-name', 'Warning');
    });

    it('should render details when provided', () => {
      renderWithTheme(
        <Error 
          message="Test error" 
          details="Detailed error information"
        />
      );
      
      expect(screen.getByText('Detailed error information')).toBeInTheDocument();
    });

    it('should render action buttons when provided', () => {
      renderWithTheme(
        <Error 
          message="Test error"
          actions={
            <button onClick={mockRetry}>Retry</button>
          }
        />
      );
      
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('should render dismiss button when onDismiss provided', () => {
      renderWithTheme(
        <Error 
          message="Test error"
          onDismiss={mockDismiss}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Dismiss error' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithTheme(
        <Error 
          message="Test error"
          details="Error details"
          actions={<button>Retry</button>}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support custom ARIA label', () => {
      renderWithTheme(
        <Error 
          message="Test error"
          ariaLabel="Custom error message"
        />
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'Custom error message');
    });

    it('should support custom role', () => {
      renderWithTheme(
        <Error 
          message="Test error"
          role="status"
        />
      );
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      renderWithTheme(
        <Error 
          message="Test error"
          onDismiss={mockDismiss}
          actions={<button onClick={mockRetry}>Retry</button>}
        />
      );

      const dismissButton = screen.getByRole('button', { name: 'Dismiss error' });
      const retryButton = screen.getByRole('button', { name: 'Retry' });

      // Test tab navigation
      await userEvent.tab();
      expect(retryButton).toHaveFocus();
      
      await userEvent.tab();
      expect(dismissButton).toHaveFocus();
    });
  });

  describe('User Interactions', () => {
    it('should call onDismiss when dismiss button clicked', async () => {
      renderWithTheme(
        <Error 
          message="Test error"
          onDismiss={mockDismiss}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when Escape key pressed', () => {
      renderWithTheme(
        <Error 
          message="Test error"
          onDismiss={mockDismiss}
        />
      );

      fireEvent.keyDown(screen.getByRole('alert'), { key: 'Escape' });
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should handle Enter key on dismiss button', () => {
      renderWithTheme(
        <Error 
          message="Test error"
          onDismiss={mockDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: 'Dismiss error' });
      fireEvent.keyDown(dismissButton, { key: 'Enter' });
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should handle Space key on dismiss button', () => {
      renderWithTheme(
        <Error 
          message="Test error"
          onDismiss={mockDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: 'Dismiss error' });
      fireEvent.keyDown(dismissButton, { key: ' ' });
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme Integration', () => {
    it('should apply theme-based styling', () => {
      const { container } = renderWithTheme(
        <Error message="Test error" />
      );
      
      const errorContainer = container.firstChild;
      expect(errorContainer).toHaveStyle({
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.error
      });
    });

    it('should support RTL mode', () => {
      const rtlTheme = {
        ...theme,
        mode: 'rtl'
      };

      const { container } = render(
        <ThemeProvider theme={rtlTheme}>
          <Error message="Test error" />
        </ThemeProvider>
      );

      const errorContainer = container.firstChild;
      expect(errorContainer).toHaveStyle({
        direction: 'rtl',
        textAlign: 'right'
      });
    });

    it('should handle high contrast mode', () => {
      const highContrastTheme = {
        ...theme,
        mode: 'highContrast'
      };

      const { container } = render(
        <ThemeProvider theme={highContrastTheme}>
          <Error message="Test error" />
        </ThemeProvider>
      );

      // Verify high contrast styles are applied
      const errorContainer = container.firstChild;
      const computedStyles = window.getComputedStyle(errorContainer as Element);
      expect(computedStyles.getPropertyValue('forced-color-adjust')).toBe('none');
    });
  });
});