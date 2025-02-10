import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Stack, Text, Spinner, MessageBar, MessageBarType, useTheme, TooltipHost } from '@fluentui/react'; // ^8.0.0
import { useVirtual } from 'react-virtual'; // ^2.10.4
import { PreviewContainer, PreviewTable, TableHeader, TableCell } from './DataPreview.styles';
import { IExcelService } from '../../../interfaces/excel.interface';
import type { RangeSelection, ExcelError } from '../../../types/excel.types';

// Constants for accessibility and UI messages
const ARIA_LABELS = {
  table: 'Excel data preview table',
  headerRow: 'Column headers',
  dataRow: (index: number) => `Data row ${index + 1}`,
  cell: (row: number, col: number) => `Cell at row ${row + 1}, column ${col + 1}`,
  loading: 'Loading data preview',
  error: 'Error loading data preview',
  noData: 'No data available in selected range'
};

interface DataPreviewProps {
  excelService: IExcelService;
  selectedRange: RangeSelection | null;
  isLoading?: boolean;
  error?: ExcelError | null;
  virtualizerConfig?: {
    overscan?: number;
    estimateSize?: () => number;
  };
  suggestions?: Array<{
    rowIndex: number;
    columnIndex: number;
    suggestion: string;
    type: 'warning' | 'error' | 'info';
  }>;
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  excelService,
  selectedRange,
  isLoading = false,
  error = null,
  virtualizerConfig = {
    overscan: 5,
    estimateSize: () => 35
  },
  suggestions = []
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Array<Array<unknown>>>([]);
  const [headers, setHeaders] = useState<Array<string>>([]);

  // Initialize virtualizer for rows
  const rowVirtualizer = useVirtual({
    size: data.length,
    parentRef: containerRef,
    overscan: virtualizerConfig.overscan,
    estimateSize: virtualizerConfig.estimateSize
  });

  // Initialize virtualizer for columns
  const columnVirtualizer = useVirtual({
    size: headers.length,
    horizontal: true,
    parentRef: containerRef,
    overscan: virtualizerConfig.overscan,
    estimateSize: virtualizerConfig.estimateSize
  });

  // Process range data when it changes
  useEffect(() => {
    if (selectedRange && selectedRange.values) {
      const [headerRow, ...dataRows] = selectedRange.values;
      setHeaders(headerRow.map(String));
      setData(dataRows);
    } else {
      setHeaders([]);
      setData([]);
    }
  }, [selectedRange]);

  // Get suggestion for cell if exists
  const getCellSuggestion = useCallback((rowIndex: number, colIndex: number) => {
    return suggestions.find(
      s => s.rowIndex === rowIndex && s.columnIndex === colIndex
    );
  }, [suggestions]);

  // Render table headers with virtualization
  const renderHeaders = useMemo(() => {
    return columnVirtualizer.virtualItems.map(column => (
      <TableHeader
        key={column.index}
        style={{
          width: column.size,
          transform: `translateX(${column.start}px)`
        }}
        role="columnheader"
        aria-label={`Column ${headers[column.index]}`}
      >
        {headers[column.index]}
      </TableHeader>
    ));
  }, [columnVirtualizer.virtualItems, headers]);

  // Render table cells with virtualization and suggestions
  const renderCells = useCallback((rowIndex: number) => {
    return columnVirtualizer.virtualItems.map(column => {
      const cellValue = data[rowIndex][column.index];
      const suggestion = getCellSuggestion(rowIndex, column.index);

      return (
        <TooltipHost
          key={`${rowIndex}-${column.index}`}
          content={suggestion?.suggestion}
          hidden={!suggestion}
        >
          <TableCell
            style={{
              width: column.size,
              transform: `translateX(${column.start}px)`
            }}
            role="cell"
            aria-label={ARIA_LABELS.cell(rowIndex, column.index)}
            tabIndex={0}
            selected={!!suggestion}
          >
            {String(cellValue)}
          </TableCell>
        </TooltipHost>
      );
    });
  }, [columnVirtualizer.virtualItems, data, getCellSuggestion]);

  // Render loading state
  if (isLoading) {
    return (
      <Stack horizontalAlign="center" verticalAlign="center" style={{ height: 200 }}>
        <Spinner label={ARIA_LABELS.loading} ariaLabel={ARIA_LABELS.loading} />
      </Stack>
    );
  }

  // Render error state
  if (error) {
    return (
      <MessageBar
        messageBarType={MessageBarType.error}
        aria-label={ARIA_LABELS.error}
      >
        {error.message}
      </MessageBar>
    );
  }

  // Render empty state
  if (!selectedRange || data.length === 0) {
    return (
      <MessageBar
        messageBarType={MessageBarType.info}
        aria-label={ARIA_LABELS.noData}
      >
        {ARIA_LABELS.noData}
      </MessageBar>
    );
  }

  // Render data preview table
  return (
    <PreviewContainer
      ref={containerRef}
      role="region"
      aria-label={ARIA_LABELS.table}
      tabIndex={0}
    >
      <PreviewTable role="table" aria-label={ARIA_LABELS.table}>
        <thead>
          <tr role="row" aria-label={ARIA_LABELS.headerRow}>
            {renderHeaders}
          </tr>
        </thead>
        <tbody>
          {rowVirtualizer.virtualItems.map(virtualRow => (
            <tr
              key={virtualRow.index}
              role="row"
              aria-label={ARIA_LABELS.dataRow(virtualRow.index)}
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {renderCells(virtualRow.index)}
            </tr>
          ))}
        </tbody>
      </PreviewTable>
    </PreviewContainer>
  );
};

export default DataPreview;