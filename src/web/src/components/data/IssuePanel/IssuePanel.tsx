/**
 * @fileoverview A React component that displays data quality issues detected in Excel ranges
 * with severity-based categorization, interactive issue handling, and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { FC, useEffect, useState, useCallback, useMemo, useRef } from 'react'; // @version 18.2.0
import { Icon, useTheme, ITheme } from '@fluentui/react'; // @version 8.0.0
import { debounce } from 'lodash'; // @version 4.17.21
import {
    IssuePanelContainer,
    IssueHeader,
    IssueList,
    IssueItem,
    IssueIcon,
    VirtualizedList
} from './IssuePanel.styles';
import { useExcel } from '../../../hooks/useExcel';

// Type definitions
type IssueSeverity = 'error' | 'warning' | 'info';

interface DataIssue {
    id: string;
    type: string;
    severity: IssueSeverity;
    message: string;
    range: string;
    affectedCells: number;
    suggestedAction?: string;
    details?: string;
}

interface IssuePanelProps {
    issues: DataIssue[];
    onIssueSelect?: (issue: DataIssue) => void;
    className?: string;
    ariaLabel?: string;
    virtualizeList?: boolean;
}

/**
 * IssuePanel component for displaying data quality issues with accessibility support
 * and performance optimizations for large datasets
 */
export const IssuePanel: FC<IssuePanelProps> = ({
    issues,
    onIssueSelect,
    className,
    ariaLabel = 'Data Quality Issues Panel',
    virtualizeList = true
}) => {
    const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();
    const { getSelectedRange, highlightRange } = useExcel();

    // Memoize sorted issues by severity
    const sortedIssues = useMemo(() => {
        const severityOrder: Record<IssueSeverity, number> = {
            error: 0,
            warning: 1,
            info: 2
        };
        return [...issues].sort((a, b) => 
            severityOrder[a.severity] - severityOrder[b.severity]
        );
    }, [issues]);

    // Group issues by severity for screen readers
    const issueGroups = useMemo(() => {
        return sortedIssues.reduce((groups, issue) => {
            const group = groups[issue.severity] || [];
            group.push(issue);
            groups[issue.severity] = group;
            return groups;
        }, {} as Record<IssueSeverity, DataIssue[]>);
    }, [sortedIssues]);

    /**
     * Debounced handler for issue selection and range highlighting
     */
    const handleIssueClick = useCallback(
        debounce(async (issue: DataIssue, event: React.MouseEvent) => {
            event.preventDefault();
            if (isProcessing) return;

            try {
                setIsProcessing(true);
                setSelectedIssue(issue.id);

                // Highlight affected range in Excel
                await highlightRange(issue.range);

                // Notify parent component
                onIssueSelect?.(issue);

                // Update ARIA live region
                const liveRegion = document.getElementById('issue-live-region');
                if (liveRegion) {
                    liveRegion.textContent = `Selected issue: ${issue.message}. Affected range: ${issue.range}`;
                }
            } catch (error) {
                console.error('Error handling issue selection:', error);
            } finally {
                setIsProcessing(false);
            }
        }, 300),
        [highlightRange, onIssueSelect, isProcessing]
    );

    /**
     * Keyboard navigation handler for accessibility
     */
    const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
        const { key } = event;
        const currentIndex = sortedIssues.findIndex(
            issue => issue.id === selectedIssue
        );

        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                if (currentIndex < sortedIssues.length - 1) {
                    setSelectedIssue(sortedIssues[currentIndex + 1].id);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (currentIndex > 0) {
                    setSelectedIssue(sortedIssues[currentIndex - 1].id);
                }
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (selectedIssue) {
                    const issue = sortedIssues.find(i => i.id === selectedIssue);
                    if (issue) {
                        handleIssueClick(issue, event as any);
                    }
                }
                break;
        }
    }, [sortedIssues, selectedIssue, handleIssueClick]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            handleIssueClick.cancel();
        };
    }, [handleIssueClick]);

    /**
     * Render issue item with proper ARIA attributes
     */
    const renderIssueItem = useCallback((issue: DataIssue) => (
        <IssueItem
            key={issue.id}
            severity={issue.severity}
            onClick={(e) => handleIssueClick(issue, e)}
            onKeyDown={handleKeyboardNavigation}
            tabIndex={0}
            role="button"
            aria-selected={selectedIssue === issue.id}
            aria-label={`${issue.severity} issue: ${issue.message}`}
        >
            <IssueIcon severity={issue.severity} size="medium">
                <Icon
                    iconName={
                        issue.severity === 'error' ? 'ErrorBadge' :
                        issue.severity === 'warning' ? 'Warning' : 'Info'
                    }
                    aria-hidden="true"
                />
            </IssueIcon>
            <div>
                <div>{issue.message}</div>
                <div aria-label={`Affects ${issue.affectedCells} cells in range ${issue.range}`}>
                    {`${issue.affectedCells} cells in ${issue.range}`}
                </div>
                {issue.suggestedAction && (
                    <div aria-label={`Suggested action: ${issue.suggestedAction}`}>
                        {issue.suggestedAction}
                    </div>
                )}
            </div>
        </IssueItem>
    ), [selectedIssue, handleIssueClick, handleKeyboardNavigation]);

    return (
        <IssuePanelContainer
            className={className}
            role="region"
            aria-label={ariaLabel}
        >
            <IssueHeader>
                <h2>Data Quality Issues</h2>
                <div aria-live="polite" id="issue-live-region" className="sr-only" />
            </IssueHeader>

            <IssueList
                ref={listRef}
                role="list"
                aria-label="List of data quality issues"
            >
                {Object.entries(issueGroups).map(([severity, groupIssues]) => (
                    <div key={severity} role="group" aria-label={`${severity} issues`}>
                        {virtualizeList ? (
                            <VirtualizedList
                                items={groupIssues}
                                renderItem={renderIssueItem}
                                itemHeight={80}
                                overscan={5}
                            />
                        ) : (
                            groupIssues.map(renderIssueItem)
                        )}
                    </div>
                ))}
            </IssueList>
        </IssuePanelContainer>
    );
};

export type { DataIssue, IssueSeverity, IssuePanelProps };