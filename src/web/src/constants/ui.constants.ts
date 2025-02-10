import { ThemeMode } from '../types/theme.types';
import { IButtonStyles } from '@fluentui/react'; // ^8.0.0

/**
 * Standard component dimensions following Microsoft's Fluent Design System
 * Ensures consistent layout and touch-friendly interactions
 */
export const COMPONENT_DIMENSIONS = {
  BUTTON_MIN_WIDTH: '44px',      // Minimum touch target width
  BUTTON_MIN_HEIGHT: '44px',     // Minimum touch target height
  INPUT_HEIGHT: '32px',          // Standard input field height
  HEADER_HEIGHT: '48px',         // Task pane header height
  NAVIGATION_WIDTH: '48px',      // Side navigation width
  PANEL_MIN_HEIGHT: '150px',     // Minimum panel/section height
  TASK_PANE_WIDTH: '350px',      // Excel task pane default width
  TASK_PANE_COLLAPSED_WIDTH: '50px', // Collapsed task pane width
  TOUCH_TARGET_SIZE: '44px'      // Minimum touch target size per WCAG
} as const;

/**
 * Animation timing constants for smooth transitions
 * Includes reduced motion support for accessibility
 */
export const ANIMATION_TIMINGS = {
  FADE_IN: '200ms',
  FADE_OUT: '150ms',
  SLIDE_IN: '250ms',
  SLIDE_OUT: '200ms',
  EXPAND: '300ms',
  COLLAPSE: '250ms',
  REDUCED_MOTION: '0ms'  // Used when prefers-reduced-motion is enabled
} as const;

/**
 * Z-index hierarchy for proper layering of UI elements
 * Ensures consistent stacking order across components
 */
export const Z_INDEX = {
  MODAL: 1000,      // Highest level for modals/dialogs
  DROPDOWN: 100,    // Dropdown menus and popouts
  TOOLTIP: 500,     // Tooltips and popovers
  HEADER: 50,       // Task pane header
  NAVIGATION: 40    // Side navigation
} as const;

/**
 * Accessibility constants ensuring WCAG 2.1 Level AA compliance
 * Includes focus indicators, contrast ratios, and screen reader support
 */
export const ACCESSIBILITY = {
  // Focus indicators
  FOCUS_OUTLINE_WIDTH: '2px',
  FOCUS_OUTLINE_STYLE: 'solid',
  FOCUS_OUTLINE_OFFSET: '2px',
  FOCUS_OUTLINE_COLOR: '#0078d4', // Microsoft blue
  FOCUS_HIGH_CONTRAST_COLOR: '#ffffff',
  
  // Touch targets
  MIN_TOUCH_TARGET: '44px', // WCAG 2.1 Success Criterion 2.5.5
  
  // Contrast ratios
  MIN_CONTRAST_RATIO: '4.5:1',  // WCAG Level AA for normal text
  ENHANCED_CONTRAST_RATIO: '7:1', // WCAG Level AAA for normal text
  
  // Screen reader support
  SCREEN_READER_ONLY: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    border: '0'
  } as const,
  
  // Motion preferences
  REDUCED_MOTION_QUERY: '@media (prefers-reduced-motion: reduce)',
  ARIA_LIVE_DELAY: '150ms',
  
  // Focus styles
  FOCUS_VISIBLE_OUTLINE: '3px solid #0078d4',
  KEYBOARD_FOCUS_STYLE: {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineOffset: '2px',
    outlineColor: '#0078d4'
  } as const
} as const;

/**
 * Default button styles following Fluent UI guidelines
 * Ensures consistent button appearance and behavior
 */
export const DEFAULT_BUTTON_STYLES: IButtonStyles = {
  root: {
    minWidth: COMPONENT_DIMENSIONS.BUTTON_MIN_WIDTH,
    minHeight: COMPONENT_DIMENSIONS.BUTTON_MIN_HEIGHT,
    padding: '0 16px'
  },
  rootHovered: {
    transition: `all ${ANIMATION_TIMINGS.FADE_IN} ease-in-out`
  },
  rootPressed: {
    transition: `all ${ANIMATION_TIMINGS.FADE_OUT} ease-in-out`
  },
  rootDisabled: {
    opacity: 0.4
  }
} as const;

/**
 * Theme-specific constants for light, dark, and high contrast modes
 */
export const THEME_CONSTANTS = {
  [ThemeMode.LIGHT]: {
    headerBackground: '#ffffff',
    surfaceBackground: '#fafafa'
  },
  [ThemeMode.DARK]: {
    headerBackground: '#292929',
    surfaceBackground: '#1f1f1f'
  },
  [ThemeMode.HIGH_CONTRAST]: {
    headerBackground: '#000000',
    surfaceBackground: '#000000'
  }
} as const;