import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Timeline from './Timeline';
import { Version, VersionResponse, VersionChangeType } from '../../../types/version.types';
import versionReducer from '../../../store/slices/versionSlice';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock version history data
const mockVersions: Version[] = [
  {
    id: '1',
    number: '1.0.0',
    metadata: {
      timestamp: new Date('2024-01-15T10:00:00Z'),
      author: 'John Doe',
      description: 'Initial formula update',
      changeType: VersionChangeType.FORMULA_UPDATE,
      workbookId: 'wb-123',
      worksheetId: 'ws-123'
    },
    changes: [{
      cellReference: 'A1',
      previousValue: '',
      newValue: '=SUM(B1:B10)',
      changeType: VersionChangeType.FORMULA_UPDATE,
      timestamp: new Date('2024-01-15T10:00:00Z'),
      formula: '=SUM(B1:B10)'
    }],
    parentVersionId: null
  },
  {
    id: '2',
    number: '1.0.1',
    metadata: {
      timestamp: new Date('2024-01-15T11:00:00Z'),
      author: 'Jane Smith',
      description: 'Data cleaning operation',
      changeType: VersionChangeType.DATA_CLEANING,
      workbookId: 'wb-123',
      worksheetId: 'ws-123'
    },
    changes: [{
      cellReference: 'B1:B10',
      previousValue: 'raw data',
      newValue: 'cleaned data',
      changeType: VersionChangeType.DATA_CLEANING,
      timestamp: new Date('2024-01-15T11:00:00Z'),
      formula: null
    }],
    parentVersionId: '1'
  }
];

// Test utilities
const renderWithRedux = (
  component: React.ReactElement,
  {
    initialState = {},
    store = configureStore({
      reducer: { version: versionReducer },
      preloadedState: initialState
    })
  } = {}
) => {
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store
  };
};

describe('Timeline Component', () => {
  const mockWorkbookId = 'wb-123';
  const mockOnVersionSelect = jest.fn();
  const mockOnVersionRestore = jest.fn();
  const mockOnVersionCompare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders timeline with version groups correctly', () => {
    renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: mockVersions,
            isLoading: false,
            error: null
          }
        }
      }
    );

    // Verify date groups are rendered
    expect(screen.getByText('January 15, 2024')).toBeInTheDocument();

    // Verify version items
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.1')).toBeInTheDocument();

    // Verify metadata display
    expect(screen.getByText('Initial formula update')).toBeInTheDocument();
    expect(screen.getByText('By John Doe')).toBeInTheDocument();
  });

  it('handles version selection correctly', async () => {
    renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: mockVersions,
            isLoading: false,
            error: null
          }
        }
      }
    );

    // Click view button on first version
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    // Verify selection callback
    expect(mockOnVersionSelect).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('handles version restoration with confirmation', async () => {
    renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: mockVersions,
            isLoading: false,
            error: null
          }
        }
      }
    );

    // Click restore button
    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);

    // Verify restore callback
    expect(mockOnVersionRestore).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: mockVersions,
            isLoading: false,
            error: null
          }
        }
      }
    );

    // Navigate using Tab key
    await user.tab();
    expect(screen.getByText('Version 1.0.0')).toHaveFocus();

    // Activate focused element
    await user.keyboard('{Enter}');
    expect(mockOnVersionSelect).toHaveBeenCalled();
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: mockVersions,
            isLoading: false,
            error: null
          }
        }
      }
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA attributes
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Version history timeline');
    
    // Verify focus indicators
    const timelineItems = screen.getAllByRole('listitem');
    timelineItems.forEach(item => {
      expect(item).toHaveAttribute('tabindex', '0');
    });
  });

  it('handles loading state correctly', () => {
    renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: [],
            isLoading: true,
            error: null
          }
        }
      }
    );

    expect(screen.getByLabelText('Loading version history')).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    const errorMessage = 'Failed to load version history';
    
    renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: [],
            isLoading: false,
            error: errorMessage
          }
        }
      }
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('handles empty version history correctly', () => {
    renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={false}
      />,
      {
        initialState: {
          version: {
            versionHistory: [],
            isLoading: false,
            error: null
          }
        }
      }
    );

    expect(screen.getByText('No version history available.')).toBeInTheDocument();
  });

  it('respects reduced motion preferences', () => {
    const { container } = renderWithRedux(
      <Timeline
        workbookId={mockWorkbookId}
        onVersionSelect={mockOnVersionSelect}
        onVersionRestore={mockOnVersionRestore}
        onVersionCompare={mockOnVersionCompare}
        locale="en-US"
        preferReducedMotion={true}
      />,
      {
        initialState: {
          version: {
            versionHistory: mockVersions,
            isLoading: false,
            error: null
          }
        }
      }
    );

    const timelineContainer = container.querySelector('[data-is-scrollable="true"]');
    expect(timelineContainer).toHaveStyle({ scrollBehavior: 'auto' });
  });
});