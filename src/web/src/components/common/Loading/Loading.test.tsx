import React from 'react';
import { render, screen, within } from '@testing-library/react'; // ^13.4.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { ThemeProvider } from 'styled-components'; // ^5.3.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^7.0.0
import Loading from './Loading';
import { LoadingContainer } from './Loading.styles';
import { Theme, ThemeMode } from '../../types/theme.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme following Fluent Design System
const mockTheme: Theme = {
  mode: ThemeMode.LIGHT,
  colors: {
    primary: '#0078d4',
    secondary: '#2b88d8',
    background: '#ffffff',
    surface: '#f8f8f8',
    text: '#323130',
    error: '#a4262c',
    warning: '#ffd335',
    success: '#107c10',
    info: '#0078d4'
  },
  typography: {
    fontFamily: '"Segoe UI", sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px',
      xxl: '28px'
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  spacing: {
    unit: 4,
    scale: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48
    }
  }
};

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactElement, options = {}) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {ui}
    </ThemeProvider>,
    options
  );
};

// Mock matchMedia for reduced motion tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Loading Component', () => {
  beforeEach(() => {
    // Reset matchMedia mock before each test
    mockMatchMedia(false);
  });

  it('renders without crashing', () => {
    renderWithTheme(<Loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithTheme(<Loading size="small" />);
    let spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ minWidth: '44px', minHeight: '44px' }); // Verify touch target size

    rerender(<Loading size="medium" />);
    spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ minWidth: '44px', minHeight: '44px' });

    rerender(<Loading size="large" />);
    spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ minWidth: '48px', minHeight: '48px' });
  });

  it('displays loading text when provided', () => {
    const loadingText = 'Processing data...';
    renderWithTheme(<Loading text={loadingText} />);
    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });

  it('handles accessibility requirements', async () => {
    const { container } = renderWithTheme(
      <Loading text="Loading data" ariaLabel="Processing spreadsheet data" />
    );

    // Check for ARIA attributes
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveAttribute('aria-busy', 'true');
    expect(spinner).toHaveAttribute('aria-valuetext', 'Loading data');

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports reduced motion preferences', () => {
    mockMatchMedia(true); // Enable reduced motion
    renderWithTheme(<Loading />);
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyleRule('animation-duration', '0.01ms', {
      media: '(prefers-reduced-motion: reduce)'
    });
  });

  it('supports RTL layout', () => {
    // Mock document.documentElement.dir
    Object.defineProperty(document.documentElement, 'dir', {
      value: 'rtl',
      writable: true
    });

    renderWithTheme(<Loading text="Loading" />);
    const container = screen.getByRole('status');
    expect(container).toHaveStyle({ direction: 'rtl' });

    const text = screen.getByText('Loading');
    expect(text).toHaveStyle({ direction: 'rtl' });
  });

  it('applies custom className correctly', () => {
    const customClass = 'custom-loader';
    renderWithTheme(<Loading className={customClass} />);
    expect(screen.getByRole('status')).toHaveClass(customClass);
  });

  it('handles theme changes correctly', () => {
    const darkTheme = {
      ...mockTheme,
      mode: ThemeMode.DARK,
      colors: {
        ...mockTheme.colors,
        background: '#1b1b1b',
        text: '#ffffff'
      }
    };

    const { rerender } = render(
      <ThemeProvider theme={darkTheme}>
        <Loading text="Loading" />
      </ThemeProvider>
    );

    expect(screen.getByText('Loading')).toHaveStyle({
      color: darkTheme.colors.text
    });

    // Test high contrast theme
    const highContrastTheme = {
      ...mockTheme,
      mode: ThemeMode.HIGH_CONTRAST
    };

    rerender(
      <ThemeProvider theme={highContrastTheme}>
        <Loading text="Loading" />
      </ThemeProvider>
    );

    // High contrast mode styles are applied via media query
    const text = screen.getByText('Loading');
    expect(text).toHaveStyleRule('color', 'CanvasText', {
      media: '(forced-colors: active)'
    });
  });

  it('maintains minimum touch target sizes for accessibility', () => {
    const { rerender } = renderWithTheme(<Loading size="small" />);
    let spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ minWidth: '44px', minHeight: '44px' });

    rerender(<Loading size="medium" />);
    spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ minWidth: '44px', minHeight: '44px' });

    rerender(<Loading size="large" />);
    spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ minWidth: '48px', minHeight: '48px' });
  });
});