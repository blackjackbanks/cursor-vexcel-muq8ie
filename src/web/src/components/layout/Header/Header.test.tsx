/**
 * @fileoverview Comprehensive test suite for Excel Add-in Header component
 * Verifies rendering, theme switching, accessibility compliance, and security features
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { axe, toHaveNoViolations } from 'jest-axe';
import Header from './Header';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock custom hooks
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      mode: 'light',
      colors: {
        primary: '#217346',
        secondary: '#41A5EE',
        background: '#ffffff',
        surface: '#fafafa',
        text: '#323130'
      },
      typography: {
        fontFamily: 'Segoe UI',
        fontSize: { md: '16px' },
        fontWeight: { semibold: 600 },
        lineHeight: { tight: 1.2 }
      },
      spacing: {
        unit: 8
      }
    },
    toggleTheme: jest.fn(),
    toggleHighContrast: jest.fn(),
    isHighContrastMode: false
  })
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      role: 'basic_user'
    },
    logout: jest.fn(),
    validateSession: jest.fn()
  })
}));

// Mock Office.js API
global.Office = {
  context: {
    ui: {
      closeContainer: jest.fn()
    }
  }
};

describe('Header Component', () => {
  // Setup and cleanup
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Hierarchy and Layout', () => {
    it('should render with correct dimensions and styling', () => {
      const { container } = render(<Header />);
      const header = container.firstChild as HTMLElement;

      // Verify header dimensions
      expect(header).toHaveStyle({
        width: '100%',
        height: '48px' // Per COMPONENT_DIMENSIONS.HEADER_HEIGHT
      });

      // Verify Fluent Design System compliance
      expect(header).toHaveStyle({
        backgroundColor: '#fafafa',
        fontFamily: 'Segoe UI'
      });
    });

    it('should maintain proper layout in collapsed state', () => {
      const { container } = render(<Header />);
      const header = container.firstChild as HTMLElement;

      // Verify minimum width constraints
      expect(header).toHaveStyle({
        minWidth: '50px' // Per COMPONENT_DIMENSIONS.TASK_PANE_COLLAPSED_WIDTH
      });
    });
  });

  describe('Component Library Integration', () => {
    it('should use Office UI Fabric React components correctly', () => {
      render(<Header />);

      // Verify Fluent UI icons are present
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('contrast-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
      expect(screen.getByTestId('close-button')).toBeInTheDocument();
    });

    it('should maintain consistent iconography with Excel', () => {
      render(<Header />);
      
      // Verify icon consistency
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveStyle({
          color: '#323130' // Matches Excel's icon color
        });
      });
    });
  });

  describe('Accessibility Compliance', () => {
    it('should pass WCAG 2.1 Level AA compliance checks', async () => {
      const { container } = render(<Header />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', () => {
      render(<Header />);
      
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();

      // Verify tab navigation
      buttons.forEach(button => {
        expect(button).toHaveFocus();
        fireEvent.keyDown(button, { key: 'Tab' });
      });
    });

    it('should handle high contrast mode correctly', () => {
      const { rerender } = render(<Header />);
      
      // Rerender with high contrast mode
      jest.mocked(useTheme).mockImplementation(() => ({
        ...jest.requireActual('../../../hooks/useTheme').useTheme(),
        isHighContrastMode: true,
        theme: {
          ...jest.requireActual('../../../hooks/useTheme').useTheme().theme,
          mode: 'highContrast'
        }
      }));

      rerender(<Header />);
      
      // Verify high contrast styles
      const header = screen.getByRole('banner');
      expect(header).toHaveStyle({
        backgroundColor: '#000000',
        color: '#ffffff'
      });
    });

    it('should provide proper ARIA labels and roles', () => {
      render(<Header />);

      // Verify ARIA attributes
      expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Excel Add-in header');
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-pressed');
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    it('should handle authentication state correctly', () => {
      render(<Header />);
      
      // Verify authenticated user elements
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });

    it('should handle secure logout process', async () => {
      const { logout } = jest.mocked(useAuth)();
      render(<Header />);

      // Trigger logout
      fireEvent.click(screen.getByTestId('logout-button'));
      
      await waitFor(() => {
        expect(logout).toHaveBeenCalled();
      });
    });

    it('should validate session on visibility change', () => {
      const { validateSession } = jest.mocked(useAuth)();
      render(<Header />);

      // Simulate visibility change
      fireEvent.visibilityChange(document);
      
      expect(validateSession).toHaveBeenCalled();
    });
  });

  describe('Theme Management', () => {
    it('should handle theme switching correctly', () => {
      const { toggleTheme } = jest.mocked(useTheme)();
      render(<Header />);

      // Trigger theme toggle
      fireEvent.click(screen.getByTestId('theme-toggle'));
      
      expect(toggleTheme).toHaveBeenCalled();
    });

    it('should handle high contrast toggle correctly', () => {
      const { toggleHighContrast } = jest.mocked(useTheme)();
      render(<Header />);

      // Trigger high contrast toggle
      fireEvent.click(screen.getByTestId('contrast-toggle'));
      
      expect(toggleHighContrast).toHaveBeenCalled();
    });
  });

  describe('Task Pane Controls', () => {
    it('should handle task pane collapse correctly', () => {
      render(<Header />);

      // Trigger task pane collapse
      fireEvent.click(screen.getByTestId('close-button'));
      
      expect(Office.context.ui.closeContainer).toHaveBeenCalled();
    });
  });
});