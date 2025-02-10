import React, { useEffect, useMemo, useCallback } from 'react';
import { Button, Spinner, MessageBar, MessageBarType, useTheme, IStackTokens } from '@fluentui/react';
import { format, formatDistance } from 'date-fns';
import {
  TimelineContainer,
  TimelineGroup,
  TimelineGroupHeader,
  TimelineItem,
  TimelineConnector,
  TimelineItemContent,
  TimelineItemTime,
  TimelineItemActions
} from './Timeline.styles';
import { Version, VersionChangeType } from '../../../types/version.types';
import { useVersion } from '../../../hooks/useVersion';

interface TimelineProps {
  workbookId: string;
  onVersionSelect: (version: Version) => void;
  onVersionRestore: (version: Version) => void;
  onVersionCompare: (version1: Version, version2: Version) => void;
  locale: string;
  preferReducedMotion: boolean;
}

/**
 * Groups version history entries by date with memoization for performance
 * @param versions Array of version entries to group
 * @returns Map of dates to version arrays
 */
const groupVersionsByDate = (versions: Version[]): Map<string, Version[]> => {
  return useMemo(() => {
    const groups = new Map<string, Version[]>();
    
    if (!versions.length) return groups;

    versions.sort((a, b) => 
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    );

    versions.forEach(version => {
      const date = format(new Date(version.metadata.timestamp), 'yyyy-MM-dd');
      const group = groups.get(date) || [];
      group.push(version);
      groups.set(date, group);
    });

    return groups;
  }, [versions]);
};

/**
 * Returns appropriate icon and accessibility label based on version change type
 * @param changeType Type of version change
 * @returns Icon name and accessibility label
 */
const getChangeTypeIcon = (changeType: VersionChangeType): { icon: string; label: string } => {
  switch (changeType) {
    case VersionChangeType.FORMULA_UPDATE:
      return { icon: 'Calculator', label: 'Formula update' };
    case VersionChangeType.DATA_CLEANING:
      return { icon: 'Broom', label: 'Data cleaning' };
    case VersionChangeType.CELL_MODIFICATION:
      return { icon: 'Edit', label: 'Cell modification' };
    case VersionChangeType.SHEET_STRUCTURE:
      return { icon: 'Table', label: 'Sheet structure change' };
    default:
      return { icon: 'History', label: 'Version change' };
  }
};

export const Timeline: React.FC<TimelineProps> = ({
  workbookId,
  onVersionSelect,
  onVersionRestore,
  onVersionCompare,
  locale,
  preferReducedMotion
}) => {
  const theme = useTheme();
  const { versionHistory, isLoading, error, restoreVersion } = useVersion(workbookId);
  const groupedVersions = groupVersionsByDate(versionHistory);

  // Stack tokens for consistent spacing
  const stackTokens: IStackTokens = {
    childrenGap: theme.spacing.m
  };

  // Handle version restore with confirmation
  const handleRestore = useCallback(async (version: Version) => {
    try {
      await restoreVersion(version.id);
      onVersionRestore(version);
    } catch (error) {
      console.error('Error restoring version:', error);
    }
  }, [restoreVersion, onVersionRestore]);

  // Render loading state
  if (isLoading) {
    return (
      <TimelineContainer>
        <Spinner label="Loading version history..." ariaLabel="Loading version history" />
      </TimelineContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <TimelineContainer>
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={true}
          dismissButtonAriaLabel="Close"
        >
          {error}
        </MessageBar>
      </TimelineContainer>
    );
  }

  // Render empty state
  if (!versionHistory.length) {
    return (
      <TimelineContainer>
        <MessageBar messageBarType={MessageBarType.info}>
          No version history available.
        </MessageBar>
      </TimelineContainer>
    );
  }

  return (
    <TimelineContainer
      role="region"
      aria-label="Version history timeline"
      data-is-scrollable="true"
      style={{ 
        scrollBehavior: preferReducedMotion ? 'auto' : 'smooth' 
      }}
    >
      {Array.from(groupedVersions.entries()).map(([date, versions]) => (
        <TimelineGroup key={date}>
          <TimelineGroupHeader>
            {format(new Date(date), 'MMMM d, yyyy', { locale })}
          </TimelineGroupHeader>
          
          {versions.map((version, index) => {
            const { icon, label } = getChangeTypeIcon(version.metadata.changeType);
            const timeAgo = formatDistance(
              new Date(version.metadata.timestamp),
              new Date(),
              { addSuffix: true, locale }
            );

            return (
              <TimelineItem
                key={version.id}
                role="listitem"
                aria-label={`Version ${version.number} - ${label}`}
                tabIndex={0}
              >
                <TimelineConnector />
                <TimelineItemContent>
                  <TimelineItemTime aria-label={`Created ${timeAgo}`}>
                    {timeAgo}
                  </TimelineItemTime>
                  
                  <div>
                    <strong>Version {version.number}</strong>
                    <p>{version.metadata.description}</p>
                    <small>By {version.metadata.author}</small>
                  </div>

                  <TimelineItemActions>
                    <Button
                      iconProps={{ iconName: 'Preview' }}
                      onClick={() => onVersionSelect(version)}
                      aria-label={`View version ${version.number}`}
                    >
                      View
                    </Button>
                    <Button
                      iconProps={{ iconName: 'Restore' }}
                      onClick={() => handleRestore(version)}
                      aria-label={`Restore to version ${version.number}`}
                    >
                      Restore
                    </Button>
                    {index < versions.length - 1 && (
                      <Button
                        iconProps={{ iconName: 'Compare' }}
                        onClick={() => onVersionCompare(version, versions[index + 1])}
                        aria-label={`Compare with previous version`}
                      >
                        Compare
                      </Button>
                    )}
                  </TimelineItemActions>
                </TimelineItemContent>
              </TimelineItem>
            );
          })}
        </TimelineGroup>
      ))}
    </TimelineContainer>
  );
};

export default Timeline;