import styled from 'styled-components'; // ^5.3.0
import { Theme } from '../../types/theme.types';

// Global constants for layout
const TASK_PANE_WIDTH = '350px';
const TASK_PANE_PADDING = '16px';
const SECTION_GAP = '24px';

// Helper function for consistent flex layouts
const getFlexLayout = (direction: string, gap: string) => `
  display: flex;
  flex-direction: ${direction};
  gap: ${gap};
`;

/**
 * Main container for the data cleaning interface
 * Follows Office UI Fabric layout guidelines
 */
export const DataCleaningContainer = styled.div<{ theme: Theme }>`
  width: ${TASK_PANE_WIDTH};
  height: 100vh;
  padding: ${TASK_PANE_PADDING};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  overflow-y: auto;
  
  /* Ensure smooth scrolling for accessibility */
  scroll-behavior: smooth;
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid currentColor;
  }
`;

/**
 * Page header with Fluent UI typography
 * Maintains WCAG 2.1 Level AA compliance for text contrast
 */
export const Header = styled.h1<{ theme: Theme }>`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin-bottom: ${({ theme }) => theme.spacing.scale.md}px;
  color: ${({ theme }) => theme.colors.text};
`;

/**
 * Content section with flex layout for organizing components
 * Maintains consistent spacing between sections
 */
export const ContentSection = styled.section<{ theme: Theme }>`
  ${getFlexLayout('column', SECTION_GAP)};
  margin-bottom: ${({ theme }) => theme.spacing.scale.lg}px;
`;

/**
 * Data preview section with scrollable container
 * Optimized for large datasets while maintaining performance
 */
export const PreviewSection = styled.div<{ theme: Theme }>`
  flex: 1;
  min-height: 200px;
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  overflow: auto;
  
  /* Optimize scrolling performance */
  will-change: transform;
  -webkit-overflow-scrolling: touch;
`;

/**
 * Issue panel section with clear visual hierarchy
 * Highlights data quality issues with semantic colors
 */
export const IssueSection = styled.div<{ theme: Theme }>`
  flex: 0 0 auto;
  min-height: 150px;
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  
  /* Visual indication for issues */
  &:not(:empty) {
    border-left: 4px solid ${({ theme }) => theme.colors.warning};
  }
`;

/**
 * Action panel with clear interaction states
 * Follows Fluent UI button and control styling
 */
export const ActionSection = styled.div<{ theme: Theme }>`
  margin-top: auto;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  border-top: 1px solid ${({ theme }) => theme.colors.secondary};
  
  /* Flex layout for action buttons */
  ${getFlexLayout('row', `${({ theme }) => theme.spacing.scale.sm}px`)};
  justify-content: flex-end;
  
  /* Ensure buttons are easily clickable */
  & > * {
    min-height: 32px;
    min-width: 80px;
  }
`;

/**
 * Progress indicator container
 * Provides visual feedback for data cleaning operations
 */
export const ProgressContainer = styled.div<{ theme: Theme }>`
  margin-top: ${({ theme }) => theme.spacing.scale.md}px;
  padding: ${({ theme }) => theme.spacing.scale.sm}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  
  /* Progress bar styling */
  & > progress {
    width: 100%;
    height: 4px;
    
    /* Ensure proper contrast for accessibility */
    &::-webkit-progress-value {
      background-color: ${({ theme }) => theme.colors.primary};
    }
    
    &::-moz-progress-bar {
      background-color: ${({ theme }) => theme.colors.primary};
    }
  }
`;