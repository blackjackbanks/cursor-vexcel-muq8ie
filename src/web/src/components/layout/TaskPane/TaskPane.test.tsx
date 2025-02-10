import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import TaskPane from './TaskPane';
import { COMPONENT_DIMENSIONS, ACCESSIBILITY } from '../../../constants/ui.constants';
import { lightTheme, darkTheme, highContrastTheme } from '../../../config/theme.config';
import { ThemeMode } from '../../../types/theme.types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('TaskPane Component', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset all mocks
    jest.clearAllMocks();
  });

  // Wrapper component with theme provider
  const renderWithTheme = (ui: React.ReactElement, theme = lightTheme) => {
    return render(
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    );
  };

  describe('Rendering', () => {
    it('renders with correct initial dimensions', () => {
      const { container } = renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>
      );

      const taskPane = container.firstChild as HTMLElement;
      expect(taskPane).toHaveStyle({
        width: COMPONENT_DIMENSIONS.TASK_PANE_WIDTH
      });
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI Excel Assistant');
    });

    it('renders in collapsed state when initialCollapsed is true', () => {
      const { container } = renderWithTheme(
        <TaskPane initialCollapsed>
          <div>Content</div>
        </TaskPane>
      );

      const taskPane = container.firstChild as HTMLElement;
      expect(taskPane).toHaveStyle({
        width: COMPONENT_DIMENSIONS.TASK_PANE_COLLAPSED_WIDTH
      });
      expect(screen.queryByText('AI Excel Assistant')).not.toBeInTheDocument();
    });

    it('persists collapse state in localStorage', async () => {
      const { rerender } = renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>
      );

      const toggleButton = screen.getByRole('button', { name: /collapse task pane/i });
      await userEvent.click(toggleButton);

      expect(localStorage.getItem('taskPaneCollapsed')).toBe('true');

      // Rerender to verify persistence
      rerender(
        <ThemeProvider theme={lightTheme}>
          <TaskPane>
            <div>Content</div>
          </TaskPane>
        </ThemeProvider>
      );

      expect(screen.queryByText('AI Excel Assistant')).not.toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('handles collapse/expand toggle correctly', async () => {
      const onCollapsedChange = jest.fn();
      renderWithTheme(
        <TaskPane onCollapsedChange={onCollapsedChange}>
          <div>Content</div>
        </TaskPane>
      );

      const toggleButton = screen.getByRole('button', { name: /collapse task pane/i });
      
      // Test collapse
      await userEvent.click(toggleButton);
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
      expect(screen.queryByText('AI Excel Assistant')).not.toBeInTheDocument();

      // Test expand
      await userEvent.click(toggleButton);
      expect(onCollapsedChange).toHaveBeenCalledWith(false);
      expect(screen.getByText('AI Excel Assistant')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>
      );

      const taskPane = screen.getByRole('complementary');
      
      // Test Escape key for collapse
      fireEvent.keyDown(taskPane, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText('AI Excel Assistant')).not.toBeInTheDocument();
      });

      // Test focus trap when collapsed
      const toggleButton = screen.getByRole('button', { name: /expand task pane/i });
      expect(document.activeElement).not.toBe(toggleButton);
      await userEvent.tab();
      expect(document.activeElement).toBe(toggleButton);
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', () => {
      renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>
      );

      const taskPane = screen.getByRole('complementary');
      expect(taskPane).toHaveAttribute('aria-label', 'Excel Add-in Task Pane');

      const toggleButton = screen.getByRole('button', { name: /collapse task pane/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('supports high contrast mode', () => {
      renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>,
        highContrastTheme
      );

      const taskPane = screen.getByRole('complementary');
      expect(taskPane).toHaveAttribute('data-high-contrast', 'true');
    });
  });

  describe('Theme Support', () => {
    it('applies theme styles correctly', () => {
      const { rerender } = renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>
      );

      // Test light theme
      let taskPane = screen.getByRole('complementary');
      expect(taskPane).toHaveStyle({
        backgroundColor: lightTheme.colors.background
      });

      // Test dark theme
      rerender(
        <ThemeProvider theme={darkTheme}>
          <TaskPane>
            <div>Content</div>
          </TaskPane>
        </ThemeProvider>
      );

      taskPane = screen.getByRole('complementary');
      expect(taskPane).toHaveStyle({
        backgroundColor: darkTheme.colors.background
      });
    });

    it('handles reduced motion preference', () => {
      // Mock reduced motion preference
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderWithTheme(
        <TaskPane disableAnimation={false}>
          <div>Content</div>
        </TaskPane>
      );

      const style = window.getComputedStyle(document.documentElement);
      expect(style.getPropertyValue('--animation-duration')).toBe('0ms');
    });
  });

  describe('RTL Support', () => {
    it('renders correctly in RTL mode', () => {
      document.documentElement.setAttribute('dir', 'rtl');
      
      const { container } = renderWithTheme(
        <TaskPane>
          <div>Content</div>
        </TaskPane>
      );

      const taskPane = container.firstChild as HTMLElement;
      expect(taskPane).toHaveStyle({
        transformOrigin: 'right top'
      });

      // Cleanup
      document.documentElement.removeAttribute('dir');
    });
  });
});