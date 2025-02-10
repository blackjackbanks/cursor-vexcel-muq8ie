/**
 * ChangeDetails Component
 * Displays detailed information about version changes with enhanced accessibility support
 * @version 1.0.0
 */

import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { Stack, Text, IconButton, useTheme, IStackTokens } from '@fluentui/react';
import {
  ChangeDetailsContainer,
  ChangeHeader,
  ChangeContent,
  ChangeMetadata,
  ChangeDiff
} from './ChangeDetails.styles';
import {
  IVersionCompareResult,
  VersionChange,
  VersionChangeType
} from '../../../interfaces/version.interface';
import { useVersion } from '../../../hooks/useVersion';

// Stack tokens for consistent spacing
const stackTokens: IStackTokens = {
  childrenGap: 8,
  padding: 16
};

// Interface for component props with accessibility properties
interface ChangeDetailsProps {
  change: VersionChange;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  ariaLabel?: string;
  highContrastMode?: boolean;
}

/**
 * ChangeDetails Component
 * Displays detailed version change information with accessibility support
 */
const ChangeDetails: React.FC<ChangeDetailsProps> = ({
  change,
  isExpanded,
  onToggleExpand,
  ariaLabel,
  highContrastMode = false
}) => {
  const theme = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const { compareVersions } = useVersion();

  // Memoized change type icon and color mapping
  const changeTypeDetails = useMemo(() => {
    const types = {
      [VersionChangeType.FORMULA_UPDATE]: {
        icon: '📝',
        label: 'Formula Update',
        color: theme.palette.green
      },
      [VersionChangeType.DATA_CLEANING]: {
        icon: '🧹',
        label: 'Data Cleaning',
        color: theme.palette.blue
      },
      [VersionChangeType.CELL_MODIFICATION]: {
        icon: '✏️',
        label: 'Cell Modification',
        color: theme.palette.orange
      },
      [VersionChangeType.SHEET_STRUCTURE]: {
        icon: '📊',
        label: 'Sheet Structure',
        color: theme.palette.purple
      }
    };
    return types[change.changeType];
  }, [change.changeType, theme]);

  // Memoized diff computation for performance
  const diffDetails = useMemo(() => {
    if (!change.previousValue && !change.newValue) return null;

    return {
      previous: change.previousValue || '(empty)',
      current: change.newValue || '(empty)',
      hasFormula: !!change.formula
    };
  }, [change.previousValue, change.newValue, change.formula]);

  // Handle keyboard navigation
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleExpand(!isExpanded);
    }
  }, [isExpanded, onToggleExpand]);

  // Focus management
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isExpanded]);

  // Render change type indicator with accessibility
  const renderChangeType = () => (
    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
      <Text
        as="span"
        role="img"
        aria-label={changeTypeDetails.label}
        style={{ fontSize: '20px' }}
      >
        {changeTypeDetails.icon}
      </Text>
      <Text
        variant="mediumPlus"
        styles={{
          root: {
            color: highContrastMode ? theme.palette.black : changeTypeDetails.color,
            fontWeight: 600
          }
        }}
      >
        {changeTypeDetails.label}
      </Text>
    </Stack>
  );

  // Render diff visualization with accessibility
  const renderDiff = () => {
    if (!diffDetails) return null;

    return (
      <ChangeDiff
        changeType={change.previousValue ? 'modified' : 'added'}
        role="region"
        aria-label="Change comparison"
      >
        <Stack tokens={{ childrenGap: 8 }}>
          {diffDetails.previous !== '(empty)' && (
            <Text
              block
              variant="small"
              aria-label="Previous value"
              styles={{
                root: {
                  color: highContrastMode ? theme.palette.black : theme.palette.neutralSecondary
                }
              }}
            >
              - {diffDetails.previous}
            </Text>
          )}
          <Text
            block
            variant="small"
            aria-label="New value"
            styles={{
              root: {
                color: highContrastMode ? theme.palette.black : theme.palette.neutralPrimary
              }
            }}
          >
            + {diffDetails.current}
          </Text>
          {diffDetails.hasFormula && (
            <Text
              block
              variant="small"
              aria-label="Formula"
              styles={{
                root: {
                  fontFamily: 'Consolas, monospace',
                  backgroundColor: highContrastMode ? 'transparent' : theme.palette.neutralLighter,
                  padding: 4
                }
              }}
            >
              {change.formula}
            </Text>
          )}
        </Stack>
      </ChangeDiff>
    );
  };

  return (
    <ChangeDetailsContainer
      role="article"
      aria-label={ariaLabel || `Change details for ${change.cellReference}`}
      aria-expanded={isExpanded}
    >
      <ChangeHeader>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center" tokens={stackTokens}>
          {renderChangeType()}
          <IconButton
            iconProps={{ iconName: isExpanded ? 'ChevronUp' : 'ChevronDown' }}
            onClick={() => onToggleExpand(!isExpanded)}
            onKeyPress={handleKeyPress}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} change details`}
            aria-expanded={isExpanded}
          />
        </Stack>
      </ChangeHeader>

      {isExpanded && (
        <ChangeContent ref={contentRef} tabIndex={0}>
          <ChangeMetadata role="contentinfo">
            <dl>
              <dt>Cell Reference</dt>
              <dd>{change.cellReference}</dd>
              <dt>Timestamp</dt>
              <dd>{new Date(change.timestamp).toLocaleString()}</dd>
            </dl>
          </ChangeMetadata>
          {renderDiff()}
        </ChangeContent>
      )}
    </ChangeDetailsContainer>
  );
};

export default ChangeDetails;