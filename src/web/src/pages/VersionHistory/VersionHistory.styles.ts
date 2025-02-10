import styled from 'styled-components'; // ^5.3.0
import { Theme } from '../../types/theme.types';

/**
 * Root container for the version history page
 * Implements responsive layout with proper spacing and max-width constraints
 */
export const VersionHistoryContainer = styled.div<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.scale.lg}px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  min-height: 100%;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
`;

/**
 * Container for version comparison section
 * Implements visual hierarchy with card-like appearance
 */
export const ComparisonSection = styled.section<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.scale.md}px;
  padding: ${({ theme }) => theme.spacing.scale.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
    box-shadow: none;
  }
`;

/**
 * Container for version selection controls
 * Implements flexible layout with proper spacing between controls
 */
export const ComparisonControls = styled.div<{ theme: Theme }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.scale.md}px;
  align-items: center;
  padding-bottom: ${({ theme }) => theme.spacing.scale.md}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.secondary}40;

  /* Responsive layout adjustments */
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

/**
 * Container for displaying version differences
 * Implements enhanced readability with proper spacing and contrast
 */
export const ComparisonDisplay = styled.div<{ theme: Theme }>`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.secondary}20;

  /* Ensure sufficient color contrast for accessibility */
  & mark {
    background-color: ${({ theme }) => theme.colors.info}20;
    color: ${({ theme }) => theme.colors.text};
  }
`;

/**
 * Container for version history timeline
 * Implements visual hierarchy and proper spacing
 */
export const HistorySection = styled.section<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.scale.md}px;
  padding: ${({ theme }) => theme.spacing.scale.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
    box-shadow: none;
  }
`;

/**
 * Header for version history section
 * Implements Fluent Design typography standards
 */
export const HistoryHeader = styled.h2<{ theme: Theme }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  padding-bottom: ${({ theme }) => theme.spacing.scale.sm}px;

  /* Focus visible for keyboard navigation */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Loading indicator for version operations
 * Implements smooth animation and ARIA attributes for accessibility
 */
export const ProgressIndicator = styled.div<{ theme: Theme }>`
  height: 2px;
  background-color: ${({ theme }) => theme.colors.secondary}20;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    background-color: ${({ theme }) => theme.colors.primary};
    animation: loading 1.5s infinite;
  }

  @keyframes loading {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(200%);
    }
  }
`;