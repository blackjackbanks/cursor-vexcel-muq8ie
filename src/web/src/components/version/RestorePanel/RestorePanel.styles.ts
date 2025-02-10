import styled, { keyframes } from 'styled-components'; // ^5.3.0
import { Theme } from '../../../types/theme.types';

// Global constants for panel styling
const PANEL_WIDTH = '350px';
const ANIMATION_DURATION = '0.3s';
const Z_INDEX_PANEL = '1000';

// Smooth slide-in animation with improved easing
const slideInAnimation = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Main container with enhanced accessibility and animation
export const RestorePanelContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: ${PANEL_WIDTH};
  height: 100vh;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  box-shadow: -4px 0 8px rgba(0, 0, 0, 0.1);
  z-index: ${Z_INDEX_PANEL};
  transform: translateX(${({ isOpen }) => (isOpen ? '0' : '100%')});
  opacity: ${({ isOpen }) => (isOpen ? '1' : '0')};
  animation: ${({ isOpen }) => isOpen && `${slideInAnimation} ${ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.2, 1)`};
  transition: transform ${ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.2, 1),
              opacity ${ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Accessibility improvements */
  outline: none;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

// Header section with proper typography and spacing
export const RestoreHeader = styled.div`
  padding: ${({ theme }) => `${theme.spacing.scale.md}px ${theme.spacing.scale.lg}px`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.text}1A;
  background-color: ${({ theme }) => theme.colors.background};

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  }
`;

// Scrollable content area with proper spacing
export const RestoreContent = styled.div`
  height: calc(100vh - 120px); // Adjust for header and actions height
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.scale.md}px;

  /* Smooth scrolling with reduced motion support */
  scroll-behavior: smooth;
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.text}40;
    border-radius: 3px;
    
    &:hover {
      background: ${({ theme }) => theme.colors.text}60;
    }
  }
`;

// Action buttons container with proper spacing
export const RestoreActions = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-top: 1px solid ${({ theme }) => theme.colors.text}1A;
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.scale.sm}px;

  /* Ensure buttons are keyboard accessible */
  button:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

// Version information display with enhanced states
export const VersionInfo = styled.div<{ hasChanges: boolean }>`
  padding: ${({ theme }) => theme.spacing.scale.sm}px;
  margin-bottom: ${({ theme }) => theme.spacing.scale.sm}px;
  border-radius: 4px;
  background-color: ${({ theme, hasChanges }) => 
    hasChanges ? `${theme.colors.primary}0A` : theme.colors.surface};
  border: 1px solid ${({ theme, hasChanges }) => 
    hasChanges ? theme.colors.primary : `${theme.colors.text}1A`};
  
  /* Typography */
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  color: ${({ theme }) => theme.colors.text};

  /* Interactive states */
  transition: background-color 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme, hasChanges }) => 
      hasChanges ? `${theme.colors.primary}14` : `${theme.colors.text}0A`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;