import { ThemeMode, Theme, ColorScheme } from '../types/theme.types';
import { lightTheme, darkTheme, highContrastTheme } from '../config/theme.config';
import chroma from 'chroma-js'; // ^2.4.0

// Constants for theme storage and system preferences
const THEME_STORAGE_KEY = 'excel_addin_theme';
const SYSTEM_DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

// WCAG 2.1 Level AA contrast requirements
const MIN_CONTRAST_RATIO_AA = 4.5;
const MIN_CONTRAST_RATIO_AA_LARGE = 3.0;

/**
 * Interface for contrast calculation results
 */
interface ContrastResult {
  ratio: number;
  passes: boolean;
  error?: string;
}

/**
 * Detects the system's preferred theme mode using media queries
 * @returns {ThemeMode} The detected system theme mode
 */
export const getSystemThemeMode = (): ThemeMode => {
  // Check for high contrast mode first
  if (window.matchMedia('(-ms-high-contrast: active)').matches ||
      window.matchMedia('(forced-colors: active)').matches) {
    return ThemeMode.HIGH_CONTRAST;
  }

  // Check for dark mode preference
  if (window.matchMedia(SYSTEM_DARK_MODE_MEDIA_QUERY).matches) {
    return ThemeMode.DARK;
  }

  return ThemeMode.LIGHT;
};

/**
 * Retrieves the appropriate theme configuration based on the specified mode
 * @param {ThemeMode} mode - The desired theme mode
 * @returns {Theme} The corresponding theme configuration
 */
export const getThemeByMode = (mode: ThemeMode): Theme => {
  switch (mode) {
    case ThemeMode.DARK:
      return darkTheme;
    case ThemeMode.HIGH_CONTRAST:
      return highContrastTheme;
    case ThemeMode.LIGHT:
    default:
      return lightTheme;
  }
};

/**
 * Persists the current theme configuration in localStorage
 * @param {Theme} theme - The theme configuration to store
 */
export const saveThemeToStorage = (theme: Theme): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch (error) {
    console.error('Failed to save theme to storage:', error);
  }
};

/**
 * Retrieves the persisted theme configuration from localStorage
 * @returns {Theme | null} The stored theme configuration or null if not found
 */
export const getStoredTheme = (): Theme | null => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (!storedTheme) return null;

    const parsedTheme = JSON.parse(storedTheme) as Theme;
    
    // Validate theme structure
    if (!parsedTheme.mode || !parsedTheme.colors || !parsedTheme.typography || !parsedTheme.spacing) {
      console.warn('Invalid theme structure in storage');
      return null;
    }

    return parsedTheme;
  } catch (error) {
    console.error('Failed to retrieve theme from storage:', error);
    return null;
  }
};

/**
 * Calculates and validates the WCAG 2.1 contrast ratio between two colors
 * @param {string} color1 - First color in any valid CSS color format
 * @param {string} color2 - Second color in any valid CSS color format
 * @param {boolean} isLargeText - Whether the text is considered large (>= 18pt or bold >= 14pt)
 * @returns {ContrastResult} Contrast calculation result with validation status
 */
export const calculateContrastRatio = (
  color1: string,
  color2: string,
  isLargeText: boolean = false
): ContrastResult => {
  try {
    // Validate and parse colors
    const c1 = chroma(color1);
    const c2 = chroma(color2);

    // Handle colors with alpha channel
    const bg = chroma('#ffffff'); // Default white background
    const c1Final = c1.alpha() < 1 ? chroma.mix(bg, c1, c1.alpha(), 'rgb') : c1;
    const c2Final = c2.alpha() < 1 ? chroma.mix(bg, c2, c2.alpha(), 'rgb') : c2;

    // Calculate relative luminance
    const l1 = c1Final.luminance();
    const l2 = c2Final.luminance();

    // Calculate contrast ratio
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    // Determine minimum required contrast ratio
    const minRequiredRatio = isLargeText ? MIN_CONTRAST_RATIO_AA_LARGE : MIN_CONTRAST_RATIO_AA;

    return {
      ratio: Number(ratio.toFixed(2)),
      passes: ratio >= minRequiredRatio
    };
  } catch (error) {
    return {
      ratio: 0,
      passes: false,
      error: error instanceof Error ? error.message : 'Invalid color value'
    };
  }
};