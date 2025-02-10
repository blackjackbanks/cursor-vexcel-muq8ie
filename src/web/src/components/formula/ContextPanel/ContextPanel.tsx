/**
 * @fileoverview Context Panel component for displaying Excel formula environment information
 * Implements Microsoft's Fluent Design System with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 * @package @fluentui/react@8.0.0
 */

import React, { FC, memo, useMemo, useCallback, useEffect } from 'react';
import { Stack, Text, Label, useTheme, IStackTokens } from '@fluentui/react';
import {
    ContextPanelContainer,
    SectionContainer,
    SectionLabel,
    SectionContent,
    MetadataContainer
} from './ContextPanel.styles';
import {
    IFormulaContext,
    IFormulaPreferences,
    IPerformanceMetrics
} from '../../../interfaces/formula.interface';
import { useExcel } from '../../../hooks/useExcel';
import { PERFORMANCE_THRESHOLDS } from '../../../constants/excel.constants';

// Stack tokens for consistent spacing
const stackTokens: IStackTokens = {
    childrenGap: 8,
    padding: 12
};

interface IContextPanelProps {
    context: IFormulaContext;
    preferences: IFormulaPreferences;
    className?: string;
}

/**
 * Formats range address for accessibility and display
 */
const formatRangeAddress = (address: string, sanitize: boolean = true): string => {
    if (!address) return '';
    const formatted = sanitize ? address.replace(/[^A-Za-z0-9:$]/g, '') : address;
    return formatted.toUpperCase();
};

/**
 * Generates context summary with performance metrics
 */
const getContextSummary = (
    context: IFormulaContext,
    metrics: IPerformanceMetrics
): string => {
    const { selectedRange, workbookContext, environmentContext } = context;
    return `Range ${selectedRange.address} selected. ` +
           `${selectedRange.rowCount} rows × ${selectedRange.columnCount} columns. ` +
           `Processing time: ${metrics.processingTime}ms`;
};

/**
 * Context Panel component displaying formula environment information
 * with enhanced accessibility and performance optimization
 */
export const ContextPanel: FC<IContextPanelProps> = memo(({
    context,
    preferences,
    className
}) => {
    const theme = useTheme();
    const { workbookState, performance } = useExcel();

    // Memoized context summary for performance
    const contextSummary = useMemo(() => 
        getContextSummary(context, performance),
        [context, performance]
    );

    // Memoized performance warning check
    const showPerformanceWarning = useMemo(() => 
        performance.processingTime > PERFORMANCE_THRESHOLDS.SYNC_INTERVAL_MS,
        [performance.processingTime]
    );

    // Handle range selection updates
    const handleRangeUpdate = useCallback(() => {
        if (context.selectedRange) {
            // Implement any additional range update logic
        }
    }, [context.selectedRange]);

    useEffect(() => {
        handleRangeUpdate();
    }, [handleRangeUpdate]);

    return (
        <ContextPanelContainer
            className={className}
            theme={theme}
            role="complementary"
            aria-label="Formula Context Panel"
        >
            <Stack tokens={stackTokens}>
                {/* Range Selection Section */}
                <SectionContainer theme={theme}>
                    <SectionLabel theme={theme}>
                        Selected Range
                    </SectionLabel>
                    <SectionContent
                        theme={theme}
                        role="region"
                        aria-label="Range Selection Details"
                    >
                        <Text>
                            {formatRangeAddress(context.selectedRange.address)}
                        </Text>
                        <MetadataContainer theme={theme}>
                            <Text>
                                Rows: {context.selectedRange.rowCount}
                            </Text>
                            <Text>
                                Columns: {context.selectedRange.columnCount}
                            </Text>
                        </MetadataContainer>
                    </SectionContent>
                </SectionContainer>

                {/* Workbook Context Section */}
                <SectionContainer theme={theme}>
                    <SectionLabel theme={theme}>
                        Workbook Context
                    </SectionLabel>
                    <SectionContent
                        theme={theme}
                        role="region"
                        aria-label="Workbook Context Details"
                    >
                        <Stack tokens={{ childrenGap: 4 }}>
                            <Label>Available Sheets</Label>
                            <Text>
                                {context.workbookContext.sheets.join(', ')}
                            </Text>
                            <Label>Named Ranges</Label>
                            <Text>
                                {Object.keys(context.workbookContext.namedRanges).join(', ') || 'None'}
                            </Text>
                        </Stack>
                    </SectionContent>
                </SectionContainer>

                {/* Formula Preferences Section */}
                <SectionContainer theme={theme}>
                    <SectionLabel theme={theme}>
                        Formula Preferences
                    </SectionLabel>
                    <SectionContent
                        theme={theme}
                        role="region"
                        aria-label="Formula Preferences Details"
                    >
                        <Stack tokens={{ childrenGap: 4 }}>
                            <Text>
                                Style: {preferences.style}
                            </Text>
                            <Text>
                                Complexity: {preferences.complexityLevel}
                            </Text>
                            <Text>
                                Locale: {preferences.locale}
                            </Text>
                        </Stack>
                    </SectionContent>
                </SectionContainer>

                {/* Performance Metrics Section */}
                <SectionContainer theme={theme}>
                    <SectionLabel theme={theme}>
                        Performance Metrics
                    </SectionLabel>
                    <SectionContent
                        theme={theme}
                        role="region"
                        aria-label="Performance Metrics Details"
                    >
                        <MetadataContainer theme={theme}>
                            <Text>
                                Processing Time: {performance.processingTime}ms
                            </Text>
                            <Text>
                                Cache Hit Rate: {performance.cacheHitRate}%
                            </Text>
                            {showPerformanceWarning && (
                                <Text
                                    role="alert"
                                    style={{ color: theme.palette.redDark }}
                                >
                                    Performance threshold exceeded
                                </Text>
                            )}
                        </MetadataContainer>
                    </SectionContent>
                </SectionContainer>
            </Stack>
        </ContextPanelContainer>
    );
});

ContextPanel.displayName = 'ContextPanel';

export default ContextPanel;