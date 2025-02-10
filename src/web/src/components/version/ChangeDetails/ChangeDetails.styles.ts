import styled from 'styled-components';
import { Theme } from '../../../types/theme.types';

// Constants for styling and accessibility
const BORDER_RADIUS = 4;
const TRANSITION_DURATION = '0.2s';
const MIN_CONTRAST_RATIO = 4.5;
const HIGH_CONTRAST_RATIO = 7;

/**
 * Helper function to determine the appropriate color for change type indicators
 * Ensures WCAG 2.1 Level AA compliance with proper contrast ratios
 */
const getChangeTypeColor = (type: 'added' | 'modified' | 'deleted', theme: Theme, isHighContrast = false) => {
  const colors = {
    added: theme.colors.success,
    modified: theme.colors.warning,
    deleted: theme.colors.error
  };

  // Apply high contrast adjustments if needed
  if (isHighContrast || theme.mode === 'highContrast') {
    return colors[type];
  }

  return colors[type];
};

/**
 * Main container for change details with proper spacing and focus management
 * Implements responsive layout and keyboard navigation support
 */
export const ChangeDetailsContainer = styled.section`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.spacing.scale.md}px`};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${BORDER_RADIUS}px;
  transition: background ${TRANSITION_DURATION} ease;

  /* Ensure proper focus visibility for keyboard navigation */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    padding: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  }
`;

/**
 * Header section with semantic structure and proper heading hierarchy
 * Includes ARIA labels and high contrast support
 */
export const ChangeHeader = styled.header`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => `${theme.spacing.scale.md}px`};
  
  h2 {
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text};
    margin: 0;
  }
`;

/**
 * Content section with responsive layout and proper content flow
 * Implements WCAG compliant spacing and typography
 */
export const ChangeContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  
  /* Ensure proper text contrast */
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
`;

/**
 * Metadata section with semantic structure and ARIA support
 * Includes proper spacing and alignment
 */
export const ChangeMetadata = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  margin-top: ${({ theme }) => `${theme.spacing.scale.md}px`};
  
  /* Style for metadata labels */
  dt {
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => `${theme.spacing.scale.xs}px`};
  }

  /* Style for metadata values */
  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
  }
`;

/**
 * Diff visualization with high contrast support
 * Implements proper spacing and semantic markup
 */
export const ChangeDiff = styled.div<{ changeType: 'added' | 'modified' | 'deleted' }>`
  padding: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  border-left: 4px solid ${({ theme, changeType }) => 
    getChangeTypeColor(changeType, theme)};
  background: ${({ theme, changeType }) => {
    const baseColor = getChangeTypeColor(changeType, theme);
    return `${baseColor}15`; // 15% opacity for background
  }};
  
  /* Ensure proper contrast in high contrast mode */
  @media (forced-colors: active) {
    border-left-color: ${({ changeType }) => {
      switch (changeType) {
        case 'added': return 'CanvasText';
        case 'modified': return 'CanvasText';
        case 'deleted': return 'CanvasText';
        default: return 'CanvasText';
      }
    }};
    background: Canvas;
  }

  /* Proper spacing for diff content */
  pre {
    margin: 0;
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    overflow-x: auto;
  }
`;