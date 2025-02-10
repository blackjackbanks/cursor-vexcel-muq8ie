import { DefaultTheme } from 'styled-components'; // ^5.3.0
import { ThemeMode, ColorScheme, Typography, Spacing, Theme } from '../types/theme.types';

/**
 * Interface defining the theme context functionality
 * Provides theme management and accessibility features
 * Compliant with WCAG 2.1 Level AA requirements
 */
export interface IThemeContext {
  /** Current theme configuration */
  theme: Theme;
  
  /** Updates the current theme */
  setTheme: (theme: Theme) => void;
  
  /** Toggles between light and dark themes */
  toggleTheme: () => void;
  
  /** Toggles high contrast mode for accessibility */
  toggleHighContrast: () => void;
  
  /** Indicates if high contrast mode is active */
  isHighContrastMode: boolean;
}

/**
 * Interface for theme provider component props
 * Enables theme initialization and accessibility features
 */
export interface IThemeProvider {
  /** Child components to be wrapped with theme context */
  children: React.ReactNode;
  
  /** Initial theme configuration */
  initialTheme: Theme;
  
  /** Flag to enable high contrast mode by default */
  enableHighContrast?: boolean;
}

/**
 * Interface for components that need theme awareness
 * Ensures consistent styling and accessibility support
 */
export interface IThemeAware {
  /** Current theme configuration */
  theme: Theme;
  
  /** Indicates if high contrast mode is active */
  isHighContrast: boolean;
}

/**
 * Interface for theme persistence operations
 * Handles theme storage and accessibility preferences
 */
export interface IThemeStorage {
  /**
   * Persists theme configuration
   * @param theme Theme configuration to save
   */
  saveTheme: (theme: Theme) => Promise<void>;
  
  /**
   * Retrieves stored theme configuration
   * @returns Promise resolving to stored theme or null if not found
   */
  getTheme: () => Promise<Theme | null>;
  
  /**
   * Clears stored theme configuration
   */
  clearTheme: () => Promise<void>;
  
  /**
   * Saves high contrast mode preference
   * @param enabled High contrast mode state
   */
  saveHighContrastPreference: (enabled: boolean) => Promise<void>;
  
  /**
   * Retrieves high contrast mode preference
   * @returns Promise resolving to stored preference
   */
  getHighContrastPreference: () => Promise<boolean>;
}