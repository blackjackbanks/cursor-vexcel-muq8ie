import styled from 'styled-components'; // ^5.3.6
import { Theme } from '@fluentui/react'; // ^8.0.0
import { 
  COMPONENT_DIMENSIONS, 
  ANIMATION_TIMINGS, 
  ACCESSIBILITY 
} from '../../../constants/ui.constants';

// Confidence score thresholds for color coding
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.0
} as const;

/**
 * Returns a WCAG compliant color based on confidence score
 * Ensures proper contrast ratio for accessibility
 */
const getConfidenceColor = (score: number, theme: Theme): string => {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    return theme.semanticColors.successText;
  } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return theme.semanticColors.warningText;
  }
  return theme.semanticColors.errorText;
};

/**
 * Main container for the suggestion panel
 * Implements scrollable content with proper accessibility features
 */
export const Container = styled.div`
  min-height: ${COMPONENT_DIMENSIONS.PANEL_MIN_HEIGHT};
  max-height: calc(100vh - ${COMPONENT_DIMENSIONS.HEADER_HEIGHT});
  overflow-y: auto;
  padding: ${props => props.theme.spacing.scale.md}px;
  background-color: ${props => props.theme.colors.surface};
  
  /* Smooth entrance animation */
  animation: ${ANIMATION_TIMINGS.FADE_IN} ease-in;
  
  /* Reduced motion preference support */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.secondary};
    border-radius: 3px;
  }
`;

/**
 * Individual suggestion item container
 * Ensures proper spacing and touch targets
 */
export const SuggestionItem = styled.div`
  min-height: ${ACCESSIBILITY.MIN_TOUCH_TARGET};
  padding: ${props => props.theme.spacing.scale.sm}px;
  margin-bottom: ${props => props.theme.spacing.scale.sm}px;
  border: 1px solid ${props => props.theme.colors.secondary};
  border-radius: 4px;
  background-color: ${props => props.theme.colors.background};
  
  /* Interactive states */
  &:hover {
    background-color: ${props => props.theme.colors.surface};
    transition: background-color ${ANIMATION_TIMINGS.FADE_IN} ease;
  }
  
  /* Focus management */
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary};
    ${ACCESSIBILITY.KEYBOARD_FOCUS_STYLE}
  }
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 2px solid currentColor;
  }
`;

/**
 * Container for suggestion action buttons
 * Implements proper spacing and alignment
 */
export const ActionButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.scale.sm}px;
  margin-top: ${props => props.theme.spacing.scale.sm}px;
  
  /* Ensure minimum touch target size */
  > * {
    min-width: ${ACCESSIBILITY.MIN_TOUCH_TARGET};
    min-height: ${ACCESSIBILITY.MIN_TOUCH_TARGET};
  }
`;

/**
 * Styled code element for formula display
 * Implements proper font and overflow handling
 */
export const FormulaText = styled.code`
  display: block;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: ${props => props.theme.typography.fontSize.sm};
  line-height: ${props => props.theme.typography.lineHeight.normal};
  padding: ${props => props.theme.spacing.scale.sm}px;
  background-color: ${props => props.theme.colors.background};
  border-radius: 2px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  
  /* Ensure proper contrast ratio */
  color: ${props => props.theme.colors.text};
`;

/**
 * Confidence score display element
 * Implements proper color coding and accessibility
 */
export const ConfidenceScore = styled.span<{ score: number }>`
  display: inline-flex;
  align-items: center;
  padding: ${props => props.theme.spacing.scale.xs}px ${props => props.theme.spacing.scale.sm}px;
  border-radius: 12px;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => getConfidenceColor(props.score, props.theme)};
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid currentColor;
    color: currentColor;
  }
`;