/**
 * @fileoverview Enterprise-grade header component for Excel Add-in task pane
 * Implements Microsoft's Fluent Design System with enhanced security and accessibility
 * @version 1.0.0
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  DismissRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  SignOutRegular,
  AccessibilityRegular
} from '@fluentui/react-icons';
import { useA11y } from '@fluentui/react-hooks';

import {
  HeaderContainer,
  HeaderTitle,
  HeaderControls,
  HeaderButton,
  HeaderDivider
} from './Header.styles';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { ThemeMode } from '../../../types/theme.types';

/**
 * Enhanced header component with security, accessibility, and theme management
 * Implements WCAG 2.1 Level AA compliance and Microsoft Fluent Design System
 */
const Header = memo(() => {
  // Custom hooks for theme, auth, and accessibility
  const { theme, toggleTheme, toggleHighContrast, isHighContrastMode } = useTheme();
  const { user, logout, validateSession } = useAuth();
  const a11y = useA11y();

  /**
   * Enhanced theme toggle with system theme and high contrast support
   * Announces theme changes to screen readers
   */
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
    const newTheme = theme.mode === ThemeMode.LIGHT ? 'dark' : 'light';
    a11y.announceMessage(`Theme changed to ${newTheme} mode`);
  }, [theme.mode, toggleTheme, a11y]);

  /**
   * Enhanced high contrast toggle with accessibility announcements
   */
  const handleHighContrastToggle = useCallback(() => {
    toggleHighContrast();
    a11y.announceMessage(
      `High contrast mode ${isHighContrastMode ? 'disabled' : 'enabled'}`
    );
  }, [toggleHighContrast, isHighContrastMode, a11y]);

  /**
   * Secure logout handler with session cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      a11y.announceMessage('Signing out...');
      await logout();
      a11y.announceMessage('Successfully signed out');
    } catch (error) {
      console.error('Logout error:', error);
      a11y.announceMessage('Sign out failed. Please try again.');
    }
  }, [logout, a11y]);

  // Session validation effect
  useEffect(() => {
    const validateInterval = setInterval(() => {
      validateSession();
    }, 60000); // Check every minute

    return () => clearInterval(validateInterval);
  }, [validateSession]);

  return (
    <HeaderContainer
      role="banner"
      aria-label="Excel Add-in header"
      theme={theme}
    >
      <HeaderTitle theme={theme}>
        AI Excel Assistant
      </HeaderTitle>

      <HeaderControls theme={theme}>
        {/* Theme toggle button */}
        <HeaderButton
          theme={theme}
          onClick={handleThemeToggle}
          aria-label={`Switch to ${theme.mode === ThemeMode.LIGHT ? 'dark' : 'light'} theme`}
          aria-pressed={theme.mode === ThemeMode.DARK}
          data-testid="theme-toggle"
        >
          {theme.mode === ThemeMode.LIGHT ? (
            <WeatherMoonRegular aria-hidden="true" />
          ) : (
            <WeatherSunnyRegular aria-hidden="true" />
          )}
        </HeaderButton>

        {/* High contrast toggle button */}
        <HeaderButton
          theme={theme}
          onClick={handleHighContrastToggle}
          aria-label="Toggle high contrast mode"
          aria-pressed={isHighContrastMode}
          data-testid="contrast-toggle"
        >
          <AccessibilityRegular aria-hidden="true" />
        </HeaderButton>

        <HeaderDivider theme={theme} role="separator" />

        {/* User authentication status and logout */}
        {user && (
          <HeaderButton
            theme={theme}
            onClick={handleLogout}
            aria-label="Sign out"
            data-testid="logout-button"
          >
            <SignOutRegular aria-hidden="true" />
          </HeaderButton>
        )}

        {/* Task pane collapse button */}
        <HeaderButton
          theme={theme}
          onClick={() => Office.context.ui.closeContainer()}
          aria-label="Close task pane"
          data-testid="close-button"
        >
          <DismissRegular aria-hidden="true" />
        </HeaderButton>
      </HeaderControls>
    </HeaderContainer>
  );
});

// Display name for debugging
Header.displayName = 'Header';

export default Header;