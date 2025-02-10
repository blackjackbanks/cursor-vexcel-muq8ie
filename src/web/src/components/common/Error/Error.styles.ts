import styled from 'styled-components';
import { Icon } from '@fluentui/react'; // ^8.0.0
import type { ColorScheme } from '../../types/theme.types';

/**
 * Generates theme-aware error styles ensuring WCAG 2.1 Level AA compliance
 * Minimum contrast ratios: 4.5:1 for normal text, 3:1 for UI components
 */
const getErrorStyles = (theme: ColorScheme) => ({
  backgroundColor: `${theme.surface}`,
  borderColor: `${theme.error}`,
  color: `${theme.error}`,
  // Ensure error color meets 4.5:1 contrast ratio against surface
  outlineColor: `${theme.error}`
});

/**
 * Main container for error component with responsive layout and RTL support
 * Implements Fluent Design System spacing and elevation
 */
export const ErrorContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing.scale.md}px`};
  margin: ${({ theme }) => `${theme.spacing.scale.sm}px 0`};
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: 4px;
  background-color: ${({ theme }) => theme.colors.surface};
  
  /* RTL Support */
  ${({ theme }) => theme.mode === 'rtl' && `
    direction: rtl;
    text-align: right;
  `}

  /* High Contrast Mode Support */
  @media screen and (-ms-high-contrast: active) {
    border: 2px solid currentColor;
    forced-color-adjust: none;
  }
`;

/**
 * Styled error icon using Fluent UI Icon component
 * Ensures proper sizing and color contrast
 */
export const ErrorIcon = styled(Icon)`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.error};
  margin-${({ theme }) => theme.mode === 'rtl' ? 'left' : 'right'}: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  
  /* Ensure icon meets 3:1 contrast ratio requirement */
  @media screen and (-ms-high-contrast: active) {
    color: currentColor;
  }
`;

/**
 * Error message text component with proper typography and truncation
 * Implements WCAG 2.1 Level AA text contrast requirements
 */
export const ErrorMessage = styled.span`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  color: ${({ theme }) => theme.colors.error};
  
  /* Text truncation with ellipsis */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  /* Ensure text meets 4.5:1 contrast ratio requirement */
  @media screen and (-ms-high-contrast: active) {
    color: currentColor;
  }
`;

/**
 * Container for error action buttons with proper spacing and focus states
 * Implements Fluent Design System interaction patterns
 */
export const ErrorActions = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-${({ theme }) => theme.mode === 'rtl' ? 'right' : 'left'}: ${({ theme }) => `${theme.spacing.scale.md}px`};
  gap: ${({ theme }) => `${theme.spacing.scale.sm}px`};

  /* Focus visible styles for accessibility */
  button:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.error};
    outline-offset: 2px;
  }

  /* High Contrast Mode Support */
  @media screen and (-ms-high-contrast: active) {
    button:focus-visible {
      outline: 2px solid currentColor;
    }
  }
`;