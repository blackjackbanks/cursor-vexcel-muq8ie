import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import { ActionPanel } from './ActionPanel';

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock theme that matches theme.types.ts
const mockTheme = {
  mode: 'light',
  colors: {
    primary: '#0078d4',
    secondary: '#2b88d8',
    background: '#ffffff',
    surface: '#f8f8f8',
    text: '#323130',
    error: '#a4262c',
    warning: '#ffd335',
    success: '#107c10',
    info: '#0078d4'
  },
  typography: {
    fontFamily: '"Segoe UI", sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px',
      xxl: '28px'
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  spacing: {
    unit: 4,
    scale: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48
    }
  }
};

// Mock test data
const mockActions = [
  {
    id: 'remove-duplicates',
    label: 'Remove duplicates',
    description: 'Remove duplicate rows from the dataset'
  },
  {
    id: 'fill-missing',
    label: 'Fill missing values',
    description: 'Fill missing values with appropriate defaults'
  },
  {
    id: 'standardize-format',
    label: 'Standardize formats',
    description: 'Convert data to consistent formats'
  }
];

// Helper function to render component with theme
const renderActionPanel = (customProps = {}) => {
  const defaultProps = {
    actions: mockActions,
    onActionSelect: jest.fn(),
    onApplyActions: jest.fn(),
    ariaLabel: 'Data Cleaning Actions',
    initialSelectedActions: []
  };

  const props = { ...defaultProps, ...customProps };

  return render(
    <ThemeProvider theme={mockTheme}>
      <ActionPanel {...props} />
    </ThemeProvider>
  );
};

describe('ActionPanel Component', () => {
  // Basic Rendering
  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderActionPanel();
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('displays the correct aria-label', () => {
      renderActionPanel();
      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Data Cleaning Actions'
      );
    });

    it('renders all provided actions', () => {
      renderActionPanel();
      mockActions.forEach(action => {
        expect(screen.getByLabelText(action.label)).toBeInTheDocument();
      });
    });
  });

  // Accessibility
  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderActionPanel();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      renderActionPanel();
      const firstCheckbox = screen.getByLabelText(mockActions[0].label);
      
      // Test tab navigation
      firstCheckbox.focus();
      expect(document.activeElement).toBe(firstCheckbox);
      
      // Test checkbox interaction with space
      fireEvent.keyDown(firstCheckbox, { key: ' ' });
      expect(firstCheckbox).toBeChecked();
    });

    it('announces progress updates to screen readers', async () => {
      const onApplyActions = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      renderActionPanel({ onApplyActions });

      // Select an action and start processing
      const checkbox = screen.getByLabelText(mockActions[0].label);
      await userEvent.click(checkbox);
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      // Verify progress announcements
      const progressRegion = await screen.findByRole('status');
      expect(progressRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  // User Interactions
  describe('User Interactions', () => {
    it('handles action selection correctly', async () => {
      const onActionSelect = jest.fn();
      renderActionPanel({ onActionSelect });

      const checkbox = screen.getByLabelText(mockActions[0].label);
      await userEvent.click(checkbox);

      expect(onActionSelect).toHaveBeenCalledWith([mockActions[0].id]);
      expect(checkbox).toBeChecked();
    });

    it('disables actions during processing', async () => {
      const onApplyActions = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      renderActionPanel({ onApplyActions });

      // Select and start processing
      const checkbox = screen.getByLabelText(mockActions[0].label);
      await userEvent.click(checkbox);
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      // Verify disabled state
      expect(checkbox).toBeDisabled();
      expect(applyButton).toBeDisabled();
    });

    it('shows error message when no actions are selected', async () => {
      renderActionPanel();
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveTextContent(/select at least one action/i);
    });
  });

  // Progress Tracking
  describe('Progress Tracking', () => {
    it('displays progress indicator during processing', async () => {
      const onApplyActions = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      renderActionPanel({ onApplyActions });

      // Start processing
      await userEvent.click(screen.getByLabelText(mockActions[0].label));
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));

      // Verify progress indicator
      const progressBar = await screen.findByRole('status');
      expect(progressBar).toBeInTheDocument();
    });

    it('restores focus after processing completes', async () => {
      const onApplyActions = jest.fn(() => Promise.resolve());
      renderActionPanel({ onApplyActions });

      const checkbox = screen.getByLabelText(mockActions[0].label);
      await userEvent.click(checkbox);
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(document.activeElement).toBe(checkbox);
      });
    });
  });

  // Error Handling
  describe('Error Handling', () => {
    it('displays error message when processing fails', async () => {
      const onApplyActions = jest.fn(() => Promise.reject(new Error('Processing failed')));
      renderActionPanel({ onApplyActions });

      await userEvent.click(screen.getByLabelText(mockActions[0].label));
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));

      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveTextContent(/error occurred/i);
    });

    it('allows retry after error', async () => {
      const onApplyActions = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(undefined);

      renderActionPanel({ onApplyActions });

      // First attempt
      await userEvent.click(screen.getByLabelText(mockActions[0].label));
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));

      // Wait for error and retry
      await screen.findByRole('alert');
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));

      expect(onApplyActions).toHaveBeenCalledTimes(2);
    });
  });
});