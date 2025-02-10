import styled from 'styled-components'; // ^5.3.0
import { ColorScheme, Typography, Spacing } from '../../../types/theme.types';

// Global constants for consistent sizing and spacing
const PREVIEW_MAX_HEIGHT = '400px';
const SCROLLBAR_WIDTH = '8px';
const CELL_MIN_WIDTH = '120px';
const HEADER_HEIGHT = '32px';
const CELL_PADDING = '8px';

// Custom scrollbar styles matching Excel's native appearance
const getScrollbarStyles = () => `
  &::-webkit-scrollbar {
    width: ${SCROLLBAR_WIDTH};
    height: ${SCROLLBAR_WIDTH};
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surface};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.secondary};
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;

    &:hover {
      background: ${({ theme }) => theme.colors.primary};
    }

    &:active {
      background: ${({ theme }) => theme.colors.primary};
    }
  }

  /* High Contrast Mode Adjustments */
  @media screen and (-ms-high-contrast: active) {
    &::-webkit-scrollbar-track {
      background: Window;
      border: 1px solid WindowText;
    }

    &::-webkit-scrollbar-thumb {
      background: WindowText;
      border: 1px solid Window;
    }
  }
`;

export const PreviewContainer = styled.div`
  position: relative;
  width: 100%;
  max-height: ${PREVIEW_MAX_HEIGHT};
  overflow: auto;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 4px;
  ${getScrollbarStyles()}

  /* Ensure container is keyboard accessible */
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  /* High contrast mode focus indicator */
  @media screen and (-ms-high-contrast: active) {
    &:focus {
      outline: 2px solid ButtonText;
    }
  }
`;

export const PreviewHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  height: ${HEADER_HEIGHT};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.secondary};
  display: flex;
  align-items: center;
  padding: 0 ${CELL_PADDING};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

export const PreviewTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  /* Ensure table is keyboard navigable */
  &:focus-within {
    outline: none;
  }
`;

export const TableHeader = styled.th<{ sortable?: boolean }>`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.surface};
  padding: ${CELL_PADDING};
  text-align: left;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  min-width: ${CELL_MIN_WIDTH};
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* Sortable header styles */
  ${({ sortable }) => sortable && `
    cursor: pointer;
    
    &:hover {
      background: ${({ theme }) => theme.colors.secondary}20;
    }

    &:focus {
      outline: 2px solid ${({ theme }) => theme.colors.primary};
      outline-offset: -2px;
    }
  `}

  /* High contrast mode adjustments */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid ButtonText;
    
    &:focus {
      outline: 2px solid ButtonText;
    }
  }
`;

export const TableCell = styled.td<{ selected?: boolean }>`
  padding: ${CELL_PADDING};
  border-bottom: 1px solid ${({ theme }) => theme.colors.secondary}40;
  min-width: ${CELL_MIN_WIDTH};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* Selection styles */
  ${({ selected, theme }) => selected && `
    background: ${theme.colors.primary}20;
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -2px;
  `}

  /* Focus styles for keyboard navigation */
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
    position: relative;
    z-index: 1;
  }

  /* High contrast mode adjustments */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid ButtonText;
    
    ${({ selected }) => selected && `
      background: Highlight;
      color: HighlightText;
    `}

    &:focus {
      outline: 2px solid ButtonText;
    }
  }
`;