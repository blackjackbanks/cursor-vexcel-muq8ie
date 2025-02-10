import styled, { css } from 'styled-components';
import { Theme } from '@fluentui/react';
import {
  COMPONENT_DIMENSIONS,
  ANIMATION_TIMINGS,
  Z_INDEX,
  ACCESSIBILITY
} from '../../../constants/ui.constants';

// Helper function for generating transition styles with reduced motion support
const getTransitionStyles = (property: string, duration: string, easing: string = 'cubic-bezier(0.4, 0, 0.2, 1)') => css`
  @media (prefers-reduced-motion: no-preference) {
    transition: ${property} ${duration} ${easing};
    will-change: ${property};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const TaskPaneContainer = styled.div<{ isCollapsed: boolean }>`
  width: ${props => props.isCollapsed ? COMPONENT_DIMENSIONS.TASK_PANE_COLLAPSED_WIDTH : COMPONENT_DIMENSIONS.TASK_PANE_WIDTH};
  height: 100vh;
  background-color: ${props => props.theme.colors.background};
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: ${props => props.theme.mode === 'highContrast' ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.15)'};
  border: ${props => props.theme.mode === 'highContrast' ? '1px solid currentColor' : 'none'};
  
  ${props => getTransitionStyles('width', ANIMATION_TIMINGS.EXPAND)}
  
  [dir='rtl'] & {
    transform-origin: right top;
  }
  
  [dir='ltr'] & {
    transform-origin: left top;
  }
  
  &:focus-visible {
    outline: ${ACCESSIBILITY.FOCUS_VISIBLE_OUTLINE};
    outline-offset: -1px;
  }
`;

export const TaskPaneHeader = styled.header`
  height: ${COMPONENT_DIMENSIONS.HEADER_HEIGHT};
  min-height: ${COMPONENT_DIMENSIONS.HEADER_HEIGHT};
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.mode === 'highContrast' ? 'currentColor' : props.theme.colors.secondary};
  position: relative;
  z-index: ${Z_INDEX.HEADER};
  
  ${props => getTransitionStyles('background-color', ANIMATION_TIMINGS.FADE_IN)}
`;

export const TaskPaneContent = styled.main`
  height: calc(100vh - ${COMPONENT_DIMENSIONS.HEADER_HEIGHT});
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.colors.secondary} transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.secondary};
    border-radius: 3px;
    border: 2px solid transparent;
  }
  
  /* High contrast mode adjustments */
  @media screen and (-ms-high-contrast: active) {
    scrollbar-color: currentColor transparent;
    
    &::-webkit-scrollbar-thumb {
      background-color: currentColor;
    }
  }
`;

export const CollapsedContainer = styled.div`
  width: ${COMPONENT_DIMENSIONS.TASK_PANE_COLLAPSED_WIDTH};
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  
  ${props => getTransitionStyles('transform', ANIMATION_TIMINGS.COLLAPSE)}
  
  [dir='rtl'] & {
    transform: translateX(${COMPONENT_DIMENSIONS.TASK_PANE_WIDTH});
  }
  
  /* Ensure minimum touch target size for buttons */
  button {
    min-width: ${COMPONENT_DIMENSIONS.TOUCH_TARGET_SIZE};
    min-height: ${COMPONENT_DIMENSIONS.TOUCH_TARGET_SIZE};
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 4px 0;
    
    &:focus-visible {
      outline: ${ACCESSIBILITY.FOCUS_VISIBLE_OUTLINE};
      outline-offset: 2px;
    }
  }
`;

export const NavigationContainer = styled.nav`
  width: ${COMPONENT_DIMENSIONS.NAVIGATION_WIDTH};
  height: 100%;
  position: absolute;
  left: 0;
  top: ${COMPONENT_DIMENSIONS.HEADER_HEIGHT};
  z-index: ${Z_INDEX.NAVIGATION};
  background-color: ${props => props.theme.colors.surface};
  border-right: 1px solid ${props => props.theme.mode === 'highContrast' ? 'currentColor' : props.theme.colors.secondary};
  
  [dir='rtl'] & {
    left: auto;
    right: 0;
    border-right: none;
    border-left: 1px solid ${props => props.theme.mode === 'highContrast' ? 'currentColor' : props.theme.colors.secondary};
  }
  
  ${props => getTransitionStyles('background-color', ANIMATION_TIMINGS.FADE_IN)}
`;