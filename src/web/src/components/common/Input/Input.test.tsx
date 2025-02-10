import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { axe, toHaveNoViolations } from 'jest-axe';
import Input from './Input';
import { InputContainer, StyledInput, InputLabel, ErrorText } from './Input.styles';
import { Theme, ThemeMode } from '../../types/theme.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme for testing
const mockTheme: Theme = {
  mode: ThemeMode.LIGHT,
  colors: {
    primary: '#0078d4',
    secondary: '#2b88d8',
    background: '#ffffff',
    surface: '#f3f2f1',
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

// Helper function to render Input with theme
const renderInput = (props = {}, theme = mockTheme) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <ThemeProvider theme={theme}>
        <Input value="" onChange={() => {}} {...props} />
      </ThemeProvider>
    )
  };
};

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderInput();
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders with label correctly', () => {
      renderInput({ label: 'Test Label' });
      const label = screen.getByText('Test Label');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', expect.any(String));
    });

    it('renders required indicator when required', () => {
      renderInput({ label: 'Test Label', required: true });
      const label = screen.getByText('Test Label');
      expect(within(label).getByText('*')).toBeInTheDocument();
      expect(screen.getByText('required')).toHaveClass('sr-only');
    });

    it('applies disabled styles correctly', () => {
      renderInput({ disabled: true });
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveStyleRule('opacity', '0.6');
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility guidelines', async () => {
      const { container } = renderInput({
        label: 'Test Input',
        ariaLabel: 'Test Input',
        required: true
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('handles keyboard navigation correctly', async () => {
      const { user } = renderInput();
      const input = screen.getByRole('textbox');
      
      await user.tab();
      expect(input).toHaveFocus();
      expect(input).toHaveStyleRule('outline', expect.stringContaining(mockTheme.colors.primary));
    });

    it('announces error messages to screen readers', () => {
      renderInput({ error: 'Error message', touched: true });
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Error message');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('provides appropriate ARIA attributes', () => {
      renderInput({
        label: 'Test Input',
        required: true,
        error: 'Error message',
        ariaDescribedBy: 'helper-text'
      });
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'helper-text');
    });
  });

  describe('Interaction', () => {
    it('handles value changes correctly', async () => {
      const handleChange = jest.fn();
      const { user } = renderInput({ onChange: handleChange });
      
      await user.type(screen.getByRole('textbox'), 'test');
      expect(handleChange).toHaveBeenCalledWith('test');
    });

    it('validates input against pattern', async () => {
      const { user } = renderInput({
        pattern: '^[A-Za-z]+$',
        error: 'Letters only'
      });
      
      const input = screen.getByRole('textbox');
      await user.type(input, '123');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles focus and blur events', async () => {
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      const { user } = renderInput({ onFocus, onBlur });
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      expect(onFocus).toHaveBeenCalled();
      
      await user.tab();
      expect(onBlur).toHaveBeenCalled();
    });

    it('maintains focus states correctly', async () => {
      const { user } = renderInput();
      const input = screen.getByRole('textbox');
      
      await user.click(input);
      expect(input).toHaveStyleRule('outline', expect.stringContaining(mockTheme.colors.primary));
      
      await user.tab();
      expect(input).not.toHaveStyleRule('outline', expect.stringContaining(mockTheme.colors.primary));
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors correctly', () => {
      renderInput();
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveStyleRule('color', mockTheme.colors.text);
      expect(input).toHaveStyleRule('background', mockTheme.colors.background);
    });

    it('supports high contrast mode', () => {
      const highContrastTheme = {
        ...mockTheme,
        mode: ThemeMode.HIGH_CONTRAST
      };
      
      renderInput({}, highContrastTheme);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveStyleRule('border-width', '2px');
      expect(input).toHaveStyleRule('outline-width', '3px', {
        modifier: ':focus'
      });
    });

    it('handles error states with theme colors', () => {
      renderInput({ error: 'Error message', touched: true });
      const errorText = screen.getByRole('alert');
      
      expect(errorText).toHaveStyleRule('color', mockTheme.colors.error);
    });

    it('applies RTL styles correctly', () => {
      const rtlTheme = {
        ...mockTheme,
        direction: 'rtl'
      };
      
      renderInput({}, rtlTheme);
      const container = screen.getByRole('textbox').parentElement;
      expect(container).toHaveStyleRule('direction', 'rtl');
    });
  });
});