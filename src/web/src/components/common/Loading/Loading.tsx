import React from 'react'; // ^18.2.0
import { LoadingContainer, StyledSpinner, LoadingText } from './Loading.styles';

/**
 * Props interface for the Loading component following Fluent Design System guidelines
 * @interface LoadingProps
 */
interface LoadingProps {
  /** Size variant for the spinner - follows Fluent UI sizing standards */
  size?: 'small' | 'medium' | 'large';
  /** Optional loading message with i18n support */
  text?: string;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Optional CSS class name for custom styling */
  className?: string;
}

/**
 * A reusable loading component that displays a spinner and optional loading text
 * following Microsoft's Fluent Design System guidelines and WCAG 2.1 Level AA compliance.
 *
 * @component
 * @example
 * <Loading size="medium" text="Processing data..." ariaLabel="Loading spreadsheet data" />
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  text,
  ariaLabel = 'Loading',
  className
}) => {
  // Detect user's motion preferences for animation handling
  const prefersReducedMotion = React.useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Detect reading direction for RTL support
  const direction = React.useMemo(
    () => document.documentElement.dir || 'ltr',
    []
  );

  return (
    <LoadingContainer
      className={className}
      direction={direction as 'ltr' | 'rtl'}
      role="status"
      aria-live="polite"
    >
      <StyledSpinner
        size={size}
        reducedMotion={prefersReducedMotion}
        label={ariaLabel}
        role="progressbar"
        aria-valuetext={text || ariaLabel}
        aria-busy="true"
      />
      {text && (
        <LoadingText
          direction={direction as 'ltr' | 'rtl'}
          aria-hidden="true" // Hide from screen readers as the spinner already announces the text
        >
          {text}
        </LoadingText>
      )}
    </LoadingContainer>
  );
};

// Default export for convenient importing
export default Loading;