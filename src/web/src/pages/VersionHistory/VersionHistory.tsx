import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Stack,
  MessageBar,
  MessageBarType,
  Spinner,
  Text,
  FocusZone,
  KeytipData
} from '@fluentui/react';
import Timeline from '../../components/version/Timeline/Timeline';
import ChangeDetails from '../../components/version/ChangeDetails/ChangeDetails';
import RestorePanel from '../../components/version/RestorePanel/RestorePanel';
import { useVersion } from '../../hooks/useVersion';
import { Version, VersionChange } from '../../types/version.types';

interface VersionHistoryState {
  selectedVersion: Version | null;
  versionToRestore: Version | null;
  isRestorePanelOpen: boolean;
  expandedChangeIds: Set<string>;
  focusedElementId: string | null;
  loadingStates: Map<string, boolean>;
  errorStates: Map<string, string | null>;
}

/**
 * VersionHistory Component
 * Displays and manages version history with enhanced accessibility and performance
 */
const VersionHistory: React.FC = () => {
  // State management
  const [state, setState] = useState<VersionHistoryState>({
    selectedVersion: null,
    versionToRestore: null,
    isRestorePanelOpen: false,
    expandedChangeIds: new Set(),
    focusedElementId: null,
    loadingStates: new Map(),
    errorStates: new Map()
  });

  // Custom hook for version control
  const {
    versionHistory,
    isLoading,
    error,
    fetchHistory,
    clearError
  } = useVersion();

  // Initialize version history on mount
  useEffect(() => {
    fetchHistory();
    return () => {
      clearError();
    };
  }, [fetchHistory, clearError]);

  // Memoized version selection handler
  const handleVersionSelect = useCallback((version: Version) => {
    setState(prevState => ({
      ...prevState,
      selectedVersion: version,
      expandedChangeIds: new Set(),
      focusedElementId: `version-${version.id}`
    }));

    // Announce selection to screen readers
    const announcement = `Selected version ${version.number} from ${new Date(version.metadata.timestamp).toLocaleString()}`;
    window.requestAnimationFrame(() => {
      const announcer = document.getElementById('version-announcer');
      if (announcer) {
        announcer.textContent = announcement;
      }
    });
  }, []);

  // Memoized version restore handler
  const handleVersionRestore = useCallback((version: Version) => {
    setState(prevState => ({
      ...prevState,
      versionToRestore: version,
      isRestorePanelOpen: true
    }));
  }, []);

  // Memoized restore panel close handler
  const handleRestorePanelClose = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      versionToRestore: null,
      isRestorePanelOpen: false
    }));
  }, []);

  // Memoized change details expansion handler
  const handleChangeExpand = useCallback((changeId: string) => {
    setState(prevState => {
      const newExpandedIds = new Set(prevState.expandedChangeIds);
      if (newExpandedIds.has(changeId)) {
        newExpandedIds.delete(changeId);
      } else {
        newExpandedIds.add(changeId);
      }
      return {
        ...prevState,
        expandedChangeIds: newExpandedIds
      };
    });
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <Stack tokens={{ padding: 20 }}>
        <Spinner label="Loading version history..." />
      </Stack>
    );
  }

  // Render error state
  if (error) {
    return (
      <Stack tokens={{ padding: 20 }}>
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={true}
          onDismiss={clearError}
          dismissButtonAriaLabel="Close error message"
        >
          {error}
        </MessageBar>
      </Stack>
    );
  }

  return (
    <FocusZone>
      <Stack tokens={{ padding: 20 }} style={{ height: '100vh' }}>
        {/* Accessibility announcement region */}
        <div
          id="version-announcer"
          role="status"
          aria-live="polite"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
        />

        {/* Version history header */}
        <Stack.Item>
          <Text variant="xLarge" block>
            Version History
          </Text>
          <Text variant="medium" block styles={{ root: { marginBottom: 16 } }}>
            View, compare, and restore previous versions of your workbook
          </Text>
        </Stack.Item>

        {/* Timeline component */}
        <Stack.Item grow>
          <KeytipData keytipProps={{ content: 'Select version', keySequences: ['VH'] }}>
            {(keytipAttributes: any) => (
              <Timeline
                workbookId={versionHistory[0]?.metadata.workbookId || ''}
                onVersionSelect={handleVersionSelect}
                onVersionRestore={handleVersionRestore}
                {...keytipAttributes}
              />
            )}
          </KeytipData>
        </Stack.Item>

        {/* Selected version details */}
        {state.selectedVersion && (
          <Stack.Item>
            {state.selectedVersion.changes.map((change: VersionChange) => (
              <ChangeDetails
                key={`${change.cellReference}-${change.timestamp}`}
                change={change}
                isExpanded={state.expandedChangeIds.has(change.cellReference)}
                onToggleExpand={() => handleChangeExpand(change.cellReference)}
              />
            ))}
          </Stack.Item>
        )}

        {/* Restore panel */}
        {state.versionToRestore && (
          <RestorePanel
            isOpen={state.isRestorePanelOpen}
            onClose={handleRestorePanelClose}
            version={state.versionToRestore}
          />
        )}
      </Stack>
    </FocusZone>
  );
};

export default VersionHistory;