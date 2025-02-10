import React, { useCallback, useRef } from 'react';
import { Icon } from '@fluentui/react'; // ^8.0.0
import {
  ErrorContainer,
  ErrorIcon,
  ErrorMessage,
  ErrorActions
} from './Error.styles';

/**
 * Props interface for the Error component
 * Extends HTMLDivElement props for native HTML attribute support
 */
interface ErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The main error message to display */
  message: string;
  /** Optional detailed error message or description */
  details?: string;
  /** Optional action buttons or links */
  actions?: React.ReactNode;
  /** Optional custom icon name from Fluent UI icon set */
  iconName?: string;
  /** Optional callback for dismissing the error */
  onDismiss?: () => void;
  /** Optional ARIA label for screen readers */
  ariaLabel?: string;
  /** Optional ARIA role override */
  role?: string;
  /** Optional tab index for keyboard navigation */
  tabIndex?: number;
}

/**
 * Error component for displaying error states following Fluent Design System
 * Implements WCAG 2.1 Level AA compliance for accessibility
 *
 * @param props - Component props
 * @returns JSX.Element - Rendered error component
 */
const Error: React.FC<ErrorProps> = ({
  message,
  details,
  actions,
  iconName = 'ErrorBadge',
  onDismiss,
  ariaLabel,
  role = 'alert',
  tabIndex = 0,
  ...restProps
}) => {
  // Ref for the error container to manage focus
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handles dismissal of the error message
   * Includes cleanup and focus management
   */
  const handleDismiss = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  /**
   * Handles keyboard events for accessibility
   * Implements keyboard navigation and interaction
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && onDismiss) {
      event.preventDefault();
      onDismiss();
    }
  }, [onDismiss]);

  return (
    <ErrorContainer
      ref={containerRef}
      role={role}
      aria-label={ariaLabel || message}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      {...restProps}
    >
      <ErrorIcon
        iconName={iconName}
        aria-hidden="true"
        title={message}
      />
      <div>
        <ErrorMessage>
          {message}
        </ErrorMessage>
        {details && (
          <ErrorMessage
            as="p"
            style={{ fontSize: 'smaller', marginTop: '4px' }}
            aria-details={details}
          >
            {details}
          </ErrorMessage>
        )}
      </div>
      {actions && (
        <ErrorActions>
          {actions}
        </ErrorActions>
      )}
      {onDismiss && (
        <ErrorIcon
          iconName="Cancel"
          aria-label="Dismiss error"
          role="button"
          tabIndex={0}
          onClick={handleDismiss}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleDismiss(e as unknown as React.MouseEvent);
            }
          }}
          style={{ cursor: 'pointer', marginLeft: 'auto' }}
        />
      )}
    </ErrorContainer>
  );
};

// Default export for the Error component
export default Error;

// Named export for type usage
export type { ErrorProps };