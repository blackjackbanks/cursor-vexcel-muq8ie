import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { axe, toHaveNoViolations } from 'jest-axe';
import Navigation from './Navigation';
import { lightTheme, darkTheme, highContrastTheme } from '../../../config/theme.config';
import { COMPONENT_DIMENSIONS, ANIMATION_TIMINGS, ACCESSIBILITY } from '../../../constants/ui.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock resize observer
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Helper function to render component with theme
const renderWithTheme = (ui: React.ReactElement, direction: 'ltr' | 'rtl' = 'ltr') => {
  const theme = {
    ...lightTheme,
    direction,
  };
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Test setup helper
const setupTest = (props = {}) => {
  const mockProps = {
    currentRoute: 'formula',
    onRouteChange: jest.fn(),
    isCollapsed: false,
    onCollapse: jest.fn(),
    ariaLabel: 'Main navigation',
    reducedMotion: false,
    ...props
  };
  
  const user = userEvent.setup();
  const utils = renderWithTheme(<Navigation {...mockProps} />);
  
  return {
    ...utils,
    user,
    mockProps,
  };
};

describe('Navigation Component', () => {
  describe('Rendering', () => {
    it('renders all navigation items correctly', () => {
      const { getByRole, getAllByRole } = setupTest();
      
      const nav = getByRole('navigation');
      expect(nav).toBeInTheDocument();
      
      const menuItems = getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
      
      expect(screen.getByText('Formula Assistant')).toBeInTheDocument();
      expect(screen.getByText('Data Cleaning')).toBeInTheDocument();
      expect(screen.getByText('Version History')).toBeInTheDocument();
    });

    it('applies correct dimensions based on collapsed state', async () => {
      const { rerender } = setupTest();
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle(`width: ${COMPONENT_DIMENSIONS.TASK_PANE_WIDTH}`);
      
      rerender(
        <ThemeProvider theme={lightTheme}>
          <Navigation 
            currentRoute="formula" 
            onRouteChange={jest.fn()} 
            isCollapsed={true}
          />
        </ThemeProvider>
      );
      
      await waitFor(() => {
        expect(nav).toHaveStyle(`width: ${COMPONENT_DIMENSIONS.TASK_PANE_COLLAPSED_WIDTH}`);
      });
    });

    it('handles RTL layout correctly', () => {
      const { getByRole } = renderWithTheme(
        <Navigation 
          currentRoute="formula" 
          onRouteChange={jest.fn()} 
        />, 
        'rtl'
      );
      
      const nav = getByRole('navigation');
      expect(nav).toHaveStyle('right: 0');
    });
  });

  describe('Interaction', () => {
    it('handles navigation item selection', async () => {
      const onRouteChange = jest.fn();
      const { user, getAllByRole } = setupTest({ onRouteChange });
      
      const menuItems = getAllByRole('menuitem');
      await user.click(menuItems[1]); // Click Data Cleaning
      
      expect(onRouteChange).toHaveBeenCalledWith('data');
    });

    it('supports keyboard navigation', async () => {
      const { user, getByRole } = setupTest();
      const nav = getByRole('navigation');
      
      await user.tab(); // Focus first item
      expect(document.activeElement).toHaveAttribute('aria-label', 'Navigate to Formula Assistant');
      
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Navigate to Data Cleaning');
      
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Navigate to Formula Assistant');
      
      await user.keyboard('{End}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Navigate to Version History');
      
      await user.keyboard('{Home}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Navigate to Formula Assistant');
    });

    it('handles keyboard shortcuts', async () => {
      const onRouteChange = jest.fn();
      const { user } = setupTest({ onRouteChange });
      
      await user.keyboard('{Alt>}1{/Alt}');
      expect(onRouteChange).toHaveBeenCalledWith('formula');
      
      await user.keyboard('{Alt>}2{/Alt}');
      expect(onRouteChange).toHaveBeenCalledWith('data');
      
      await user.keyboard('{Alt>}3{/Alt}');
      expect(onRouteChange).toHaveBeenCalledWith('version');
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility guidelines', async () => {
      const { container } = setupTest();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', () => {
      const { getByRole, getAllByRole } = setupTest();
      
      const nav = getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
      
      const menubar = getByRole('menubar');
      expect(menubar).toHaveAttribute('aria-orientation', 'vertical');
      
      const menuItems = getAllByRole('menuitem');
      menuItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
        if (item.getAttribute('data-index') === '0') {
          expect(item).toHaveAttribute('aria-current', 'page');
        }
      });
    });

    it('handles focus trap in collapsed state', async () => {
      const { user, getByRole } = setupTest({ isCollapsed: true });
      const nav = getByRole('navigation');
      
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
      expect(nav.contains(document.activeElement)).toBe(true);
      
      // Focus should stay within navigation when tabbing
      await user.tab();
      expect(nav.contains(document.activeElement)).toBe(true);
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors correctly', () => {
      const { getByRole, rerender } = setupTest();
      const nav = getByRole('navigation');
      
      // Light theme
      expect(nav).toHaveStyle(`background-color: ${lightTheme.colors.surface}`);
      
      // Dark theme
      rerender(
        <ThemeProvider theme={darkTheme}>
          <Navigation 
            currentRoute="formula" 
            onRouteChange={jest.fn()} 
          />
        </ThemeProvider>
      );
      expect(nav).toHaveStyle(`background-color: ${darkTheme.colors.surface}`);
      
      // High contrast theme
      rerender(
        <ThemeProvider theme={highContrastTheme}>
          <Navigation 
            currentRoute="formula" 
            onRouteChange={jest.fn()} 
          />
        </ThemeProvider>
      );
      expect(nav).toHaveStyle(`background-color: ${highContrastTheme.colors.surface}`);
    });

    it('respects reduced motion preferences', async () => {
      const { getByRole } = setupTest({ reducedMotion: true });
      const nav = getByRole('navigation');
      
      expect(nav).toHaveAttribute('data-reduced-motion', 'true');
      expect(nav).toHaveStyle(`transition-duration: ${ANIMATION_TIMINGS.REDUCED_MOTION}`);
    });
  });

  describe('Error Handling', () => {
    it('handles missing route gracefully', () => {
      const { getByRole } = setupTest({ currentRoute: 'invalid-route' });
      const nav = getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('prevents default on invalid keyboard events', async () => {
      const onRouteChange = jest.fn();
      const { user, getByRole } = setupTest({ onRouteChange });
      const nav = getByRole('navigation');
      
      await user.type(nav, '{Tab}');
      await user.keyboard('{Shift}');
      
      expect(onRouteChange).not.toHaveBeenCalled();
    });
  });
});