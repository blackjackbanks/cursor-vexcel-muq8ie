import styled from 'styled-components'; // ^5.3.0
import { Theme } from '../../../types/theme.types';

// Global constants for component dimensions
const INPUT_MIN_HEIGHT = 100;
const INPUT_MAX_HEIGHT = 200;
const ACTION_BAR_HEIGHT = 40;

/**
 * Main container for the formula input section
 * Implements Microsoft Fluent Design System layout patterns
 */
export const FormulaInputContainer = styled.div<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 350px; // Task pane width constraint
  min-height: ${INPUT_MIN_HEIGHT}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease-in-out;

  &:focus-within {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary};
  }

  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 2px solid currentColor;
  }
`;

/**
 * Enhanced textarea component for formula input
 * Implements auto-resize behavior and accessibility features
 */
export const TextArea = styled.textarea<{ theme: Theme }>`
  width: 100%;
  min-height: ${INPUT_MIN_HEIGHT - ACTION_BAR_HEIGHT}px;
  max-height: ${INPUT_MAX_HEIGHT - ACTION_BAR_HEIGHT}px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  background-color: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  resize: vertical;
  overflow-y: auto;

  /* Remove default textarea styling */
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  /* Placeholder styling */
  &::placeholder {
    color: ${({ theme }) => theme.colors.text}80;
  }

  /* Focus state */
  &:focus {
    outline: none;
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Ensure proper text rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: ${({ theme }) => theme.spacing.scale.xs}px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.primary}40;
    border-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  }

  /* ARIA support */
  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

/**
 * Action bar component for formula controls
 * Fixed height with proper spacing and interaction states
 */
export const ActionBar = styled.div<{ theme: Theme }>`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: ${ACTION_BAR_HEIGHT}px;
  padding: 0 ${({ theme }) => theme.spacing.scale.sm}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-top: 1px solid ${({ theme }) => theme.colors.primary}20;
  border-bottom-left-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  border-bottom-right-radius: ${({ theme }) => theme.spacing.scale.xs}px;

  /* Button spacing within action bar */
  > button {
    margin-left: ${({ theme }) => theme.spacing.scale.sm}px;
  }

  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border-top: 1px solid currentColor;
  }
`;