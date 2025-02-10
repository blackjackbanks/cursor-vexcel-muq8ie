import styled from 'styled-components'; // ^5.3.0
import { Stack, IStackStyles } from '@fluentui/react'; // ^8.0.0
import { Theme } from '../../types/theme.types';

// Constants for layout measurements
const TASK_PANE_WIDTH = 350;
const TASK_PANE_PADDING = 16;

/**
 * Main container for the Formula Assistant
 * Implements fixed width and height according to Excel task pane specifications
 */
export const Container = styled.div<{ theme: Theme }>`
  width: ${TASK_PANE_WIDTH}px;
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid ${({ theme }) => theme.colors.text};
  }
`;

/**
 * Header component with fixed positioning and theme-aware styling
 * Ensures WCAG 2.1 Level AA compliance for text contrast
 */
export const Header = styled.header<{ theme: Theme }>`
  height: 48px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.secondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;

  h1 {
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text};
    margin: 0;
  }
`;

/**
 * Scrollable content container with dynamic height calculation
 * Implements smooth scrolling and maintains padding consistency
 */
export const Content = styled.div<{ theme: Theme }>`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  
  /* Smooth scrolling for better UX */
  scroll-behavior: smooth;
  
  /* Scrollbar styling for better visibility */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.secondary};
    border-radius: 3px;
  }

  /* Ensure proper spacing between sections */
  > * + * {
    margin-top: ${({ theme }) => theme.spacing.scale.md}px;
  }
`;

/**
 * Footer component with fixed positioning and theme-aware borders
 * Contains action buttons and status information
 */
export const Footer = styled.footer<{ theme: Theme }>`
  height: 56px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.secondary};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: sticky;
  bottom: 0;
  z-index: 100;
`;

/**
 * Input container for formula text area with proper spacing and focus states
 */
export const InputContainer = styled.div<{ theme: Theme }>`
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 4px;
  padding: ${({ theme }) => theme.spacing.scale.sm}px;
  
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => `${theme.colors.primary}40`};
  }
`;

/**
 * Suggestion item container with hover and focus states
 */
export const SuggestionItem = styled.div<{ theme: Theme }>`
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover, &:focus {
    background-color: ${({ theme }) => `${theme.colors.primary}10`};
  }

  /* Ensure proper spacing between buttons */
  .action-buttons {
    display: flex;
    gap: ${({ theme }) => theme.spacing.scale.sm}px;
    margin-top: ${({ theme }) => theme.spacing.scale.sm}px;
  }
`;

/**
 * Context panel with theme-aware styling and proper spacing
 */
export const ContextPanel = styled.div<{ theme: Theme }>`
  background-color: ${({ theme }) => `${theme.colors.info}10`};
  border-left: 3px solid ${({ theme }) => theme.colors.info};
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  margin-top: ${({ theme }) => theme.spacing.scale.lg}px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

/**
 * Generates Fluent UI Stack styles with theme integration
 * Ensures consistent spacing and accessibility
 */
export const getStackStyles = (theme: Theme): IStackStyles => ({
  root: {
    padding: theme.spacing.scale.md,
    backgroundColor: theme.colors.background,
    selectors: {
      '@media screen and (-ms-high-contrast: active)': {
        border: `1px solid ${theme.colors.text}`
      }
    }
  }
});

/**
 * Pre-configured stack styles for common use cases
 */
export const stackStyles: IStackStyles = {
  root: {
    width: '100%',
    padding: TASK_PANE_PADDING,
    selectors: {
      '> *': {
        width: '100%'
      }
    }
  }
};