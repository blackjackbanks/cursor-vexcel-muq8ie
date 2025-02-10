import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useId } from 'react';
import { Checkbox, PrimaryButton, ProgressIndicator } from '@fluentui/react'; // ^8.0.0
import { useAriaAnnouncer } from '@fluentui/react-hooks'; // ^8.0.0

import {
  ActionPanelContainer,
  ActionHeader,
  ActionList,
  ActionItem,
  ActionButton,
  ProgressBar,
  ProgressText,
  ErrorMessage
} from './ActionPanel.styles';

export interface DataCleaningAction {
  id: string;
  label: string;
  description: string;
}

export interface ActionPanelProps {
  actions: DataCleaningAction[];
  onActionSelect?: (selectedActions: string[]) => void;
  onApplyActions?: () => Promise<void>;
  ariaLabel?: string;
  initialSelectedActions?: string[];
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  actions,
  onActionSelect,
  onApplyActions,
  ariaLabel = 'Data Cleaning Actions',
  initialSelectedActions = []
}) => {
  // Generate unique IDs for accessibility
  const panelId = useId('action-panel');
  const headerId = useId('action-header');
  const progressId = useId('progress');

  // State management
  const [selectedActions, setSelectedActions] = useState<string[]>(initialSelectedActions);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus management
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFocusedActionRef = useRef<HTMLElement | null>(null);

  // Screen reader announcements
  const { announceMessage } = useAriaAnnouncer();

  // Reset progress when processing completes
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
    }
  }, [isProcessing]);

  // Handle action selection with accessibility
  const handleActionSelect = useCallback((actionId: string, isChecked: boolean) => {
    setSelectedActions(prev => {
      const newSelected = isChecked
        ? [...prev, actionId]
        : prev.filter(id => id !== actionId);

      // Announce selection change to screen readers
      const action = actions.find(a => a.id === actionId);
      announceMessage(
        `${action?.label} ${isChecked ? 'selected' : 'unselected'}. ` +
        `${newSelected.length} actions selected total.`
      );

      // Notify parent component if callback provided
      onActionSelect?.(newSelected);
      return newSelected;
    });
  }, [actions, onActionSelect, announceMessage]);

  // Handle applying selected actions with progress tracking
  const handleApplyActions = async () => {
    if (selectedActions.length === 0) {
      announceMessage('No actions selected. Please select at least one action.');
      setError('Please select at least one action to proceed.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      announceMessage('Starting data cleaning process.');

      // Store last focused element for focus restoration
      lastFocusedActionRef.current = document.activeElement as HTMLElement;

      // Simulate progress updates (replace with actual progress tracking)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + 10, 100);
          if (newProgress === 100) {
            clearInterval(progressInterval);
          }
          return newProgress;
        });
      }, 500);

      // Execute cleaning actions
      await onApplyActions?.();

      announceMessage('Data cleaning process completed successfully.');
    } catch (err) {
      setError('An error occurred while processing actions. Please try again.');
      announceMessage('Error occurred during data cleaning process.');
    } finally {
      setIsProcessing(false);
      
      // Restore focus after processing
      if (lastFocusedActionRef.current) {
        lastFocusedActionRef.current.focus();
      }
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isProcessing) {
      setIsProcessing(false);
      announceMessage('Data cleaning process cancelled.');
    }
  };

  return (
    <ActionPanelContainer
      ref={containerRef}
      role="region"
      aria-labelledby={headerId}
      id={panelId}
      onKeyDown={handleKeyDown}
    >
      <ActionHeader id={headerId}>
        {ariaLabel}
      </ActionHeader>

      <ActionList role="list" aria-label="Available cleaning actions">
        {actions.map(action => (
          <ActionItem
            key={action.id}
            role="listitem"
          >
            <Checkbox
              label={action.label}
              checked={selectedActions.includes(action.id)}
              onChange={(_, checked) => handleActionSelect(action.id, !!checked)}
              disabled={isProcessing}
              aria-describedby={`${action.id}-description`}
            />
            <span
              id={`${action.id}-description`}
              className="sr-only"
            >
              {action.description}
            </span>
          </ActionItem>
        ))}
      </ActionList>

      {error && (
        <ErrorMessage role="alert" aria-live="polite">
          {error}
        </ErrorMessage>
      )}

      {isProcessing && (
        <div role="status" aria-labelledby={progressId}>
          <ProgressBar progress={progress} />
          <ProgressText id={progressId}>
            Processing: {progress}%
          </ProgressText>
        </div>
      )}

      <PrimaryButton
        onClick={handleApplyActions}
        disabled={isProcessing || selectedActions.length === 0}
        aria-busy={isProcessing}
        aria-label={
          isProcessing
            ? 'Processing selected actions'
            : 'Apply selected cleaning actions'
        }
      >
        {isProcessing ? 'Processing...' : 'Apply Actions'}
      </PrimaryButton>
    </ActionPanelContainer>
  );
};

export default ActionPanel;