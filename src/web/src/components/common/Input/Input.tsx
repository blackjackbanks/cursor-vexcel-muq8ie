import React, { FC, ChangeEvent, FocusEvent, useState, useCallback, useRef, useEffect } from 'react'; // ^18.2.0
import { useTheme, useHighContrastMode } from 'styled-components'; // ^5.3.0
import { InputContainer, StyledInput, InputLabel, ErrorText } from './Input.styles';
import { Theme } from '../../types/theme.types';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  name?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaErrorMessage?: string;
  role?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  tabIndex?: number;
}

export const Input: FC<InputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  label,
  disabled = false,
  placeholder,
  type = 'text',
  name,
  id,
  className,
  ariaLabel,
  ariaDescribedBy,
  ariaErrorMessage,
  role,
  required = false,
  autoComplete,
  inputMode,
  pattern,
  minLength,
  maxLength,
  tabIndex,
}) => {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme() as Theme;
  const isHighContrast = useHighContrastMode();

  // Generate unique IDs for accessibility
  const uniqueId = useRef(`input-${Math.random().toString(36).substr(2, 9)}`);
  const inputId = id || uniqueId.current;
  const errorId = `${inputId}-error`;
  const labelId = `${inputId}-label`;

  // Handle input value changes with validation
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Validate against pattern if provided
    const isValid = !pattern || new RegExp(pattern).test(newValue);
    
    if (inputRef.current) {
      inputRef.current.setAttribute('aria-invalid', (!isValid).toString());
      
      // Announce validation status to screen readers
      if (!isValid) {
        inputRef.current.setAttribute('aria-errormessage', errorId);
      } else {
        inputRef.current.removeAttribute('aria-errormessage');
      }
    }

    onChange(newValue);
  }, [onChange, pattern, errorId]);

  // Handle focus events with keyboard navigation
  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    setTouched(true);

    // Announce input purpose to screen readers
    if (inputRef.current && label) {
      const announcement = `${label}${required ? ', required' : ''}`;
      inputRef.current.setAttribute('aria-label', announcement);
    }

    onFocus?.(event);
  }, [label, required, onFocus]);

  // Handle blur events with final validation
  const handleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);

    // Final validation on blur
    if (inputRef.current) {
      const isValid = !pattern || new RegExp(pattern).test(event.target.value);
      inputRef.current.setAttribute('aria-invalid', (!isValid).toString());
    }

    onBlur?.(event);
  }, [pattern, onBlur]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup any lingering aria attributes
      if (inputRef.current) {
        inputRef.current.removeAttribute('aria-errormessage');
        inputRef.current.removeAttribute('aria-invalid');
      }
    };
  }, []);

  return (
    <InputContainer
      className={className}
      error={!!error}
      disabled={disabled}
      theme={theme}
      highContrast={isHighContrast}
    >
      {label && (
        <InputLabel
          htmlFor={inputId}
          id={labelId}
          error={!!error}
          disabled={disabled}
          theme={theme}
          highContrast={isHighContrast}
        >
          {label}
          {required && <span aria-hidden="true"> *</span>}
          <span className="sr-only">{required ? 'required' : 'optional'}</span>
        </InputLabel>
      )}

      <StyledInput
        ref={inputRef}
        id={inputId}
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        name={name}
        role={role}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        minLength={minLength}
        maxLength={maxLength}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={!!error}
        aria-errormessage={error ? errorId : undefined}
        aria-required={required}
        error={!!error}
        focused={focused}
        theme={theme}
        highContrast={isHighContrast}
      />

      {error && touched && (
        <ErrorText
          id={errorId}
          role="alert"
          error
          theme={theme}
          highContrast={isHighContrast}
        >
          {error}
        </ErrorText>
      )}
    </InputContainer>
  );
};

export default Input;