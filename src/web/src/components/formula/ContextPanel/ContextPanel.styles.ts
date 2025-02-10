import styled from 'styled-components';
import { Theme } from '../../../types/theme.types';

// Global constants for panel dimensions
const PANEL_MIN_HEIGHT = '150px';
const PANEL_MAX_HEIGHT = '300px';

/**
 * Main container for the context panel
 * Implements Fluent Design principles with proper spacing and layout
 * WCAG 2.1 Level AA compliant with proper contrast and focus management
 */
export const ContextPanelContainer = styled.div<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  min-height: ${PANEL_MIN_HEIGHT};
  max-height: ${PANEL_MAX_HEIGHT};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  overflow: hidden;
  position: relative;

  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 2px solid currentColor;
  }
`;

/**
 * Container for individual context sections
 * Provides proper spacing and visual separation between sections
 */
export const SectionContainer = styled.div<{ theme: Theme }>`
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.secondary};

  &:last-child {
    border-bottom: none;
  }

  /* Ensure proper spacing between sections */
  & + & {
    margin-top: ${({ theme }) => theme.spacing.scale.sm}px;
  }
`;

/**
 * Label styling for context sections
 * Implements proper typography and accessibility features
 */
export const SectionLabel = styled.h3<{ theme: Theme }>`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin: 0 0 ${({ theme }) => theme.spacing.scale.sm}px 0;

  /* Ensure proper contrast ratio for accessibility */
  @media screen and (-ms-high-contrast: active) {
    color: currentColor;
  }
`;

/**
 * Content container for context information
 * Handles overflow and proper spacing of content
 */
export const SectionContent = styled.div<{ theme: Theme }>`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  padding: ${({ theme }) => theme.spacing.scale.sm}px 0;
  overflow-y: auto;

  /* Ensure proper focus visibility for keyboard navigation */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Container for formula metadata display
 * Uses subtle background and appropriate typography
 */
export const MetadataContainer = styled.div<{ theme: Theme }>`
  background-color: ${({ theme }) => `${theme.colors.background}E6`}; // 90% opacity
  padding: ${({ theme }) => theme.spacing.scale.sm}px;
  margin-top: ${({ theme }) => theme.spacing.scale.sm}px;
  border-radius: ${({ theme }) => theme.spacing.scale.xs}px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};

  /* Ensure proper spacing between metadata items */
  & > * + * {
    margin-top: ${({ theme }) => theme.spacing.scale.xs}px;
  }
`;