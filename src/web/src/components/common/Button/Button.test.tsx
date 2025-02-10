import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^4.7.0
import { Add20Regular as AddIcon } from '@fluentui/react-icons'; // ^2.0.0
import { ThemeProvider } from 'styled-components'; // ^5.3.0
import Button from './Button';
import { defaultTheme } from '../../../theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock handlers
const mockOnClick = jest.fn();
const mockAsyncOnClick = jest.fn().mockImplementation(() => Promise.resolve());
const mockErrorOnClick = jest.fn().mockImplementation(() => Promise.reject(new Error('Test Error')));

// Test wrapper with theme provider
const renderWithTheme = (ui: React.ReactNode) => {
  return render(<ThemeProvider theme={defaultTheme}>{ui}</ThemeProvider>);
};

describe('Button component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic rendering tests
  it('renders correctly with default props', () => {
    renderWithTheme(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('tabIndex', '0');
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(button).toMatchSnapshot();
  });

  // Variant tests
  it('handles different variants correctly', () => {
    const { rerender } = renderWithTheme(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveStyleRule('background', defaultTheme.colors.primary);

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyleRule('border', `1px solid ${defaultTheme.colors.primary}`);

    rerender(<Button variant="text">Text</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyleRule('background', 'transparent');
  });

  // Size tests
  it('renders in different sizes', () => {
    const { rerender } = renderWithTheme(<Button size="small">Small</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveStyleRule('height', `${defaultTheme.spacing.scale.lg}px`);

    rerender(<Button size="medium">Medium</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyleRule('height', `${defaultTheme.spacing.scale.xl}px`);

    rerender(<Button size="large">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyleRule('height', `${defaultTheme.spacing.scale.xxl}px`);
  });

  // Icon tests
  it('renders with icons correctly', () => {
    renderWithTheme(
      <Button icon={<AddIcon data-testid="button-icon" />}>
        With Icon
      </Button>
    );
    
    expect(screen.getByTestId('button-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  // State tests
  it('handles disabled state correctly', () => {
    renderWithTheme(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveAttribute('disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('tabIndex', '-1');
    
    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  // Async operation tests
  it('handles async operations correctly', async () => {
    renderWithTheme(
      <Button onClick={mockAsyncOnClick}>
        Async Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTitle('Loading')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(button).not.toHaveAttribute('aria-busy');
      expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();
    });
  });

  // Error handling tests
  it('handles async errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithTheme(
      <Button onClick={mockErrorOnClick}>
        Error Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(button).not.toHaveAttribute('aria-busy');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Button click handler error:',
        expect.any(Error)
      );
    });
    
    consoleSpy.mockRestore();
  });

  // Keyboard interaction tests
  it('handles keyboard interactions correctly', async () => {
    renderWithTheme(<Button onClick={mockOnClick}>Keyboard Test</Button>);
    const button = screen.getByRole('button');
    
    // Space key
    await userEvent.type(button, ' ');
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    
    // Enter key
    await userEvent.type(button, '{enter}');
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });

  // Accessibility tests
  it('meets accessibility requirements', async () => {
    const { container } = renderWithTheme(
      <Button aria-label="Accessible Button" aria-describedby="description">
        Accessible
      </Button>
    );
    
    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Accessible Button');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

  // Focus management tests
  it('manages focus states correctly', async () => {
    renderWithTheme(<Button>Focus Test</Button>);
    const button = screen.getByRole('button');
    
    // Test focus visibility
    await userEvent.tab();
    expect(button).toHaveFocus();
    expect(button).toHaveStyleRule('outline', `2px solid ${defaultTheme.colors.primary}`, {
      modifier: ':focus-visible'
    });
  });

  // Loading state tests
  it('displays loading state correctly', () => {
    renderWithTheme(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTitle('Loading')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toHaveStyle({ visibility: 'hidden' });
  });
});