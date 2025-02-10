import styled, { css } from 'styled-components'; // ^5.3.0
import { Theme } from '../../../types/theme.types';
import { COMPONENT_DIMENSIONS, ANIMATION_TIMINGS, Z_INDEX, ACCESSIBILITY } from '../../../constants/ui.constants';

// Constants for navigation dimensions
const COLLAPSED_WIDTH = COMPONENT_DIMENSIONS.TASK_PANE_COLLAPSED_WIDTH;
const EXPANDED_WIDTH = COMPONENT_DIMENSIONS.TASK_PANE_WIDTH;
const TOUCH_TARGET_MIN_SIZE = ACCESSIBILITY.MIN_TOUCH_TARGET;

// Helper function for generating optimized transition styles
const getTransitionStyles = (isCollapsed: boolean, direction: Theme['direction']) => css`
  transform: translateX(${isCollapsed 
    ? direction === 'rtl' ? EXPANDED_WIDTH : `-${EXPANDED_WIDTH}` 
    : '0'});
  transition: transform ${ANIMATION_TIMINGS.COLLAPSE} ease-in-out;
  will-change: transform;
  transform-origin: ${direction === 'rtl' ? 'right' : 'left'} center;
`;

export const NavigationContainer = styled.nav<{
  isCollapsed: boolean;
  theme: Theme;
}>`
  position: fixed;
  top: ${COMPONENT_DIMENSIONS.HEADER_HEIGHT};
  ${({ theme }) => theme.direction === 'rtl' ? 'right: 0' : 'left: 0'};
  width: ${({ isCollapsed }) => isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH};
  height: calc(100vh - ${COMPONENT_DIMENSIONS.HEADER_HEIGHT});
  background-color: ${({ theme }) => theme.colors.surface};
  z-index: ${Z_INDEX.NAVIGATION};
  ${({ isCollapsed, theme }) => getTransitionStyles(isCollapsed, theme.direction)};
  
  // Accessibility support
  outline: none;
  &:focus-visible {
    ${ACCESSIBILITY.KEYBOARD_FOCUS_STYLE};
  }
  
  // Reduced motion support
  @media (prefers-reduced-motion: reduce) {
    transition-duration: ${ANIMATION_TIMINGS.REDUCED_MOTION};
  }
  
  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

export const NavigationList = styled.ul`
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => theme.spacing.scale.sm}px 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  
  // Accessibility
  role: 'list';
  
  // Scrollbar styling
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.secondary};
    border-radius: 3px;
  }
`;

export const NavigationItem = styled.li<{
  isActive?: boolean;
  theme: Theme;
}>`
  display: flex;
  align-items: center;
  min-height: ${TOUCH_TARGET_MIN_SIZE};
  padding: ${({ theme }) => `${theme.spacing.scale.xs}px ${theme.spacing.scale.sm}px`};
  cursor: pointer;
  color: ${({ theme, isActive }) => 
    isActive ? theme.colors.primary : theme.colors.text};
  background-color: ${({ theme, isActive }) => 
    isActive ? `${theme.colors.primary}20` : 'transparent'};
  
  // Accessibility
  role: 'listitem';
  tabIndex: 0;
  aria-selected: ${({ isActive }) => isActive};
  
  // Focus and hover states
  &:hover {
    background-color: ${({ theme }) => `${theme.colors.primary}10`};
  }
  
  &:focus-visible {
    ${ACCESSIBILITY.KEYBOARD_FOCUS_STYLE};
    outline-offset: -2px;
  }
  
  // Touch target size compliance
  @media (pointer: coarse) {
    min-height: ${TOUCH_TARGET_MIN_SIZE};
    padding: ${({ theme }) => `${theme.spacing.scale.sm}px`};
  }
  
  // High contrast mode
  @media (forced-colors: active) {
    border: none;
    background-color: ${({ isActive }) => 
      isActive ? 'Highlight' : 'transparent'};
    color: ${({ isActive }) => 
      isActive ? 'HighlightText' : 'ButtonText'};
  }
`;

export const NavigationIcon = styled.div<{
  size?: string;
  theme: Theme;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ size }) => size || '24px'};
  height: ${({ size }) => size || '24px'};
  margin-right: ${({ theme }) => 
    theme.direction === 'rtl' ? '0' : theme.spacing.scale.sm + 'px'};
  margin-left: ${({ theme }) => 
    theme.direction === 'rtl' ? theme.spacing.scale.sm + 'px' : '0'};
  color: inherit;
  
  // Accessibility
  aria-hidden: true;
  
  // High contrast mode support
  @media (forced-colors: active) {
    forced-color-adjust: auto;
  }
  
  // Ensure minimum touch target size
  @media (pointer: coarse) {
    min-width: ${TOUCH_TARGET_MIN_SIZE};
    min-height: ${TOUCH_TARGET_MIN_SIZE};
  }
`;