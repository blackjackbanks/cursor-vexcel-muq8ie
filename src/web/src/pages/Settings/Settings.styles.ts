import styled from 'styled-components';
import { Theme } from '../../types/theme.types';

/**
 * Main container for the settings page
 * Implements responsive width and proper spacing based on Fluent Design
 */
export const SettingsContainer = styled.div<{ collapsed?: boolean }>`
  width: ${({ collapsed }) => collapsed ? '50px' : '350px'};
  height: 100%;
  background-color: ${({ theme }) => theme.colors.background};
  transition: width ${({ theme }) => theme.animation?.duration?.medium}ms ease-in-out;
  overflow-x: hidden;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid ${({ theme }) => theme.colors.text};
  }
  
  /* Scrollbar styling for better visibility */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surface};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.secondary};
    border-radius: 3px;
  }
`;

/**
 * Container for grouped settings
 * Provides consistent spacing and visual hierarchy
 */
export const SettingsSection = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.scale.xl}px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.secondary}20;

  /* Focus management for keyboard navigation */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Header component for settings sections
 * Implements Office UI Fabric typography standards
 */
export const SettingsHeader = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin: 0 0 ${({ theme }) => theme.spacing.scale.md}px 0;
  
  /* RTL support */
  [dir='rtl'] & {
    text-align: right;
  }
`;

/**
 * Layout component for individual setting items
 * Ensures proper alignment and interaction states
 */
export const SettingsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px; /* Minimum touch target size */
  padding: ${({ theme }) => theme.spacing.scale.sm}px 0;
  
  /* Hover state */
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondary}10;
  }
  
  /* Focus state for keyboard navigation */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
  
  /* Spacing between rows */
  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.secondary}20;
  }
`;

/**
 * Label component with proper contrast and screen reader support
 */
export const SettingsLabel = styled.label`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin-right: ${({ theme }) => theme.spacing.scale.md}px;
  flex: 1;
  
  /* Ensure proper contrast ratio for accessibility */
  @media screen and (forced-colors: active) {
    color: CanvasText;
  }
`;

/**
 * Container for settings controls (inputs, toggles, etc.)
 * Provides consistent spacing and interaction states
 */
export const SettingsControl = styled.div`
  display: flex;
  align-items: center;
  min-width: 44px; /* Minimum touch target size */
  height: 32px;
  
  /* Proper spacing for adjacent controls */
  & > * + * {
    margin-left: ${({ theme }) => theme.spacing.scale.sm}px;
  }
  
  /* RTL support */
  [dir='rtl'] & {
    margin-left: 0;
    margin-right: ${({ theme }) => theme.spacing.scale.sm}px;
  }
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid ButtonText;
  }
`;