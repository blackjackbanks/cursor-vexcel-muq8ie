/**
 * @fileoverview Integration tests for data cleaning functionality in Excel Add-in
 * @version 1.0.0
 * @package jest@^29.0.0
 * @package @microsoft/office-js@^1.1.0
 */

import { ExcelService } from '../../src/services/excel.service';
import { apiService } from '../../src/services/api.service';
import { PERFORMANCE_THRESHOLDS } from '../../src/constants/excel.constants';
import { ERROR_CODES, API_ENDPOINTS } from '../../src/constants/api.constants';

// Mock implementations
jest.mock('../../src/services/excel.service');
jest.mock('../../src/services/api.service');

// Test constants
const TEST_TIMEOUT = 10000;
const PERFORMANCE_THRESHOLD = 5000; // 5s per 1000 rows

describe('Data Cleaning Integration Tests', () => {
    let excelService: ExcelService;
    let mockContext: any;
    let mockData: any[][];

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Initialize mock data
        mockData = Array(1000).fill(null).map(() => [
            Math.random().toString(),
            Math.random() < 0.1 ? null : 'value',
            Math.random() < 0.2 ? 'invalid' : '2023-01-01',
            Math.random() < 0.15 ? '' : '100.00'
        ]);

        // Mock Excel.run
        (global as any).Excel = {
            run: jest.fn().mockImplementation((callback) => callback(mockContext))
        };

        // Initialize services with mocks
        excelService = new ExcelService(
            { onError: jest.fn() } as any,
            { setWidth: jest.fn(), setPosition: jest.fn() } as any,
            { startOperation: jest.fn(), endOperation: jest.fn() } as any
        );

        // Mock context
        mockContext = {
            sync: jest.fn().mockResolvedValue(undefined),
            workbook: {
                worksheets: {
                    getActiveWorksheet: jest.fn().mockReturnValue({
                        getRange: jest.fn().mockReturnValue({
                            values: mockData,
                            load: jest.fn(),
                            format: jest.fn()
                        })
                    })
                }
            }
        };
    });

    test('should detect and clean duplicate rows', async () => {
        // Arrange
        const startTime = Date.now();
        const mockRange = {
            values: [...mockData, ...mockData.slice(0, 100)], // Add duplicates
            rowCount: 1100,
            columnCount: 4,
            address: 'A1:D1100'
        };

        jest.spyOn(excelService, 'getSelectedRange').mockResolvedValue(mockRange);
        jest.spyOn(apiService, 'post').mockResolvedValue({
            duplicatesRemoved: 100,
            processedRows: 1100,
            performance: { duration: 2000 }
        });

        // Act
        const response = await apiService.post(
            API_ENDPOINTS.DATA.CLEAN,
            { range: mockRange, options: { removeDuplicates: true } }
        );

        // Assert
        expect(response.duplicatesRemoved).toBe(100);
        expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
        expect(apiService.post).toHaveBeenCalledWith(
            API_ENDPOINTS.DATA.CLEAN,
            expect.any(Object)
        );
    }, TEST_TIMEOUT);

    test('should handle missing values', async () => {
        // Arrange
        const startTime = Date.now();
        const mockRange = {
            values: mockData,
            rowCount: 1000,
            columnCount: 4,
            address: 'A1:D1000'
        };

        jest.spyOn(excelService, 'getSelectedRange').mockResolvedValue(mockRange);
        jest.spyOn(apiService, 'post').mockResolvedValue({
            filledValues: 100,
            processedRows: 1000,
            performance: { duration: 1500 }
        });

        // Act
        const response = await apiService.post(
            API_ENDPOINTS.DATA.CLEAN,
            {
                range: mockRange,
                options: {
                    fillMissingValues: true,
                    fillMethod: 'interpolation'
                }
            }
        );

        // Assert
        expect(response.filledValues).toBeGreaterThan(0);
        expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
        expect(apiService.post).toHaveBeenCalledWith(
            API_ENDPOINTS.DATA.CLEAN,
            expect.any(Object)
        );
    }, TEST_TIMEOUT);

    test('should standardize data formats', async () => {
        // Arrange
        const startTime = Date.now();
        const mockRange = {
            values: mockData,
            rowCount: 1000,
            columnCount: 4,
            address: 'A1:D1000'
        };

        jest.spyOn(excelService, 'getSelectedRange').mockResolvedValue(mockRange);
        jest.spyOn(apiService, 'post').mockResolvedValue({
            standardizedCells: 150,
            processedRows: 1000,
            performance: { duration: 1800 }
        });

        // Act
        const response = await apiService.post(
            API_ENDPOINTS.DATA.CLEAN,
            {
                range: mockRange,
                options: {
                    standardizeFormats: true,
                    formatRules: {
                        dates: 'yyyy-MM-dd',
                        numbers: '#,##0.00'
                    }
                }
            }
        );

        // Assert
        expect(response.standardizedCells).toBeGreaterThan(0);
        expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
        expect(apiService.post).toHaveBeenCalledWith(
            API_ENDPOINTS.DATA.CLEAN,
            expect.any(Object)
        );
    }, TEST_TIMEOUT);

    test('should handle rate limits and errors', async () => {
        // Arrange
        const mockRange = {
            values: mockData,
            rowCount: 1000,
            columnCount: 4,
            address: 'A1:D1000'
        };

        jest.spyOn(excelService, 'getSelectedRange').mockResolvedValue(mockRange);
        jest.spyOn(apiService, 'post')
            .mockRejectedValueOnce({ code: ERROR_CODES.RATE_LIMIT_ERROR })
            .mockResolvedValueOnce({
                processedRows: 1000,
                performance: { duration: 2000 }
            });

        // Act & Assert
        await expect(apiService.post(
            API_ENDPOINTS.DATA.CLEAN,
            { range: mockRange }
        )).rejects.toMatchObject({
            code: ERROR_CODES.RATE_LIMIT_ERROR
        });

        // Verify retry mechanism
        const response = await apiService.post(
            API_ENDPOINTS.DATA.CLEAN,
            { range: mockRange }
        );
        expect(response.processedRows).toBe(1000);
        expect(apiService.post).toHaveBeenCalledTimes(2);
    }, TEST_TIMEOUT);

    test('should validate data before cleaning', async () => {
        // Arrange
        const mockRange = {
            values: mockData,
            rowCount: 1000,
            columnCount: 4,
            address: 'A1:D1000'
        };

        jest.spyOn(excelService, 'getSelectedRange').mockResolvedValue(mockRange);
        jest.spyOn(apiService, 'post').mockResolvedValue({
            isValid: true,
            validationResults: {
                dateFormat: true,
                numberFormat: true,
                missingValues: false
            }
        });

        // Act
        const response = await apiService.post(
            API_ENDPOINTS.DATA.VALIDATE,
            { range: mockRange }
        );

        // Assert
        expect(response.isValid).toBe(true);
        expect(response.validationResults).toHaveProperty('dateFormat');
        expect(apiService.post).toHaveBeenCalledWith(
            API_ENDPOINTS.DATA.VALIDATE,
            expect.any(Object)
        );
    }, TEST_TIMEOUT);
});