import styled from 'styled-components'; // ^5.3.0
import { Theme } from '../../../types/theme.types';

/**
 * Determines the appropriate color for progress bar based on progress value
 * following WCAG 2.1 Level AA contrast guidelines
 */
const getProgressBarColor = (progress: number) => ({ theme }: { theme: Theme }) => {
  if (progress < 0 || progress > 100) {
    throw new Error('Progress value must be between 0 and 100');
  }
  
  if (progress < 33) return theme.colors.error;
  if (progress < 66) return theme.colors.warning;
  return theme.colors.success;
};

/**
 * Main container for the action panel following Fluent UI layout principles
 */
export const ActionPanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.spacing.scale.md}px`};
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 4px;
`;

/**
 * Section header with Fluent UI typography standards
 */
export const ActionHeader = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
`;

/**
 * Container for action items with consistent spacing
 */
export const ActionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  margin: ${({ theme }) => `${theme.spacing.scale.sm}px 0`};
`;

/**
 * Individual action item container with Fluent UI alignment
 */
export const ActionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 4px;
  
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Action button following Fluent UI design and accessibility standards
 */
export const ActionButton = styled.button<{ disabled?: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text};
  background-color: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 4px;
  padding: ${({ theme }) => `${theme.spacing.scale.xs}px ${theme.spacing.scale.md}px`};
  min-width: 80px;
  height: 32px;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.secondary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

/**
 * Progress bar with WCAG-compliant colors and smooth transitions
 */
export const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 4px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 2px;
  overflow: hidden;
  margin: ${({ theme }) => `${theme.spacing.scale.sm}px 0`};

  &::after {
    content: '';
    display: block;
    width: ${({ progress }) => `${progress}%`};
    height: 100%;
    background-color: ${props => getProgressBarColor(props.progress)(props)};
    transition: width 0.3s ease, background-color 0.3s ease;
  }
`;

/**
 * Progress text with proper contrast and typography
 */
export const ProgressText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  margin-left: ${({ theme }) => `${theme.spacing.scale.xs}px`};
`;

/**
 * Error message with WCAG-compliant error color
 */
export const ErrorMessage = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
  margin-top: ${({ theme }) => `${theme.spacing.scale.xs}px`};
`;