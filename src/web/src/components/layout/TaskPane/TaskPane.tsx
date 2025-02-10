import React, { useState, useCallback, useEffect, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FocusTrapZone } from '@fluentui/react'; // ^8.0.0
import {
  TaskPaneContainer,
  TaskPaneHeader,
  TaskPaneContent,
  CollapsedContainer
} from './TaskPane.styles';
import { useTheme } from '../../hooks/useTheme';
import { COMPONENT_DIMENSIONS, ACCESSIBILITY } from '../../../constants/ui.constants';

interface TaskPaneProps {
  children: React.ReactNode;
  className?: string;
  initialCollapsed?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  disableAnimation?: boolean;
}

/**
 * Custom hook for managing collapse state with localStorage persistence
 */
const useCollapseState = (initialCollapsed: boolean = false) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('taskPaneCollapsed');
    return stored ? JSON.parse(stored) : initialCollapsed;
  });

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('taskPaneCollapsed', JSON.stringify(newState));
      return newState;
    });
  }, []);

  return { isCollapsed, toggleCollapse };
};

/**
 * TaskPane component that provides the main layout structure for the Excel Add-in
 * Implements Microsoft's Fluent Design System and ensures WCAG 2.1 Level AA compliance
 */
const TaskPane: React.FC<TaskPaneProps> = memo(({
  children,
  className,
  initialCollapsed = false,
  onCollapsedChange,
  disableAnimation = false
}) => {
  const { theme, isHighContrastMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed, toggleCollapse } = useCollapseState(initialCollapsed);

  // Handle collapse state changes
  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (!isCollapsed) {
        toggleCollapse();
      }
    }
  }, [isCollapsed, toggleCollapse]);

  // Update document title for screen readers
  useEffect(() => {
    const pathName = location.pathname.split('/').pop() || 'Home';
    const title = `Excel Add-in - ${pathName}`;
    document.title = title;
  }, [location]);

  // Handle reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches && !disableAnimation) {
      document.documentElement.style.setProperty('--animation-duration', '0ms');
    }
    return () => {
      document.documentElement.style.removeProperty('--animation-duration');
    };
  }, [disableAnimation]);

  return (
    <FocusTrapZone
      disabled={isCollapsed}
      firstFocusableSelector="[data-automation-id='taskpane-toggle']"
    >
      <TaskPaneContainer
        className={className}
        isCollapsed={isCollapsed}
        onKeyDown={handleKeyDown}
        role="complementary"
        aria-label="Excel Add-in Task Pane"
        data-high-contrast={isHighContrastMode}
        style={{
          width: isCollapsed ? 
            COMPONENT_DIMENSIONS.TASK_PANE_COLLAPSED_WIDTH : 
            COMPONENT_DIMENSIONS.TASK_PANE_WIDTH
        }}
      >
        <TaskPaneHeader>
          <button
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand task pane' : 'Collapse task pane'}
            aria-expanded={!isCollapsed}
            data-automation-id="taskpane-toggle"
            style={{
              minWidth: ACCESSIBILITY.MIN_TOUCH_TARGET,
              minHeight: ACCESSIBILITY.MIN_TOUCH_TARGET
            }}
          >
            {isCollapsed ? '→' : '←'}
          </button>
          {!isCollapsed && (
            <span
              role="heading"
              aria-level={1}
              style={{
                marginLeft: theme.spacing.scale.md,
                fontSize: theme.typography.fontSize.lg
              }}
            >
              AI Excel Assistant
            </span>
          )}
        </TaskPaneHeader>

        {isCollapsed ? (
          <CollapsedContainer>
            {/* Collapsed state navigation icons */}
            <nav role="navigation" aria-label="Collapsed navigation">
              {/* Add collapsed state navigation buttons here */}
            </nav>
          </CollapsedContainer>
        ) : (
          <TaskPaneContent
            role="main"
            aria-label="Task pane content"
          >
            {children}
          </TaskPaneContent>
        )}
      </TaskPaneContainer>
    </FocusTrapZone>
  );
});

TaskPane.displayName = 'TaskPane';

export default TaskPane;