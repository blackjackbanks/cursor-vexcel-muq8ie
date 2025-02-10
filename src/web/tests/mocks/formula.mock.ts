/**
 * @fileoverview Mock data and functions for testing formula-related functionality
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { 
    IFormulaRequest, 
    IFormulaSuggestion, 
    IFormulaValidationResult,
    IPerformanceMetrics,
    RequestPriority,
    IFormulaContext,
    IFormulaPreferences,
    ICacheStrategy,
    IRequestTelemetry,
    ISuggestionSource,
    IVersionInfo
} from '../../src/interfaces/formula.interface';
import { FormulaStyle, ComplexityLevel, FormulaErrorType } from '../../src/types/formula.types';

// Constants for mock data configuration
export const DEFAULT_MOCK_FORMULA = '=SUM(A1:A10)';
export const DEFAULT_MOCK_CONFIDENCE = 0.95;
export const DEFAULT_MOCK_EXPLANATION = 'Sums the values in range A1:A10';
export const DEFAULT_RESPONSE_TIME = 1500;
export const DEFAULT_ERROR_RATE = 0.05;
export const MOCK_VERSION = '1.0.0';

// Mock performance metrics
const mockPerformanceMetrics: IPerformanceMetrics = {
    processingTime: 150,
    memoryUsage: 1024,
    apiLatency: 200,
    cacheHitRate: 0.85,
    modelLoadTime: 100,
    totalRequestTime: 450
};

// Mock formula context
const mockFormulaContext: IFormulaContext = {
    selectedRange: {
        address: 'A1:A10',
        values: [['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['10']],
        formulas: [['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['10']],
        numberFormat: [['General'], ['General'], ['General'], ['General'], ['General'], 
                      ['General'], ['General'], ['General'], ['General'], ['General']],
        rowCount: 10,
        columnCount: 1
    },
    workbookContext: {
        sheets: ['Sheet1', 'Sheet2'],
        namedRanges: { 'SalesData': 'Sheet1!A1:A10' },
        customFunctions: []
    },
    environmentContext: {
        locale: 'en-US',
        timeZone: 'UTC',
        platform: 'Windows'
    }
};

// Mock formula preferences
const mockFormulaPreferences: IFormulaPreferences = {
    style: FormulaStyle.MODERN,
    complexityLevel: ComplexityLevel.INTERMEDIATE,
    locale: 'en-US',
    performanceOptimization: {
        enableParallelProcessing: true,
        useGPUAcceleration: false,
        optimizeMemoryUsage: true,
        enablePrecompilation: true
    },
    cachePreferences: {
        maxAge: 3600,
        revalidate: true,
        staleWhileRevalidate: true,
        prefetch: false
    },
    aiModelVersion: 'gpt-4'
};

// Mock cache strategy
const mockCacheStrategy: ICacheStrategy = {
    enabled: true,
    ttl: 3600,
    priority: 1,
    invalidationRules: ['onChange', 'onError']
};

// Mock telemetry data
const mockTelemetry: IRequestTelemetry = {
    requestId: 'mock-req-001',
    timestamp: new Date(),
    userAgent: 'Excel/16.0',
    sessionId: 'mock-session-001',
    performanceMetrics: mockPerformanceMetrics
};

// Mock suggestion source
const mockSuggestionSource: ISuggestionSource = {
    modelVersion: 'gpt-4',
    confidenceScore: DEFAULT_MOCK_CONFIDENCE,
    datasetVersion: '2.0.0',
    generationTimestamp: new Date()
};

// Mock version info
const mockVersionInfo: IVersionInfo = {
    id: 'v1.0.0-mock',
    timestamp: new Date(),
    author: 'AI Assistant',
    changes: ['Initial formula generation']
};

/**
 * Creates a mock formula request with custom parameters
 */
export const createMockFormulaRequest = (
    overrides: Partial<IFormulaRequest> = {},
    performanceConfig: { timeout?: number; priority?: RequestPriority } = {}
): IFormulaRequest => ({
    input: DEFAULT_MOCK_FORMULA,
    context: mockFormulaContext,
    preferences: mockFormulaPreferences,
    timeout: performanceConfig.timeout || 5000,
    priority: performanceConfig.priority || RequestPriority.MEDIUM,
    cacheStrategy: mockCacheStrategy,
    telemetry: mockTelemetry,
    ...overrides
});

/**
 * Creates a mock formula suggestion with performance data
 */
export const createMockFormulaSuggestion = (
    overrides: Partial<IFormulaSuggestion> = {}
): IFormulaSuggestion => ({
    formula: DEFAULT_MOCK_FORMULA,
    confidence: DEFAULT_MOCK_CONFIDENCE,
    explanation: DEFAULT_MOCK_EXPLANATION,
    performance: mockPerformanceMetrics,
    source: mockSuggestionSource,
    version: mockVersionInfo,
    ...overrides
});

/**
 * Creates a mock validation result with enhanced error tracking
 */
export const createMockValidationResult = (
    overrides: Partial<IFormulaValidationResult> = {}
): IFormulaValidationResult => ({
    isValid: true,
    errors: [],
    suggestions: [createMockFormulaSuggestion()],
    performance: mockPerformanceMetrics,
    ...overrides
});

/**
 * Simulates network latency for mock responses
 */
export const simulateNetworkLatency = async (
    minLatency: number = 100,
    maxLatency: number = DEFAULT_RESPONSE_TIME
): Promise<void> => {
    const delay = Math.floor(Math.random() * (maxLatency - minLatency + 1)) + minLatency;
    return new Promise(resolve => setTimeout(resolve, delay));
};

// Mock formula service with Jest functions
export const mockFormulaService = {
    generateFormula: jest.fn().mockImplementation(async (request: IFormulaRequest) => {
        await simulateNetworkLatency();
        return createMockFormulaSuggestion();
    }),

    validateFormulaInput: jest.fn().mockImplementation(async (formula: string) => {
        await simulateNetworkLatency();
        return createMockValidationResult();
    }),

    optimizeFormula: jest.fn().mockImplementation(async (formula: string) => {
        await simulateNetworkLatency();
        return createMockFormulaSuggestion({ 
            formula: formula.replace(/SUM/g, 'SUMIFS'),
            confidence: 0.98
        });
    }),

    applyFormula: jest.fn().mockImplementation(async (formula: string) => {
        await simulateNetworkLatency();
        return { success: true, timestamp: new Date() };
    }),

    getPerformanceMetrics: jest.fn().mockReturnValue(mockPerformanceMetrics)
};

// Export mock data for reuse in tests
export const mockFormulaRequest = createMockFormulaRequest();
export const mockFormulaSuggestions = [createMockFormulaSuggestion()];
export const mockValidationResult = createMockValidationResult();