import { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { ThemeMode, Theme } from '../types/theme.types';
import { IThemeContext } from '../interfaces/theme.interface';
import {
  getSystemThemeMode,
  getThemeByMode,
  saveThemeToStorage,
  getStoredTheme
} from '../utils/theme.utils';
import {
  lightTheme,
  darkTheme,
  highContrastTheme
} from '../config/theme.config';

/**
 * Custom React hook that manages theme state and provides theme-related functionality
 * Implements Microsoft's Fluent Design System with WCAG 2.1 Level AA compliance
 * Supports light, dark, and high contrast modes with system preference detection
 * 
 * @returns {IThemeContext} Theme context object containing current theme and management functions
 */
export const useTheme = (): IThemeContext => {
  // Initialize theme state with stored preference or system default
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme) return storedTheme;

    const systemMode = getSystemThemeMode();
    return getThemeByMode(systemMode);
  });

  /**
   * Validates theme object structure and accessibility requirements
   * @param {Theme} themeToValidate - Theme to validate
   * @returns {boolean} Whether the theme is valid
   */
  const validateTheme = (themeToValidate: Theme): boolean => {
    try {
      const requiredProperties = ['mode', 'colors', 'typography', 'spacing'];
      const hasRequiredProps = requiredProperties.every(prop => 
        Object.prototype.hasOwnProperty.call(themeToValidate, prop)
      );

      if (!hasRequiredProps) {
        console.error('Invalid theme structure: missing required properties');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Theme validation error:', error);
      return false;
    }
  };

  /**
   * Updates the current theme with validation and persistence
   * @param {Theme} newTheme - New theme to apply
   */
  const setTheme = useCallback((newTheme: Theme): void => {
    try {
      if (!validateTheme(newTheme)) {
        throw new Error('Invalid theme configuration');
      }

      setThemeState(newTheme);
      saveThemeToStorage(newTheme);

      // Update system high contrast mode if necessary
      if (newTheme.mode === ThemeMode.HIGH_CONTRAST) {
        document.documentElement.setAttribute('data-high-contrast', 'true');
      } else {
        document.documentElement.removeAttribute('data-high-contrast');
      }
    } catch (error) {
      console.error('Failed to set theme:', error);
      // Fallback to light theme if there's an error
      setThemeState(lightTheme);
    }
  }, []);

  /**
   * Toggles between light, dark, and high contrast themes
   * Follows the sequence: light -> dark -> high contrast -> light
   */
  const toggleTheme = useCallback((): void => {
    setThemeState(currentTheme => {
      let newTheme: Theme;
      
      switch (currentTheme.mode) {
        case ThemeMode.LIGHT:
          newTheme = darkTheme;
          break;
        case ThemeMode.DARK:
          newTheme = highContrastTheme;
          break;
        case ThemeMode.HIGH_CONTRAST:
          newTheme = lightTheme;
          break;
        default:
          newTheme = lightTheme;
      }

      saveThemeToStorage(newTheme);
      return newTheme;
    });
  }, []);

  // Set up system theme change listener
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const highContrastMediaQuery = window.matchMedia('(forced-colors: active)');

    const handleSystemThemeChange = () => {
      const storedTheme = getStoredTheme();
      if (!storedTheme) {
        const systemMode = getSystemThemeMode();
        const newTheme = getThemeByMode(systemMode);
        setTheme(newTheme);
      }
    };

    // Add event listeners for system theme changes
    darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
    highContrastMediaQuery.addEventListener('change', handleSystemThemeChange);

    // Initial system theme check
    handleSystemThemeChange();

    // Cleanup listeners on unmount
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
      highContrastMediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [setTheme]);

  // Return theme context object
  return {
    theme,
    setTheme,
    toggleTheme,
    isHighContrastMode: theme.mode === ThemeMode.HIGH_CONTRAST,
    toggleHighContrast: useCallback(() => {
      setTheme(theme.mode === ThemeMode.HIGH_CONTRAST ? lightTheme : highContrastTheme);
    }, [theme.mode, setTheme])
  };
};