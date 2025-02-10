import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { RestorePanel } from './RestorePanel';
import { createMockVersion, MockVersionService } from '../../../tests/mocks/version.mock';
import { useVersion } from '../../../hooks/useVersion';
import { VersionChangeType } from '../../../types/version.types';
import { ThemeProvider } from 'styled-components';
import { defaultTheme } from '../../../theme';

// Mock useVersion hook
jest.mock('../../../hooks/useVersion', () => ({
  useVersion: jest.fn()
}));

// Mock window.confirm
const mockConfirm = jest.fn(() => true);
window.confirm = mockConfirm;

// Helper function to render RestorePanel with theme provider
const renderRestorePanel = (props = {}) => {
  const mockVersion = createMockVersion(
    VersionChangeType.FORMULA_UPDATE,
    'Test version',
    null
  );

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    version: mockVersion,
    onRestore: jest.fn()
  };

  return render(
    <ThemeProvider theme={defaultTheme}>
      <RestorePanel {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('RestorePanel Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (useVersion as jest.Mock).mockReturnValue({
      restoreVersion: jest.fn(),
      isLoading: false,
      error: null
    });
  });

  describe('Rendering', () => {
    it('renders correctly when open with version details', () => {
      const mockVersion = createMockVersion(
        VersionChangeType.FORMULA_UPDATE,
        'Test description',
        null
      );
      
      renderRestorePanel({ version: mockVersion });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Version \d+\.\d+\.\d+/)).toBeInTheDocument();
      expect(screen.getByText(/Test description/)).toBeInTheDocument();
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/Author:/)).toBeInTheDocument();
    });

    it('maintains hidden state when isOpen is false', () => {
      renderRestorePanel({ isOpen: false });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({ transform: 'translateX(100%)' });
    });

    it('displays loading state during version restoration', async () => {
      (useVersion as jest.Mock).mockReturnValue({
        restoreVersion: jest.fn(),
        isLoading: true,
        error: null
      });

      renderRestorePanel();
      
      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });
      expect(restoreButton).toBeDisabled();
      expect(restoreButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Version Restoration', () => {
    it('successfully restores version and shows confirmation', async () => {
      const mockRestore = jest.fn().mockResolvedValue(undefined);
      const mockOnClose = jest.fn();

      renderRestorePanel({
        onRestore: mockRestore,
        onClose: mockOnClose
      });

      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });
      await userEvent.click(restoreButton);

      await waitFor(() => {
        expect(mockRestore).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('handles restoration errors with proper messaging', async () => {
      const mockError = 'Failed to restore version';
      (useVersion as jest.Mock).mockReturnValue({
        restoreVersion: jest.fn().mockRejectedValue(new Error(mockError)),
        isLoading: false,
        error: mockError
      });

      renderRestorePanel();

      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });
      await userEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(mockError);
      });
    });
  });

  describe('Accessibility', () => {
    it('maintains proper focus management', async () => {
      renderRestorePanel();

      const closeButton = screen.getByRole('button', { name: /Close restore panel/i });
      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });

      // Initial focus should be on close button
      expect(closeButton).toHaveFocus();

      // Tab navigation
      await userEvent.tab();
      expect(restoreButton).toHaveFocus();

      // Focus trap
      await userEvent.tab();
      expect(closeButton).toHaveFocus();
    });

    it('provides correct ARIA attributes', () => {
      renderRestorePanel();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'restore-panel-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'restore-panel-description');
    });

    it('announces status changes to screen readers', async () => {
      const { rerender } = renderRestorePanel();

      (useVersion as jest.Mock).mockReturnValue({
        restoreVersion: jest.fn(),
        isLoading: true,
        error: null
      });

      rerender(
        <ThemeProvider theme={defaultTheme}>
          <RestorePanel
            isOpen={true}
            onClose={jest.fn()}
            version={createMockVersion(VersionChangeType.FORMULA_UPDATE, 'Test', null)}
          />
        </ThemeProvider>
      );

      const loadingAlert = screen.getByRole('alert');
      expect(loadingAlert).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays network error messages', async () => {
      const networkError = 'Network error occurred';
      (useVersion as jest.Mock).mockReturnValue({
        restoreVersion: jest.fn().mockRejectedValue(new Error(networkError)),
        isLoading: false,
        error: networkError
      });

      renderRestorePanel();

      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });
      await userEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(networkError);
      });
    });

    it('handles version conflict errors', async () => {
      const conflictError = 'Version conflict detected';
      (useVersion as jest.Mock).mockReturnValue({
        restoreVersion: jest.fn().mockRejectedValue(new Error(conflictError)),
        isLoading: false,
        error: conflictError
      });

      renderRestorePanel();

      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });
      await userEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(conflictError);
      });
    });

    it('shows validation error messages', () => {
      const mockVersion = createMockVersion(
        VersionChangeType.FORMULA_UPDATE,
        '',  // Empty description to trigger validation
        null
      );

      renderRestorePanel({ version: mockVersion });
      
      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });
      expect(restoreButton).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('handles close button click', async () => {
      const onClose = jest.fn();
      renderRestorePanel({ onClose });

      const closeButton = screen.getByRole('button', { name: /Close restore panel/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('handles escape key press', async () => {
      const onClose = jest.fn();
      renderRestorePanel({ onClose });

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('prompts for confirmation when closing with unsaved changes', async () => {
      const onClose = jest.fn();
      renderRestorePanel({ onClose });

      // Simulate unsaved changes
      const restoreButton = screen.getByRole('button', { name: /Restore Version/i });
      await userEvent.click(restoreButton);

      const closeButton = screen.getByRole('button', { name: /Close restore panel/i });
      await userEvent.click(closeButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});