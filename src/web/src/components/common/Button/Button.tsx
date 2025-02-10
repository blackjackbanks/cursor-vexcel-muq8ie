import React, { useState, useCallback, useEffect } from 'react';
import { Loading } from '@fluentui/react-icons'; // ^1.1.0
import { StyledButton, ButtonIcon, ButtonContent } from './Button.styles';

interface ButtonProps {
  /** Button variant following Fluent Design System */
  variant?: 'primary' | 'secondary' | 'text';
  /** Button size following Fluent Design System scale */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state of the button */
  disabled?: boolean;
  /** Loading state of the button */
  loading?: boolean;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Position of the icon relative to button text */
  iconPosition?: 'left' | 'right';
  /** Button content */
  children: React.ReactNode;
  /** Click handler - supports async operations */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** Accessibility label */
  'aria-label'?: string;
  /** ID of element describing the button */
  'aria-describedby'?: string;
  /** Indicates whether button is in a busy state */
  'aria-busy'?: boolean;
}

/**
 * A reusable button component following Microsoft's Fluent Design System.
 * Provides consistent styling, behavior, and accessibility across the Excel Add-in.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  onClick,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-busy': ariaBusy,
}) => {
  // Internal loading state for async operations
  const [isLoading, setIsLoading] = useState(loading);
  // Track mounted state to prevent state updates after unmount
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  /**
   * Handles button click events with loading state management
   * and async operation support
   */
  const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) {
      event.preventDefault();
      return;
    }

    if (onClick) {
      try {
        setIsLoading(true);
        const result = onClick(event);
        
        // Handle async onClick handlers
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error('Button click handler error:', error);
      } finally {
        // Only update state if component is still mounted
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
  }, [onClick, disabled, isLoading, isMounted]);

  /**
   * Handles keyboard events for accessibility compliance
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.key === ' ') {
        event.preventDefault();
      }
      event.currentTarget.click();
    }
  }, []);

  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled}
      loading={isLoading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={ariaBusy || isLoading}
      aria-disabled={disabled || isLoading}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {/* Loading spinner centered absolutely within button */}
      {isLoading && (
        <ButtonIcon position={iconPosition} size={size}>
          <Loading aria-hidden="true" />
        </ButtonIcon>
      )}

      {/* Button content with icon */}
      <ButtonContent loading={isLoading}>
        {icon && iconPosition === 'left' && (
          <ButtonIcon position="left" size={size}>
            {icon}
          </ButtonIcon>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <ButtonIcon position="right" size={size}>
            {icon}
          </ButtonIcon>
        )}
      </ButtonContent>
    </StyledButton>
  );
};

export default Button;