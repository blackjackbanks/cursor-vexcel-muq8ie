import styled from 'styled-components'; // ^5.3.0
import { Theme } from '../../../types/theme.types';

/**
 * Root container for the timeline component
 * Provides vertical layout with proper spacing and overflow handling
 */
export const TimelineContainer = styled.div<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.spacing.scale.md}px`};
  overflow-y: auto;
  max-height: 100%;
  width: 100%;
  
  /* Ensure smooth scrolling for better UX */
  scroll-behavior: smooth;
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid currentColor;
  }
`;

/**
 * Container for grouping timeline items by date
 * Maintains consistent spacing between groups
 */
export const TimelineGroup = styled.div<{ theme: Theme }>`
  margin-bottom: ${({ theme }) => `${theme.spacing.scale.xl}px`};
  position: relative;

  &:last-child {
    margin-bottom: 0;
  }
`;

/**
 * Semantic heading for date groups with proper typography
 * Ensures sufficient color contrast for accessibility
 */
export const TimelineGroupHeader = styled.h3<{ theme: Theme }>`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: ${({ theme }) => `${theme.spacing.scale.md}px 0`};
  padding-left: ${({ theme }) => `${theme.spacing.scale.xl}px`};
`;

/**
 * Individual version change item with interactive states
 * Supports keyboard navigation and focus management
 */
export const TimelineItem = styled.div<{ theme: Theme }>`
  display: flex;
  position: relative;
  padding: ${({ theme }) => `${theme.spacing.scale.sm}px 0`};
  margin-left: ${({ theme }) => `${theme.spacing.scale.xl}px`};
  
  /* Interactive states */
  &:hover {
    background-color: ${({ theme }) => theme.colors.surface};
  }
  
  /* Focus management for keyboard navigation */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Visual connector between timeline items
 * Ensures proper contrast ratio for visibility
 */
export const TimelineConnector = styled.div<{ theme: Theme }>`
  position: absolute;
  left: -${({ theme }) => `${theme.spacing.scale.lg}px`};
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: ${({ theme }) => theme.colors.secondary};
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    background-color: currentColor;
  }
  
  &::before {
    content: '';
    position: absolute;
    left: -4px;
    top: ${({ theme }) => `${theme.spacing.scale.sm}px`};
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.primary};
  }
`;

/**
 * Container for version details with proper text alignment
 * Maintains consistent spacing between elements
 */
export const TimelineItemContent = styled.div<{ theme: Theme }>`
  flex: 1;
  padding: ${({ theme }) => `0 ${theme.spacing.scale.md}px`};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  color: ${({ theme }) => theme.colors.text};
`;

/**
 * Time display with proper typography and color contrast
 * Ensures readability across different theme modes
 */
export const TimelineItemTime = styled.span<{ theme: Theme }>`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.secondary};
  margin-bottom: ${({ theme }) => `${theme.spacing.scale.xs}px`};
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    color: currentColor;
  }
`;

/**
 * Action buttons container with interactive states
 * Supports keyboard navigation and focus management
 */
export const TimelineItemActions = styled.div<{ theme: Theme }>`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  margin-top: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  
  /* Ensure proper spacing between action buttons */
  & > * {
    margin-right: ${({ theme }) => `${theme.spacing.scale.xs}px`};
    
    &:last-child {
      margin-right: 0;
    }
  }
  
  /* Focus visible styles for keyboard navigation */
  & > *:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;