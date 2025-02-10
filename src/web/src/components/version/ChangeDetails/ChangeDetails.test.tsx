import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import ChangeDetails from './ChangeDetails';
import { VersionChangeType } from '../../../types/version.types';
import { defaultTheme } from '../../../theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Helper function to render component with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={defaultTheme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock performance measurement
const measurePerformance = async (callback: () => void): Promise<number> => {
  const start = performance.now();
  await callback();
  return performance.now() - start;
};

describe('ChangeDetails Component', () => {
  // Mock data setup
  const mockChange = {
    changeType: VersionChangeType.FORMULA_UPDATE,
    cellReference: 'Sheet1!A1',
    previousValue: '=SUM(A1:A10)',
    newValue: '=SUM(A1:A20)',
    timestamp: '2023-01-01T12:00:00Z',
    formula: '=SUM(A1:A20)',
    metadata: {
      author: 'Test User',
      description: 'Updated sum range'
    }
  };

  // Basic rendering tests
  describe('Rendering', () => {
    it('renders change details correctly', () => {
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={false}
          onToggleExpand={() => {}}
          ariaLabel="Test change details"
        />
      );

      expect(screen.getByText('Formula Update')).toBeInTheDocument();
      expect(screen.getByLabelText('Test change details')).toBeInTheDocument();
    });

    it('displays expanded content when isExpanded is true', () => {
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={true}
          onToggleExpand={() => {}}
        />
      );

      expect(screen.getByText('Cell Reference')).toBeInTheDocument();
      expect(screen.getByText('Sheet1!A1')).toBeInTheDocument();
      expect(screen.getByText(/2023-01-01/)).toBeInTheDocument();
    });

    it('renders diff visualization correctly', () => {
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={true}
          onToggleExpand={() => {}}
        />
      );

      expect(screen.getByText(`- ${mockChange.previousValue}`)).toBeInTheDocument();
      expect(screen.getByText(`+ ${mockChange.newValue}`)).toBeInTheDocument();
      expect(screen.getByText(mockChange.formula)).toBeInTheDocument();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA standards', async () => {
      const { container } = renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={true}
          onToggleExpand={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      const onToggleMock = jest.fn();
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={false}
          onToggleExpand={onToggleMock}
        />
      );

      const expandButton = screen.getByRole('button');
      expandButton.focus();
      fireEvent.keyPress(expandButton, { key: 'Enter', code: 'Enter' });
      expect(onToggleMock).toHaveBeenCalledWith(true);

      fireEvent.keyPress(expandButton, { key: ' ', code: 'Space' });
      expect(onToggleMock).toHaveBeenCalledWith(true);
    });

    it('provides proper ARIA labels and roles', () => {
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={true}
          onToggleExpand={() => {}}
        />
      );

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Change comparison' })).toBeInTheDocument();
    });

    it('supports high contrast mode', () => {
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={true}
          onToggleExpand={() => {}}
          highContrastMode={true}
        />
      );

      const diffSection = screen.getByRole('region', { name: 'Change comparison' });
      expect(diffSection).toHaveStyle({ background: 'transparent' });
    });
  });

  // Interaction tests
  describe('User Interactions', () => {
    it('toggles expansion on button click', () => {
      const onToggleMock = jest.fn();
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={false}
          onToggleExpand={onToggleMock}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onToggleMock).toHaveBeenCalledWith(true);
    });

    it('focuses content when expanded', async () => {
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={true}
          onToggleExpand={() => {}}
        />
      );

      const content = screen.getByRole('region', { name: 'Change comparison' });
      await waitFor(() => {
        expect(content).toHaveFocus();
      });
    });
  });

  // Performance tests
  describe('Performance', () => {
    it('renders within performance SLA (3 seconds)', async () => {
      const renderTime = await measurePerformance(() => {
        renderWithTheme(
          <ChangeDetails
            change={mockChange}
            isExpanded={true}
            onToggleExpand={() => {}}
          />
        );
      });

      expect(renderTime).toBeLessThan(3000);
    });

    it('handles interaction within performance SLA', async () => {
      const onToggleMock = jest.fn();
      renderWithTheme(
        <ChangeDetails
          change={mockChange}
          isExpanded={false}
          onToggleExpand={onToggleMock}
        />
      );

      const interactionTime = await measurePerformance(() => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(interactionTime).toBeLessThan(100);
    });
  });

  // Error handling tests
  describe('Error Handling', () => {
    it('handles missing previous value gracefully', () => {
      const changeWithoutPrevious = {
        ...mockChange,
        previousValue: undefined
      };

      renderWithTheme(
        <ChangeDetails
          change={changeWithoutPrevious}
          isExpanded={true}
          onToggleExpand={() => {}}
        />
      );

      expect(screen.getByText('(empty)')).toBeInTheDocument();
    });

    it('handles missing formula gracefully', () => {
      const changeWithoutFormula = {
        ...mockChange,
        formula: undefined
      };

      renderWithTheme(
        <ChangeDetails
          change={changeWithoutFormula}
          isExpanded={true}
          onToggleExpand={() => {}}
        />
      );

      const formulaElement = screen.queryByLabelText('Formula');
      expect(formulaElement).not.toBeInTheDocument();
    });
  });
});