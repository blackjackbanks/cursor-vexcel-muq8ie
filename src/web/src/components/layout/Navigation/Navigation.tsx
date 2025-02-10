import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@fluentui/react'; // ^8.0.0
import { FocusTrapZone } from '@fluentui/react'; // ^8.0.0

import {
  NavigationContainer,
  NavigationList,
  NavigationItem,
  NavigationIcon,
  NavigationLabel
} from './Navigation.styles';
import { useTheme } from '../../../hooks/useTheme';
import {
  COMPONENT_DIMENSIONS,
  ANIMATION_TIMINGS,
  Z_INDEX,
  ACCESSIBILITY
} from '../../../constants/ui.constants';

// Navigation items configuration with accessibility labels and keyboard shortcuts
const NAVIGATION_ITEMS = [
  {
    route: 'formula',
    icon: 'Calculator',
    label: 'Formula Assistant',
    ariaLabel: 'Navigate to Formula Assistant',
    keyboardShortcut: 'Alt+1'
  },
  {
    route: 'data',
    icon: 'TableComputed',
    label: 'Data Cleaning',
    ariaLabel: 'Navigate to Data Cleaning',
    keyboardShortcut: 'Alt+2'
  },
  {
    route: 'version',
    icon: 'History',
    label: 'Version History',
    ariaLabel: 'Navigate to Version History',
    keyboardShortcut: 'Alt+3'
  }
] as const;

interface NavigationProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  isCollapsed?: boolean;
  onCollapse?: (isCollapsed: boolean) => void;
  ariaLabel?: string;
  reducedMotion?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentRoute,
  onRouteChange,
  isCollapsed = false,
  onCollapse,
  ariaLabel = 'Main navigation',
  reducedMotion = false
}) => {
  const { theme } = useTheme();
  const [isCollapsedState, setIsCollapsedState] = useState(isCollapsed);
  const navigationRef = useRef<HTMLElement>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);

  // Handle navigation item selection with keyboard support
  const handleNavigation = useCallback((route: string, event?: React.KeyboardEvent | React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      
      // Handle keyboard navigation
      if ('key' in event) {
        const isValidKey = ['Enter', ' ', 'Space'].includes(event.key);
        if (!isValidKey) return;
      }
    }

    // Announce route change to screen readers
    const announceElement = document.createElement('div');
    announceElement.setAttribute('role', 'status');
    announceElement.setAttribute('aria-live', 'polite');
    announceElement.textContent = `Navigating to ${route}`;
    document.body.appendChild(announceElement);

    // Update route
    onRouteChange(route);

    // Clean up announcement
    setTimeout(() => {
      document.body.removeChild(announceElement);
    }, parseInt(ANIMATION_TIMINGS.ARIA_LIVE_DELAY));

    // Auto-collapse on mobile if needed
    if (window.innerWidth <= 480 && !isCollapsedState) {
      toggleCollapse();
    }
  }, [onRouteChange, isCollapsedState]);

  // Toggle navigation collapse state with animation
  const toggleCollapse = useCallback(() => {
    const newCollapsedState = !isCollapsedState;
    setIsCollapsedState(newCollapsedState);
    onCollapse?.(newCollapsedState);

    // Announce state change to screen readers
    const message = newCollapsedState ? 'Navigation collapsed' : 'Navigation expanded';
    const announceElement = document.createElement('div');
    announceElement.setAttribute('role', 'status');
    announceElement.setAttribute('aria-live', 'polite');
    announceElement.textContent = message;
    document.body.appendChild(announceElement);

    setTimeout(() => {
      document.body.removeChild(announceElement);
    }, parseInt(ANIMATION_TIMINGS.ARIA_LIVE_DELAY));
  }, [isCollapsedState, onCollapse]);

  // Keyboard navigation handling
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const items = NAVIGATION_ITEMS;
    let newIndex = activeItemIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = activeItemIndex < items.length - 1 ? activeItemIndex + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = activeItemIndex > 0 ? activeItemIndex - 1 : items.length - 1;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== activeItemIndex) {
      setActiveItemIndex(newIndex);
      const itemElement = navigationRef.current?.querySelector(`[data-index="${newIndex}"]`);
      (itemElement as HTMLElement)?.focus();
    }
  }, [activeItemIndex]);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (event.altKey) {
        const itemIndex = parseInt(event.key) - 1;
        if (itemIndex >= 0 && itemIndex < NAVIGATION_ITEMS.length) {
          event.preventDefault();
          handleNavigation(NAVIGATION_ITEMS[itemIndex].route);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [handleNavigation]);

  return (
    <FocusTrapZone disabled={!isCollapsedState}>
      <NavigationContainer
        ref={navigationRef}
        isCollapsed={isCollapsedState}
        theme={theme}
        role="navigation"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        data-reduced-motion={reducedMotion}
      >
        <NavigationList role="menubar" aria-orientation="vertical">
          {NAVIGATION_ITEMS.map((item, index) => (
            <NavigationItem
              key={item.route}
              isActive={currentRoute === item.route}
              onClick={(e) => handleNavigation(item.route, e)}
              onKeyDown={(e) => handleNavigation(item.route, e)}
              role="menuitem"
              tabIndex={index === activeItemIndex ? 0 : -1}
              aria-label={item.ariaLabel}
              aria-current={currentRoute === item.route ? 'page' : undefined}
              data-index={index}
              theme={theme}
            >
              <NavigationIcon theme={theme}>
                <Icon iconName={item.icon} aria-hidden="true" />
              </NavigationIcon>
              {!isCollapsedState && (
                <NavigationLabel theme={theme}>
                  {item.label}
                  <span className="keyboard-shortcut" aria-hidden="true">
                    {item.keyboardShortcut}
                  </span>
                </NavigationLabel>
              )}
            </NavigationItem>
          ))}
        </NavigationList>
      </NavigationContainer>
    </FocusTrapZone>
  );
};

export default Navigation;