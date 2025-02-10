import styled, { css } from 'styled-components';
import { Theme } from '../../types/theme.types';

// Global constants for button styling
const buttonTransition = 'all 0.2s ease-in-out';
const buttonBorderRadius = '4px';

// Helper function to generate variant-specific styles
const getButtonVariantStyles = (theme: Theme, variant: 'primary' | 'secondary' | 'text') => {
  switch (variant) {
    case 'primary':
      return css`
        color: ${theme.colors.background};
        background: ${theme.colors.primary};
        border: 1px solid ${theme.colors.primary};

        &:hover:not(:disabled) {
          background: ${theme.colors.primary}E6; // 90% opacity
          border-color: ${theme.colors.primary}E6;
        }

        &:active:not(:disabled) {
          background: ${theme.colors.primary}CC; // 80% opacity
          border-color: ${theme.colors.primary}CC;
        }

        &:disabled {
          background: ${theme.colors.primary}99; // 60% opacity
          border-color: ${theme.colors.primary}99;
        }
      `;

    case 'secondary':
      return css`
        color: ${theme.colors.primary};
        background: transparent;
        border: 1px solid ${theme.colors.primary};

        &:hover:not(:disabled) {
          background: ${theme.colors.primary}1A; // 10% opacity
        }

        &:active:not(:disabled) {
          background: ${theme.colors.primary}33; // 20% opacity
        }

        &:disabled {
          color: ${theme.colors.primary}99;
          border-color: ${theme.colors.primary}99;
        }
      `;

    case 'text':
      return css`
        color: ${theme.colors.primary};
        background: transparent;
        border: 1px solid transparent;

        &:hover:not(:disabled) {
          background: ${theme.colors.primary}1A;
        }

        &:active:not(:disabled) {
          background: ${theme.colors.primary}33;
        }

        &:disabled {
          color: ${theme.colors.primary}99;
        }
      `;
  }
};

// Helper function to generate size-specific styles
const getButtonSizeStyles = (theme: Theme, size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return css`
        height: ${theme.spacing.scale.lg}px;
        padding: 0 ${theme.spacing.scale.sm}px;
        font-size: ${theme.typography.fontSize.xs};
        font-weight: ${theme.typography.fontWeight.medium};
      `;

    case 'medium':
      return css`
        height: ${theme.spacing.scale.xl}px;
        padding: 0 ${theme.spacing.scale.md}px;
        font-size: ${theme.typography.fontSize.sm};
        font-weight: ${theme.typography.fontWeight.medium};
      `;

    case 'large':
      return css`
        height: ${theme.spacing.scale.xxl}px;
        padding: 0 ${theme.spacing.scale.lg}px;
        font-size: ${theme.typography.fontSize.md};
        font-weight: ${theme.typography.fontWeight.medium};
      `;
  }
};

// Main styled button component
export const StyledButton = styled.button<{
  variant: 'primary' | 'secondary' | 'text';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  white-space: nowrap;
  text-decoration: none;
  vertical-align: middle;
  cursor: ${props => (props.disabled || props.loading ? 'not-allowed' : 'pointer')};
  user-select: none;
  border-radius: ${buttonBorderRadius};
  transition: ${buttonTransition};
  font-family: ${props => props.theme.typography.fontFamily};
  line-height: ${props => props.theme.typography.lineHeight.normal};
  outline: none;

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  ${props => getButtonVariantStyles(props.theme, props.variant)}
  ${props => getButtonSizeStyles(props.theme, props.size)}
`;

// Styled component for button icon
export const ButtonIcon = styled.span<{
  position: 'left' | 'right';
  size: 'small' | 'medium' | 'large';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-${props => props.position}: ${props => props.theme.spacing.scale.xs}px;
  
  svg {
    width: ${props => {
      switch (props.size) {
        case 'small': return '14px';
        case 'medium': return '16px';
        case 'large': return '20px';
      }
    }};
    height: ${props => {
      switch (props.size) {
        case 'small': return '14px';
        case 'medium': return '16px';
        case 'large': return '20px';
      }
    }};
  }
`;

// Styled component for button content
export const ButtonContent = styled.span<{
  loading?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.loading ? 0 : 1};
  visibility: ${props => props.loading ? 'hidden' : 'visible'};
`;