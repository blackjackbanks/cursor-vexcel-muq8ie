import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { axe, toHaveNoViolations } from 'jest-axe';
import Settings from './Settings';
import { useTheme } from '../../hooks/useTheme';
import { ThemeStorage } from '../../utils/theme.utils';
import { ThemeMode } from '../../types/theme.types';
import { ACCESSIBILITY } from '../../constants/ui.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme hook
jest.mock('../../hooks/useTheme');
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// Mock theme storage
jest.mock('../../utils/theme.utils');
const mockThemeStorage = ThemeStorage as jest.Mocked<typeof ThemeStorage>;

describe('Settings Component', () => {
  // Default theme mock values
  const defaultThemeMock = {
    theme: {
      mode: ThemeMode.LIGHT,
      colors: {
        primary: '#217346',
        background: '#ffffff',
        text: '#323130'
      }
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
    toggleHighContrast: jest.fn(),
    isHighContrastMode: false
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(defaultThemeMock);
    localStorage.clear();

    // Mock window.matchMedia
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
        dispatchEvent: jest.fn()
      }))
    });
  });

  describe('Theme Management', () => {
    test('should render theme mode options correctly', () => {
      render(<Settings />);
      
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByText('Theme Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Light Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Dark Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('High Contrast')).toBeInTheDocument();
    });

    test('should handle theme mode changes', async () => {
      render(<Settings />);
      
      const darkModeOption = screen.getByLabelText('Dark Mode');
      fireEvent.click(darkModeOption);

      await waitFor(() => {
        expect(defaultThemeMock.setTheme).toHaveBeenCalledWith(
          expect.objectContaining({ mode: ThemeMode.DARK })
        );
      });
    });

    test('should persist theme preferences', async () => {
      render(<Settings />);
      
      const highContrastOption = screen.getByLabelText('High Contrast');
      fireEvent.click(highContrastOption);

      await waitFor(() => {
        expect(mockThemeStorage.saveTheme).toHaveBeenCalledWith(
          expect.objectContaining({ mode: ThemeMode.HIGH_CONTRAST })
        );
      });
    });

    test('should handle system theme changes', async () => {
      const mediaQueryList = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      window.matchMedia = jest.fn().mockImplementation(() => mediaQueryList);

      render(<Settings />);

      // Simulate system theme change
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.matches = true;
      fireEvent(darkModeQuery, new Event('change'));

      await waitFor(() => {
        expect(defaultThemeMock.setTheme).toHaveBeenCalledWith(
          expect.objectContaining({ mode: ThemeMode.DARK })
        );
      });
    });
  });

  describe('Accessibility Features', () => {
    test('should meet WCAG 2.1 Level AA requirements', async () => {
      const { container } = render(<Settings />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support keyboard navigation', () => {
      render(<Settings />);
      
      const settingsPanel = screen.getByRole('complementary');
      const firstFocusableElement = within(settingsPanel).getByLabelText('Light Mode');
      
      // Test tab navigation
      firstFocusableElement.focus();
      expect(document.activeElement).toBe(firstFocusableElement);
      
      fireEvent.keyDown(firstFocusableElement, { key: 'Tab' });
      expect(document.activeElement).not.toBe(firstFocusableElement);
    });

    test('should handle reduced motion preference', () => {
      // Mock reduced motion media query
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      render(<Settings />);
      
      const reducedMotionToggle = screen.getByLabelText('Reduce Motion');
      expect(reducedMotionToggle).toBeChecked();
      
      fireEvent.click(reducedMotionToggle);
      expect(document.documentElement.style.getPropertyValue('--reduced-motion'))
        .toBe(ACCESSIBILITY.ANIMATION_TIMINGS.REDUCED_MOTION);
    });

    test('should maintain focus management', () => {
      render(<Settings />);
      
      const themeSection = screen.getByText('Theme Settings').closest('section');
      expect(themeSection).toHaveAttribute('tabIndex', '0');
      
      fireEvent.focus(themeSection!);
      expect(themeSection).toHaveStyle({
        outline: `2px solid ${defaultThemeMock.theme.colors.primary}`
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message on theme change failure', async () => {
      defaultThemeMock.setTheme.mockImplementationOnce(() => {
        throw new Error('Theme update failed');
      });

      render(<Settings />);
      
      const darkModeOption = screen.getByLabelText('Dark Mode');
      fireEvent.click(darkModeOption);

      await waitFor(() => {
        expect(screen.getByText('Failed to update theme. Please try again.')).toBeInTheDocument();
      });
    });

    test('should allow error message dismissal', async () => {
      defaultThemeMock.setTheme.mockImplementationOnce(() => {
        throw new Error('Theme update failed');
      });

      render(<Settings />);
      
      const darkModeOption = screen.getByLabelText('Dark Mode');
      fireEvent.click(darkModeOption);

      await waitFor(() => {
        const errorMessage = screen.getByText('Failed to update theme. Please try again.');
        const dismissButton = screen.getByLabelText('Close error message');
        
        fireEvent.click(dismissButton);
        expect(errorMessage).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    test('should handle rapid theme changes efficiently', async () => {
      render(<Settings />);
      
      const darkModeOption = screen.getByLabelText('Dark Mode');
      const lightModeOption = screen.getByLabelText('Light Mode');

      // Simulate rapid theme changes
      for (let i = 0; i < 5; i++) {
        fireEvent.click(darkModeOption);
        fireEvent.click(lightModeOption);
      }

      await waitFor(() => {
        expect(defaultThemeMock.setTheme).toHaveBeenCalledTimes(10);
      });
    });

    test('should show loading state during theme changes', async () => {
      // Mock slow theme change
      defaultThemeMock.setTheme.mockImplementationOnce(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });

      render(<Settings />);
      
      const darkModeOption = screen.getByLabelText('Dark Mode');
      fireEvent.click(darkModeOption);

      expect(screen.getByText('Updating theme...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Updating theme...')).not.toBeInTheDocument();
      });
    });
  });
});