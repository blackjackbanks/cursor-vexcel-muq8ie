import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import VersionHistory from './VersionHistory';
import { MockVersionService, createMockVersion } from '../../../tests/mocks/version.mock';
import { VersionChangeType } from '../../types/version.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock hooks
jest.mock('../../hooks/useVersion');
jest.mock('../../hooks/useExcel');
jest.mock('../../hooks/useAccessibility');

// Mock services
const mockVersionService = new MockVersionService();

// Helper function to render component with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const store = configureStore({
    reducer: {
      version: (state = {
        currentVersion: null,
        versionHistory: [],
        isLoading: false,
        error: null
      }) => state
    },
    ...options
  });

  return {
    ...render(
      <Provider store={store}>
        {ui}
      </Provider>
    ),
    store
  };
};

describe('VersionHistory Component', () => {
  let mockVersionHistory;
  let user;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock version history
    mockVersionHistory = [
      createMockVersion(VersionChangeType.FORMULA_UPDATE, 'Initial version', null),
      createMockVersion(VersionChangeType.DATA_CLEANING, 'Data cleanup', null),
      createMockVersion(VersionChangeType.CELL_MODIFICATION, 'Cell updates', null)
    ];

    // Initialize user event
    user = userEvent.setup();

    // Mock useVersion hook
    const mockUseVersion = jest.requireMock('../../hooks/useVersion');
    mockUseVersion.useVersion.mockImplementation(() => ({
      versionHistory: mockVersionHistory,
      isLoading: false,
      error: null,
      fetchHistory: jest.fn(),
      clearError: jest.fn(),
      restoreVersion: jest.fn()
    }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('renders loading state correctly', async () => {
    const mockUseVersion = jest.requireMock('../../hooks/useVersion');
    mockUseVersion.useVersion.mockImplementation(() => ({
      versionHistory: [],
      isLoading: true,
      error: null,
      fetchHistory: jest.fn()
    }));

    renderWithProviders(<VersionHistory />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading version history/i)).toBeInTheDocument();
  });

  test('renders error state with retry option', async () => {
    const mockError = 'Failed to load version history';
    const mockClearError = jest.fn();
    const mockUseVersion = jest.requireMock('../../hooks/useVersion');
    mockUseVersion.useVersion.mockImplementation(() => ({
      versionHistory: [],
      isLoading: false,
      error: mockError,
      clearError: mockClearError,
      fetchHistory: jest.fn()
    }));

    renderWithProviders(<VersionHistory />);

    expect(screen.getByText(mockError)).toBeInTheDocument();
    const dismissButton = screen.getByLabelText(/close error message/i);
    await user.click(dismissButton);
    expect(mockClearError).toHaveBeenCalled();
  });

  test('displays version history timeline correctly', async () => {
    renderWithProviders(<VersionHistory />);

    // Verify timeline is rendered
    const timeline = screen.getByRole('region', { name: /version history timeline/i });
    expect(timeline).toBeInTheDocument();

    // Verify version entries
    mockVersionHistory.forEach(version => {
      const versionEntry = screen.getByText(`Version ${version.number}`);
      expect(versionEntry).toBeInTheDocument();
    });
  });

  test('handles version selection correctly', async () => {
    renderWithProviders(<VersionHistory />);

    const firstVersion = mockVersionHistory[0];
    const versionButton = screen.getByRole('button', { name: new RegExp(`view version ${firstVersion.number}`, 'i') });
    
    await user.click(versionButton);

    // Verify change details are displayed
    firstVersion.changes.forEach(change => {
      const changeDetails = screen.getByText(new RegExp(change.cellReference, 'i'));
      expect(changeDetails).toBeInTheDocument();
    });
  });

  test('handles version restoration flow', async () => {
    const mockRestoreVersion = jest.fn();
    const mockUseVersion = jest.requireMock('../../hooks/useVersion');
    mockUseVersion.useVersion.mockImplementation(() => ({
      versionHistory: mockVersionHistory,
      isLoading: false,
      error: null,
      restoreVersion: mockRestoreVersion
    }));

    renderWithProviders(<VersionHistory />);

    const firstVersion = mockVersionHistory[0];
    const restoreButton = screen.getByRole('button', { name: new RegExp(`restore to version ${firstVersion.number}`, 'i') });
    
    await user.click(restoreButton);

    // Verify restore panel is displayed
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/restore version/i)).toBeInTheDocument();

    // Confirm restoration
    const confirmButton = screen.getByRole('button', { name: /restore version/i });
    await user.click(confirmButton);

    expect(mockRestoreVersion).toHaveBeenCalledWith(firstVersion.id);
  });

  test('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(<VersionHistory />);

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const firstInteractiveElement = screen.getByRole('button', { name: /view version/i });
    firstInteractiveElement.focus();
    expect(document.activeElement).toBe(firstInteractiveElement);

    // Test keyboard interaction
    await user.keyboard('{Tab}');
    expect(document.activeElement).not.toBe(firstInteractiveElement);
  });

  test('handles keyboard navigation correctly', async () => {
    renderWithProviders(<VersionHistory />);

    // Focus first version
    const versionButtons = screen.getAllByRole('button', { name: /view version/i });
    versionButtons[0].focus();

    // Test keyboard selection
    await user.keyboard('{Enter}');
    expect(screen.getByRole('article')).toBeInTheDocument();

    // Test escape key for dialogs
    const restoreButton = screen.getByRole('button', { name: /restore to version/i });
    await user.click(restoreButton);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('handles change details expansion correctly', async () => {
    renderWithProviders(<VersionHistory />);

    // Select a version
    const firstVersion = mockVersionHistory[0];
    const versionButton = screen.getByRole('button', { name: new RegExp(`view version ${firstVersion.number}`, 'i') });
    await user.click(versionButton);

    // Expand change details
    const changeDetails = screen.getAllByRole('article')[0];
    const expandButton = within(changeDetails).getByRole('button');
    await user.click(expandButton);

    // Verify expanded content
    expect(screen.getByText(firstVersion.changes[0].formula || '')).toBeInTheDocument();
  });

  test('handles empty version history', async () => {
    const mockUseVersion = jest.requireMock('../../hooks/useVersion');
    mockUseVersion.useVersion.mockImplementation(() => ({
      versionHistory: [],
      isLoading: false,
      error: null,
      fetchHistory: jest.fn()
    }));

    renderWithProviders(<VersionHistory />);

    expect(screen.getByText(/no version history available/i)).toBeInTheDocument();
  });
});