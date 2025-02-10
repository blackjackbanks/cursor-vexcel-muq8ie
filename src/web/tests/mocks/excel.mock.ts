/**
 * @fileoverview Mock implementations for Excel-related interfaces and services
 * @version 1.0.0
 * @package jest@29.0.0
 */

import { jest } from 'jest';
import {
    IExcelService,
    IExcelEventHandler,
    ITaskPaneManager,
    DEFAULT_TASK_PANE_WIDTH,
    MIN_TASK_PANE_WIDTH,
    MAX_TASK_PANE_WIDTH
} from '../../src/interfaces/excel.interface';
import {
    WorkbookState,
    RangeSelection,
    ExcelError,
    TaskPaneConfig,
    ExcelEventType
} from '../../src/types/excel.types';

/**
 * Default mock state values
 */
export const mockWorkbookState: Readonly<WorkbookState> = {
    isLoading: false,
    activeSheet: null,
    selectedRange: null,
    error: null,
    lastSync: new Date()
};

export const mockRangeSelection: Readonly<RangeSelection> = {
    address: 'A1:B2',
    values: [['Value1', 'Value2'], ['Value3', 'Value4']],
    formulas: [['=SUM(1,1)', '=AVERAGE(A1:A2)'], ['', '']],
    numberFormat: [['General', 'General'], ['General', 'General']],
    rowCount: 2,
    columnCount: 2
};

/**
 * Options for configuring mock service behavior
 */
interface MockServiceOptions {
    simulateErrors?: boolean;
    initialState?: Partial<WorkbookState>;
    apiVersion?: string;
}

interface MockEventOptions {
    enableEventChaining?: boolean;
    trackHistory?: boolean;
}

/**
 * Manages state for mock implementations with proper isolation
 */
export class MockStateManager {
    private stateStore = new Map<string, any>();
    private cleanupHandlers = new Set<Function>();

    setState<T>(key: string, value: T): void {
        this.stateStore.set(key, value);
    }

    getState<T>(key: string): T {
        return this.stateStore.get(key) as T;
    }

    addCleanupHandler(handler: Function): void {
        this.cleanupHandlers.add(handler);
    }

    cleanup(): void {
        this.cleanupHandlers.forEach(handler => handler());
        this.stateStore.clear();
        this.cleanupHandlers.clear();
    }
}

export const mockStateManager = new MockStateManager();

/**
 * Creates a fully typed mock implementation of IExcelService
 */
export function createMockExcelService(options: MockServiceOptions = {}): jest.Mocked<IExcelService> {
    const state = {
        ...mockWorkbookState,
        ...options.initialState
    };

    const service = {
        initialize: jest.fn().mockImplementation(async () => {
            if (options.simulateErrors) {
                throw { code: 'INIT_ERROR', message: 'Initialization failed' };
            }
            mockStateManager.setState('initialized', true);
        }),

        getSelectedRange: jest.fn().mockImplementation(async () => {
            return mockStateManager.getState('selectedRange') || mockRangeSelection;
        }),

        getCurrentWorkbook: jest.fn().mockImplementation(async () => {
            return mockStateManager.getState('workbookState') || state;
        }),

        handleSelectionChange: jest.fn().mockImplementation(async (range) => {
            mockStateManager.setState('selectedRange', range);
        }),

        setTaskPanePosition: jest.fn().mockImplementation(async (width, position) => {
            mockStateManager.setState('taskPaneConfig', { width, position });
        }),

        handleError: jest.fn().mockImplementation(async (error: ExcelError) => {
            mockStateManager.setState('lastError', error);
        }),

        validateApiVersion: jest.fn().mockImplementation(async () => {
            return !options.simulateErrors;
        })
    };

    return service as jest.Mocked<IExcelService>;
}

/**
 * Creates a mock implementation of IExcelEventHandler with event chaining
 */
export function createMockEventHandler(options: MockEventOptions = {}): jest.Mocked<IExcelEventHandler> {
    const eventHistory: Array<{ type: string; payload: any }> = [];

    const handler = {
        onSelectionChanged: jest.fn().mockImplementation((range: RangeSelection) => {
            if (options.trackHistory) {
                eventHistory.push({ type: 'SelectionChanged', payload: range });
            }
        }),

        onSheetActivated: jest.fn().mockImplementation((worksheet) => {
            if (options.trackHistory) {
                eventHistory.push({ type: 'SheetActivated', payload: worksheet });
            }
        }),

        onWorkbookChanged: jest.fn().mockImplementation((state: WorkbookState) => {
            if (options.trackHistory) {
                eventHistory.push({ type: 'WorkbookChanged', payload: state });
            }
        }),

        onError: jest.fn().mockImplementation((error: ExcelError) => {
            if (options.trackHistory) {
                eventHistory.push({ type: 'Error', payload: error });
            }
        }),

        onEventTypeChange: jest.fn().mockImplementation((eventType: ExcelEventType) => {
            if (options.trackHistory) {
                eventHistory.push({ type: 'EventTypeChange', payload: eventType });
            }
        }),

        getEventHistory: () => [...eventHistory]
    };

    return handler as jest.Mocked<IExcelEventHandler>;
}

/**
 * Creates a mock implementation of ITaskPaneManager with validation
 */
export function createMockTaskPaneManager(config: Partial<TaskPaneConfig> = {}): jest.Mocked<ITaskPaneManager> {
    const defaultConfig: TaskPaneConfig = {
        width: DEFAULT_TASK_PANE_WIDTH,
        minWidth: MIN_TASK_PANE_WIDTH,
        maxWidth: MAX_TASK_PANE_WIDTH,
        position: 'right',
        isCollapsed: false,
        visibility: 'visible'
    };

    let currentConfig: TaskPaneConfig = {
        ...defaultConfig,
        ...config
    };

    const manager = {
        getConfig: jest.fn().mockImplementation(() => currentConfig),

        setWidth: jest.fn().mockImplementation((width: number) => {
            if (width >= MIN_TASK_PANE_WIDTH && width <= MAX_TASK_PANE_WIDTH) {
                currentConfig = { ...currentConfig, width };
            }
        }),

        setPosition: jest.fn().mockImplementation((position: 'left' | 'right') => {
            currentConfig = { ...currentConfig, position };
        }),

        collapse: jest.fn().mockImplementation(() => {
            currentConfig = {
                ...currentConfig,
                isCollapsed: true,
                width: MIN_TASK_PANE_WIDTH,
                visibility: 'collapsed'
            };
        }),

        expand: jest.fn().mockImplementation(() => {
            currentConfig = {
                ...currentConfig,
                isCollapsed: false,
                width: DEFAULT_TASK_PANE_WIDTH,
                visibility: 'visible'
            };
        }),

        validateConfig: jest.fn().mockImplementation((config: TaskPaneConfig) => {
            return config.width >= MIN_TASK_PANE_WIDTH &&
                   config.width <= MAX_TASK_PANE_WIDTH &&
                   ['left', 'right'].includes(config.position);
        })
    };

    return manager as jest.Mocked<ITaskPaneManager>;
}

// Cleanup utility for tests
export function cleanupMocks(): void {
    mockStateManager.cleanup();
    jest.clearAllMocks();
}