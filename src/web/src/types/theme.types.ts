import { DefaultTheme } from 'styled-components'; // ^5.3.0

/**
 * Available theme modes for the Excel Add-in
 * Includes high contrast mode for WCAG 2.1 Level AA compliance
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  HIGH_CONTRAST = 'highContrast'
}

/**
 * Color scheme definition ensuring WCAG 2.1 Level AA compliance
 * Minimum contrast ratios:
 * - Normal text (4.5:1)
 * - Large text (3:1)
 * - UI components (3:1)
 */
export type ColorScheme = {
  // Brand colors
  primary: string;    // Main brand color with sufficient contrast
  secondary: string;  // Secondary brand color with sufficient contrast
  
  // Surface colors
  background: string; // Main background color
  surface: string;    // Surface/card background color
  
  // Text colors
  text: string;       // Primary text color with 4.5:1 minimum contrast
  
  // Semantic colors
  error: string;      // Error state color (red)
  warning: string;    // Warning state color (yellow/orange)
  success: string;    // Success state color (green)
  info: string;       // Information state color (blue)
};

/**
 * Typography system aligned with Office UI Fabric standards
 * Font sizes and weights optimized for readability
 */
export type Typography = {
  fontFamily: string;
  fontSize: {
    xs: string;      // Extra small text
    sm: string;      // Small text
    md: string;      // Medium/body text
    lg: string;      // Large text
    xl: string;      // Extra large text
    xxl: string;     // Display text
  };
  fontWeight: {
    regular: number; // 400
    medium: number;  // 500
    semibold: number; // 600
    bold: number;    // 700
  };
  lineHeight: {
    tight: number;   // 1.2
    normal: number;  // 1.5
    relaxed: number; // 1.75
  };
};

/**
 * Spacing system for consistent component and layout spacing
 * Based on 4px grid system common in Office UI Fabric
 */
export type Spacing = {
  unit: number;      // Base unit (4px)
  scale: {
    xs: number;      // Extra small (4px)
    sm: number;      // Small (8px)
    md: number;      // Medium (16px)
    lg: number;      // Large (24px)
    xl: number;      // Extra large (32px)
    xxl: number;     // Double extra large (48px)
  };
};

/**
 * Complete theme definition extending styled-components DefaultTheme
 * Ensures type safety and consistency across the application
 */
export interface Theme extends DefaultTheme {
  mode: ThemeMode;
  colors: ColorScheme;
  typography: Typography;
  spacing: Spacing;
}