import styled from 'styled-components'; // ^5.3.0
import { Theme } from '../../../types/theme.types';

/**
 * Container component for the Excel Add-in header
 * Implements fixed positioning and proper z-indexing for sticky behavior
 * Ensures proper containment for performance optimization
 */
export const HeaderContainer = styled.div<{ theme: Theme }>`
  width: 100%;
  height: 48px;
  padding: ${({ theme }) => theme.spacing.unit}px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.secondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  contain: layout style;
  will-change: transform;
`;

/**
 * Header title component with proper text truncation
 * Implements WCAG 2.1 Level AA compliant typography
 */
export const HeaderTitle = styled.h1<{ theme: Theme }>`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

/**
 * Container for header control buttons
 * Implements proper spacing and alignment
 */
export const HeaderControls = styled.div<{ theme: Theme }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.unit}px;
`;

/**
 * Interactive button component with enhanced accessibility
 * Implements WCAG 2.1 Level AA compliant focus states and touch targets
 */
export const HeaderButton = styled.button<{ theme: Theme }>`
  background: transparent;
  border: none;
  padding: ${({ theme }) => theme.spacing.unit / 2}px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  border-radius: 4px;
  min-width: 44px; /* WCAG 2.1 touch target size */
  min-height: 44px; /* WCAG 2.1 touch target size */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  user-select: none;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(0, 120, 212, 0.1);
  }

  &[aria-pressed="true"] {
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (forced-colors: active) {
    border: 1px solid currentColor;
  }
`;

/**
 * Visual separator component with proper spacing
 * Implements high contrast mode support
 */
export const HeaderDivider = styled.hr<{ theme: Theme }>`
  height: 24px;
  width: 1px;
  background: ${({ theme }) => theme.colors.secondary};
  margin: 0 ${({ theme }) => theme.spacing.unit}px;
  flex-shrink: 0;
  border: none;

  @media (forced-colors: active) {
    background: currentColor;
  }
`;