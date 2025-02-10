import styled, { css } from 'styled-components'; // ^5.3.0
import { Theme } from '../../types/theme.types';

// Interface for input state props to handle different visual states
interface InputStateProps {
  error?: boolean;
  disabled?: boolean;
  focused?: boolean;
  highContrast?: boolean;
  theme: Theme;
}

// Base input styles with accessibility focus indicators
const focusStyles = css`
  outline: 2px solid ${({ theme }) => theme.colors.primary};
  outline-offset: 2px;
  box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
  z-index: 1; // Ensure focus ring is visible
`;

// Disabled state styles with WCAG compliant opacity
const disabledStyles = css`
  background: ${({ theme }) => theme.colors.surface};
  cursor: not-allowed;
  opacity: 0.6;
  user-select: none;
`;

// Error state styles with appropriate contrast
const errorStyles = css`
  border-color: ${({ theme }) => theme.colors.error};
  &:focus-within {
    outline-color: ${({ theme }) => theme.colors.error};
  }
`;

// Container component for input with proper spacing
export const InputContainer = styled.div<InputStateProps>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.scale.xs}px;
  width: 100%;
  position: relative;
  margin: ${({ theme }) => theme.spacing.scale.sm}px 0;
`;

// Label component with proper typography and accessibility
export const InputLabel = styled.label<InputStateProps>`
  color: ${({ theme, error, disabled }) =>
    error ? theme.colors.error :
    disabled ? theme.colors.text + '99' : // 60% opacity for disabled
    theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin-bottom: ${({ theme }) => theme.spacing.scale.xs}px;
  
  // High contrast mode adjustments
  ${({ highContrast, theme }) => highContrast && css`
    color: ${theme.colors.text};
    text-decoration: ${({ disabled }) => disabled ? 'line-through' : 'none'};
  `}
`;

// Main input component with comprehensive styling
export const StyledInput = styled.input<InputStateProps>`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 4px;
  padding: ${({ theme }) => theme.spacing.scale.sm}px;
  width: 100%;
  transition: all 0.2s ease-in-out;

  // Handle different states with proper transitions
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: none;
    ${focusStyles}
  }

  // Apply state-specific styles
  ${({ disabled }) => disabled && disabledStyles}
  ${({ error }) => error && errorStyles}
  ${({ focused }) => focused && focusStyles}

  // High contrast mode adjustments
  ${({ highContrast, theme }) => highContrast && css`
    border-width: 2px;
    border-style: solid;
    background: ${theme.colors.background};
    color: ${theme.colors.text};
    
    &:focus {
      outline-width: 3px;
      outline-style: solid;
      outline-offset: 3px;
    }
  `}

  // Screen reader only focus indicator
  &:focus:not(:focus-visible) {
    outline: none;
    box-shadow: none;
  }
`;

// Error message component with proper styling and accessibility
export const ErrorText = styled.span<InputStateProps>`
  color: ${({ theme }) => theme.colors.error};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin-top: ${({ theme }) => theme.spacing.scale.xs}px;
  display: block;
  
  // High contrast mode adjustments
  ${({ highContrast, theme }) => highContrast && css`
    color: ${theme.colors.error};
    border-left: 4px solid ${theme.colors.error};
    padding-left: ${theme.spacing.scale.sm}px;
  `}
`;