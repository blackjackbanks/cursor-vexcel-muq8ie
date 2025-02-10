import React, { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Toggle,
  ChoiceGroup,
  IChoiceGroupOption,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import {
  SettingsContainer,
  SettingsSection,
  SettingsHeader,
  SettingsRow
} from './Settings.styles';
import { useTheme } from '../../hooks/useTheme';
import { ThemeMode } from '../../types/theme.types';
import { ACCESSIBILITY } from '../../constants/ui.constants';

/**
 * Settings page component providing theme and accessibility configuration
 * Implements WCAG 2.1 Level AA compliance with Microsoft's Fluent Design System
 */
const Settings: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Theme mode options following Fluent Design
  const themeModeOptions: IChoiceGroupOption[] = [
    {
      key: ThemeMode.LIGHT,
      text: 'Light Mode',
      iconProps: { iconName: 'Sunny' }
    },
    {
      key: ThemeMode.DARK,
      text: 'Dark Mode',
      iconProps: { iconName: 'ClearNight' }
    },
    {
      key: ThemeMode.HIGH_CONTRAST,
      text: 'High Contrast',
      iconProps: { iconName: 'Contrast' }
    }
  ];

  /**
   * Handles theme mode changes with system theme detection and persistence
   */
  const handleThemeChange = useCallback(async (option: IChoiceGroupOption) => {
    try {
      setIsLoading(true);
      setError(null);

      const selectedMode = option.key as ThemeMode;
      const newTheme = await import('../../config/theme.config').then(module => {
        switch (selectedMode) {
          case ThemeMode.DARK:
            return module.darkTheme;
          case ThemeMode.HIGH_CONTRAST:
            return module.highContrastTheme;
          default:
            return module.lightTheme;
        }
      });

      setTheme(newTheme);

      // Update document attributes for accessibility
      document.documentElement.setAttribute('data-theme', selectedMode);
      if (selectedMode === ThemeMode.HIGH_CONTRAST) {
        document.documentElement.setAttribute('data-high-contrast', 'true');
      } else {
        document.documentElement.removeAttribute('data-high-contrast');
      }
    } catch (err) {
      setError('Failed to update theme. Please try again.');
      console.error('Theme change error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setTheme]);

  /**
   * Manages accessibility settings including reduced motion
   */
  const handleAccessibilityToggle = useCallback((checked: boolean) => {
    setReducedMotion(checked);
    document.documentElement.style.setProperty(
      '--reduced-motion',
      checked ? ACCESSIBILITY.ANIMATION_TIMINGS.REDUCED_MOTION : 'none'
    );
  }, []);

  /**
   * Syncs with system theme changes
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newMode = e.matches ? ThemeMode.DARK : ThemeMode.LIGHT;
      handleThemeChange({ key: newMode } as IChoiceGroupOption);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [handleThemeChange]);

  return (
    <SettingsContainer role="complementary" aria-label="Settings Panel">
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setError(null)}
          dismissButtonAriaLabel="Close error message"
        >
          {error}
        </MessageBar>
      )}

      <Stack tokens={{ childrenGap: 16 }}>
        <SettingsSection>
          <SettingsHeader>Theme Settings</SettingsHeader>
          {isLoading ? (
            <Spinner size={SpinnerSize.large} label="Updating theme..." />
          ) : (
            <ChoiceGroup
              options={themeModeOptions}
              selectedKey={theme.mode}
              onChange={(_, option) => option && handleThemeChange(option)}
              ariaLabel="Select theme mode"
            />
          )}
        </SettingsSection>

        <SettingsSection>
          <SettingsHeader>Accessibility</SettingsHeader>
          <SettingsRow>
            <Toggle
              label="Reduce Motion"
              checked={reducedMotion}
              onChange={(_, checked) => handleAccessibilityToggle(checked)}
              onText="On"
              offText="Off"
              ariaLabel="Toggle reduced motion"
            />
          </SettingsRow>
          <SettingsRow>
            <Toggle
              label="High Contrast Mode"
              checked={theme.mode === ThemeMode.HIGH_CONTRAST}
              onChange={(_, checked) => {
                handleThemeChange({
                  key: checked ? ThemeMode.HIGH_CONTRAST : ThemeMode.LIGHT
                } as IChoiceGroupOption);
              }}
              onText="On"
              offText="Off"
              ariaLabel="Toggle high contrast mode"
            />
          </SettingsRow>
        </SettingsSection>
      </Stack>
    </SettingsContainer>
  );
};

export default Settings;