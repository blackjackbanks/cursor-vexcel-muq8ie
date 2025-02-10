/**
 * @fileoverview Enterprise-grade test environment configuration for Excel Add-in
 * @version 1.0.0
 * @package jest@29.0.0
 * @package @testing-library/jest-dom@5.16.5
 * @package @microsoft/office-js-helpers@1.0.2
 */

import { jest } from 'jest';
import '@testing-library/jest-dom';
import { OfficeHelpers } from '@microsoft/office-js-helpers';
import {
  createMockExcelService,
  mockWorkbookState,
  mockStateManager,
  createMockEventHandler,
  createMockTaskPaneManager,
  cleanupMocks
} from './mocks/excel.mock';
import type { ExcelServiceInterface } from '../../src/interfaces/excel.interface';

/**
 * Configure Jest environment with enhanced error reporting and custom matchers
 */
const setupJestDom = (): void => {
  // Extend Jest matchers for DOM testing
  expect.extend({
    toHaveExcelRange(received: any, expected: string) {
      const pass = received?.address === expected;
      return {
        message: () => `expected ${received?.address} to be ${expected}`,
        pass,
      };
    },
    toBeValidTaskPaneWidth(received: number) {
      const pass = received >= 50 && received <= 800;
      return {
        message: () => `expected ${received} to be between 50 and 800 pixels`,
        pass,
      };
    },
  });

  // Configure console for test environment
  const originalConsole = { ...console };
  global.console = {
    ...console,
    error: jest.fn((...args) => {
      originalConsole.error(...args);
    }),
    warn: jest.fn((...args) => {
      originalConsole.warn(...args);
    }),
  };
};

/**
 * Configure comprehensive mock Office.js environment
 */
const setupMockOffice = (): void => {
  // Initialize base Office mock
  const mockOffice = {
    context: {
      requirements: {
        isSetSupported: jest.fn().mockReturnValue(true),
      },
    },
    initialize: jest.fn().mockResolvedValue(undefined),
  };

  // Initialize Excel-specific mocks
  const mockExcel = {
    run: jest.fn().mockImplementation(async (callback) => {
      const context = {
        workbook: {
          worksheets: {
            getActiveWorksheet: jest.fn().mockResolvedValue({
              name: 'Sheet1',
              id: '1',
            }),
          },
        },
        sync: jest.fn().mockResolvedValue(undefined),
      };
      return callback(context);
    }),
  };

  // Set up global Office object
  global.Office = {
    ...mockOffice,
    Excel: mockExcel,
  };

  // Initialize Excel service mock
  const mockExcelService = createMockExcelService({
    simulateErrors: false,
    initialState: mockWorkbookState,
    apiVersion: '1.1',
  });

  // Initialize event handler mock
  const mockEventHandler = createMockEventHandler({
    enableEventChaining: true,
    trackHistory: true,
  });

  // Initialize task pane manager mock
  const mockTaskPane = createMockTaskPaneManager({
    width: 350,
    position: 'right',
  });

  // Store mocks in state manager for access during tests
  mockStateManager.setState('excelService', mockExcelService);
  mockStateManager.setState('eventHandler', mockEventHandler);
  mockStateManager.setState('taskPane', mockTaskPane);
};

/**
 * Configure mock storage with comprehensive error simulation
 */
const setupMockStorage = (): void => {
  let mockStorage: { [key: string]: string } = {};

  // Implement localStorage mock
  const mockLocalStorage = {
    getItem: jest.fn((key: string): string | null => {
      return mockStorage[key] || null;
    }),
    setItem: jest.fn((key: string, value: string): void => {
      mockStorage[key] = value.toString();
    }),
    removeItem: jest.fn((key: string): void => {
      delete mockStorage[key];
    }),
    clear: jest.fn((): void => {
      mockStorage = {};
    }),
    length: jest.fn((): number => {
      return Object.keys(mockStorage).length;
    }),
    key: jest.fn((index: number): string | null => {
      return Object.keys(mockStorage)[index] || null;
    }),
  };

  // Implement sessionStorage mock with same interface
  const mockSessionStorage = { ...mockLocalStorage };

  // Set up global storage objects
  global.localStorage = mockLocalStorage;
  global.sessionStorage = mockSessionStorage;

  // Add storage cleanup to state manager
  mockStateManager.addCleanupHandler(() => {
    mockStorage = {};
  });
};

/**
 * Configure global test environment
 */
beforeAll(() => {
  setupJestDom();
  setupMockOffice();
  setupMockStorage();
});

/**
 * Clean up test environment after each test
 */
afterEach(() => {
  cleanupMocks();
});

/**
 * Final cleanup after all tests
 */
afterAll(() => {
  mockStateManager.cleanup();
  jest.resetModules();
});

// Export mock configurations for test files
export const jestMockConfigurations = {
  Office: global.Office,
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
};