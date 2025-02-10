import React, { useState, useCallback, useEffect } from 'react';
import { Dismiss24Regular } from '@fluentui/react-icons'; // ^1.1.0
import {
  RestorePanelContainer,
  RestoreHeader,
  RestoreContent,
  RestoreActions,
  VersionInfo
} from './RestorePanel.styles';
import { Button } from '../../common/Button/Button';
import { useVersion } from '../../../hooks/useVersion';
import { Version } from '../../../types/version.types';
import { hasPermission } from '../../../utils/auth.utils';
import { AUTH_PERMISSIONS } from '../../../constants/auth.constants';

// Animation durations for smooth transitions
const ANIMATION_DURATION_MS = 300;
const ERROR_DISPLAY_DURATION_MS = 5000;

interface RestorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  version: Version;
  onRestore?: (versionId: string) => Promise<void>;
}

export const RestorePanel: React.FC<RestorePanelProps> = ({
  isOpen,
  onClose,
  version,
  onRestore
}) => {
  // Local state management
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Custom hook for version control
  const {
    restoreVersion,
    isLoading: isVersionLoading,
    error: versionError
  } = useVersion(version.metadata.workbookId);

  // Clear error after timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (error) {
      timeoutId = setTimeout(() => {
        setError(null);
      }, ERROR_DISPLAY_DURATION_MS);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [error]);

  // Handle escape key for accessibility
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.addEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Handle version restoration with error handling
  const handleRestore = useCallback(async () => {
    try {
      setIsRestoring(true);
      setError(null);

      // Check permissions
      if (!hasPermission({ role: 'POWER_USER' }, AUTH_PERMISSIONS.VERSION_HISTORY.WRITE)) {
        throw new Error('Insufficient permissions to restore version');
      }

      // Call provided onRestore callback or use default restoration
      if (onRestore) {
        await onRestore(version.id);
      } else {
        await restoreVersion(version.id);
      }

      // Close panel after successful restoration
      setTimeout(() => {
        onClose();
      }, ANIMATION_DURATION_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  }, [version.id, onRestore, restoreVersion, onClose]);

  // Handle panel close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  return (
    <RestorePanelContainer
      isOpen={isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-panel-title"
      aria-describedby="restore-panel-description"
    >
      <RestoreHeader>
        <h2 id="restore-panel-title">Restore Version</h2>
        <Button
          variant="text"
          icon={<Dismiss24Regular />}
          onClick={handleClose}
          aria-label="Close restore panel"
        />
      </RestoreHeader>

      <RestoreContent id="restore-panel-description">
        <VersionInfo hasChanges={version.changes.length > 0}>
          <h3>Version {version.number}</h3>
          <p>Created: {new Date(version.metadata.timestamp).toLocaleString()}</p>
          <p>Author: {version.metadata.author}</p>
          <p>Changes: {version.changes.length}</p>
          <p>Description: {version.metadata.description}</p>
        </VersionInfo>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{ color: 'var(--error-color)', marginBottom: '1rem' }}
          >
            {error}
          </div>
        )}

        {versionError && (
          <div
            role="alert"
            aria-live="polite"
            style={{ color: 'var(--error-color)', marginBottom: '1rem' }}
          >
            {versionError}
          </div>
        )}
      </RestoreContent>

      <RestoreActions>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isRestoring}
          aria-label="Cancel version restoration"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleRestore}
          loading={isRestoring || isVersionLoading}
          disabled={isRestoring || isVersionLoading}
          aria-label="Restore to selected version"
        >
          Restore Version
        </Button>
      </RestoreActions>
    </RestorePanelContainer>
  );
};

export default RestorePanel;