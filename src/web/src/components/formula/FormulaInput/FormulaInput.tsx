import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.2.0
import { debounce } from 'lodash'; // v4.17.21
import { performance } from 'perf_hooks'; // v1.0.0

import { 
  FormulaInputContainer, 
  TextArea, 
  ActionBar 
} from './FormulaInput.styles';
import { Button } from '../../common/Button/Button';
import { useFormula } from '../../../hooks/useFormula';
import { 
  FormulaStyle, 
  ComplexityLevel 
} from '../../../types/formula.types';

// Constants for performance and accessibility
const MIN_TEXTAREA_HEIGHT = 100;
const MAX_TEXTAREA_HEIGHT = 200;
const DEBOUNCE_DELAY = 150;
const PERFORMANCE_SLA = 2000;

interface FormulaInputProps {
  defaultValue?: string;
  placeholder?: string;
  onSubmit?: (formula: string) => Promise<void>;
  ariaLabel?: string;
  locale?: string;
}

/**
 * AI-enhanced formula input component for Excel Add-in
 * Implements real-time formula suggestions, validation, and accessibility features
 * 
 * @version 1.0.0
 * @component
 */
export const FormulaInput: React.FC<FormulaInputProps> = ({
  defaultValue = '',
  placeholder = 'Enter your formula or describe what you want to do...',
  onSubmit,
  ariaLabel = 'Excel formula input with AI assistance',
  locale = 'en-US'
}) => {
  // Refs for performance tracking and DOM manipulation
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef<number>(0);

  // Local state for input management
  const [inputValue, setInputValue] = useState<string>(defaultValue);
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // Custom hook for formula management with AI assistance
  const {
    handleInputChange,
    isLoading,
    suggestions,
    error
  } = useFormula();

  /**
   * Auto-resize textarea based on content
   */
  const adjustTextAreaHeight = useCallback(() => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = 'auto';
      const scrollHeight = textArea.scrollHeight;
      textArea.style.height = `${Math.min(
        Math.max(scrollHeight, MIN_TEXTAREA_HEIGHT),
        MAX_TEXTAREA_HEIGHT
      )}px`;
    }
  }, []);

  /**
   * Debounced input handler with performance tracking
   */
  const debouncedInputHandler = useCallback(
    debounce(async (value: string) => {
      const processingTime = performance.now() - startTimeRef.current;
      
      try {
        await handleInputChange(value);
        
        // Track performance metrics
        if (processingTime > PERFORMANCE_SLA) {
          console.warn(`Formula input processing exceeded SLA: ${processingTime}ms`);
        }
      } catch (error) {
        console.error('Formula input processing error:', error);
      }
    }, DEBOUNCE_DELAY),
    [handleInputChange]
  );

  /**
   * Handle textarea input changes with performance tracking
   */
  const handleTextAreaChange = useCallback((
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    startTimeRef.current = performance.now();
    const value = event.target.value;
    setInputValue(value);
    adjustTextAreaHeight();
    
    if (!isComposing) {
      debouncedInputHandler(value);
    }
  }, [adjustTextAreaHeight, debouncedInputHandler, isComposing]);

  /**
   * Handle keyboard events for accessibility and shortcuts
   */
  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    // Submit on Ctrl/Cmd + Enter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }

    // Handle tab key for accessibility
    if (event.key === 'Tab') {
      if (suggestions.length > 0) {
        event.preventDefault();
        // Handle suggestion navigation
      }
    }
  }, [suggestions]);

  /**
   * Handle formula submission with validation
   */
  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    try {
      if (onSubmit) {
        await onSubmit(inputValue);
        setInputValue('');
        adjustTextAreaHeight();
      }
    } catch (error) {
      console.error('Formula submission error:', error);
    }
  }, [inputValue, isLoading, onSubmit, adjustTextAreaHeight]);

  // Effect for initial setup and cleanup
  useEffect(() => {
    adjustTextAreaHeight();
    return () => {
      debouncedInputHandler.cancel();
    };
  }, [adjustTextAreaHeight, debouncedInputHandler]);

  return (
    <FormulaInputContainer
      role="form"
      aria-label={ariaLabel}
    >
      <TextArea
        ref={textAreaRef}
        value={inputValue}
        onChange={handleTextAreaChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        aria-describedby={error ? 'formula-error' : undefined}
        aria-busy={isLoading}
        spellCheck={false}
        autoComplete="off"
        data-testid="formula-input"
      />
      
      {error && (
        <div
          id="formula-error"
          role="alert"
          aria-live="polite"
          className="error-message"
        >
          {error}
        </div>
      )}

      <ActionBar>
        <Button
          variant="secondary"
          onClick={() => setInputValue('')}
          disabled={!inputValue || isLoading}
          aria-label="Clear formula input"
        >
          Clear
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!inputValue || isLoading}
          loading={isLoading}
          aria-label="Apply formula"
        >
          Apply
        </Button>
      </ActionBar>
    </FormulaInputContainer>
  );
};

export default FormulaInput;