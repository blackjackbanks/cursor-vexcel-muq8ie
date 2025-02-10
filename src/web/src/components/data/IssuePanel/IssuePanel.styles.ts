import styled from 'styled-components'; // ^5.3.0
import { Theme } from '../../types/theme.types';

/**
 * Main container for the issue panel following Fluent Design specifications
 * Implements proper spacing, borders, and background styling
 */
export const IssuePanelContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 4px;
  padding: ${({ theme }) => theme.spacing.scale.md}px;
  margin: ${({ theme }) => theme.spacing.scale.sm}px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 2px solid ${({ theme }) => theme.colors.text};
    background: transparent;
  }
`;

/**
 * Header component with Fluent UI typography and proper vertical rhythm
 */
export const IssueHeader = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.scale.md}px;
  padding-bottom: ${({ theme }) => theme.spacing.scale.sm}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.secondary};
  
  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.text};
  }
`;

/**
 * Scrollable list container with virtualization support
 */
export const IssueList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing.scale.sm}px;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.secondary};
    border-radius: 3px;
  }
  
  /* High contrast mode scrollbar */
  @media screen and (-ms-high-contrast: active) {
    &::-webkit-scrollbar-thumb {
      background: ${({ theme }) => theme.colors.text};
    }
  }
`;

/**
 * Interactive issue item with severity-based styling and accessibility
 */
export const IssueItem = styled.div<{ severity: 'error' | 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.scale.sm}px;
  margin-bottom: ${({ theme }) => theme.spacing.scale.sm}px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background};
  border-left: 4px solid ${({ severity, theme }) => theme.colors[severity]};
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  /* Typography */
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  
  /* Interactive states */
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  
  /* High contrast mode */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid ${({ severity, theme }) => theme.colors.highContrast[severity]};
    background: transparent;
    
    &:hover {
      background: ${({ theme }) => theme.colors.text};
      color: ${({ theme }) => theme.colors.background};
    }
  }
`;

/**
 * Severity indicator icon with proper sizing and animations
 */
export const IssueIcon = styled.span<{ 
  severity: 'error' | 'warning' | 'info',
  size?: 'small' | 'medium' | 'large' 
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.scale.sm}px;
  
  /* Size variants */
  width: ${({ size = 'medium' }) => ({
    small: '16px',
    medium: '20px',
    large: '24px'
  })[size]};
  
  height: ${({ size = 'medium' }) => ({
    small: '16px',
    medium: '20px',
    large: '24px'
  })[size]};
  
  /* Severity-based colors */
  color: ${({ severity, theme }) => theme.colors[severity]};
  
  /* Animation for focus states */
  transition: transform 0.2s ease;
  
  ${IssueItem}:hover & {
    transform: scale(1.1);
  }
  
  /* High contrast mode */
  @media screen and (-ms-high-contrast: active) {
    color: ${({ severity, theme }) => theme.colors.highContrast[severity]};
  }
`;