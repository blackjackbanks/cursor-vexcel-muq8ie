import styled from 'styled-components'; // ^5.3.0
import { Spinner } from '@fluentui/react'; // ^8.0.0
import { Theme } from '../../types/theme.types';

// Predefined spinner sizes with accessibility-compliant touch targets
const SPINNER_SIZES = {
  small: {
    width: '16px',
    height: '16px',
    touchTarget: '44px'
  },
  medium: {
    width: '32px',
    height: '32px',
    touchTarget: '44px'
  },
  large: {
    width: '48px',
    height: '48px',
    touchTarget: '48px'
  }
} as const;

// Animation settings with reduced motion support
const ANIMATION_SETTINGS = {
  reducedMotion: 'prefers-reduced-motion: reduce',
  defaultDuration: '1.5s',
  defaultEasing: 'cubic-bezier(0.4, 0, 0.2, 1)'
} as const;

// Helper function to get spinner dimensions with touch target considerations
const getSpinnerSize = (size: 'small' | 'medium' | 'large' = 'medium') => {
  return SPINNER_SIZES[size] || SPINNER_SIZES.medium;
};

// Container component with RTL support and proper stacking context
export const LoadingContainer = styled.div<{ direction?: 'rtl' | 'ltr' }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: ${({ theme }) => theme.spacing.scale.xl}px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  direction: ${({ direction }) => direction || 'ltr'};
  z-index: 1;
  
  /* Ensure container is accessible to screen readers */
  role: 'status';
  aria-live: 'polite';
`;

// Styled Fluent UI Spinner with size variants and animation
export const StyledSpinner = styled(Spinner)<{
  size?: 'small' | 'medium' | 'large';
  reducedMotion?: boolean;
}>`
  ${({ size, theme }) => {
    const dimensions = getSpinnerSize(size);
    return `
      width: ${dimensions.width};
      height: ${dimensions.height};
      min-width: ${dimensions.touchTarget}; /* Ensure minimum touch target size */
      min-height: ${dimensions.touchTarget};
      color: ${theme.colors.primary};

      /* Center the spinner within its touch target area */
      display: flex;
      justify-content: center;
      align-items: center;
    `;
  }}

  /* Respect user's motion preferences */
  @media (${ANIMATION_SETTINGS.reducedMotion}) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  /* Default animation for standard motion preferences */
  animation: rotate ${ANIMATION_SETTINGS.defaultDuration} ${ANIMATION_SETTINGS.defaultEasing} infinite;

  /* Ensure proper ARIA attributes for accessibility */
  &[role="progressbar"] {
    aria-busy: true;
    aria-valuetext: "Loading";
  }
`;

// Loading text component with WCAG compliance
export const LoadingText = styled.p<{ direction?: 'rtl' | 'ltr' }>`
  margin-top: ${({ theme }) => theme.spacing.scale.sm}px;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  text-align: center;
  direction: ${({ direction }) => direction || 'ltr'};

  /* Ensure text meets WCAG contrast requirements */
  @media (forced-colors: active) {
    color: CanvasText;
  }

  /* Maintain readability in high contrast mode */
  @media screen and (-ms-high-contrast: active) {
    color: windowText;
  }
`;

// Keyframes for spinner rotation animation
const rotate = styled.keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;