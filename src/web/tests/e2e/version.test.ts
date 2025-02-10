/**
 * End-to-end tests for version control functionality in Excel Add-in
 * Implements comprehensive test coverage for version history, change tracking,
 * rollback capabilities, and performance validation
 * @version 1.0.0
 */

import { VersionService } from '../../src/services/version.service';
import {
    Version,
    VersionChangeType,
    VersionComparisonResult
} from '../../src/types/version.types';
import {
    MockVersionService,
    createMockVersion,
    createMockVersionResponse,
    simulateNetworkDelay
} from '../mocks/version.mock';
import '@testing-library/jest-dom';
import '@microsoft/office-js-helpers';

// Constants for performance testing
const PERFORMANCE_SLA_MS = 2000; // 2-second SLA requirement
const TEST_TIMEOUT = 5000;
const WORKBOOK_ID = 'test-workbook-123';

describe('Version Control E2E Tests', () => {
    let versionService: VersionService;
    let mockService: MockVersionService;
    let performanceTimer: number;

    beforeEach(() => {
        jest.setTimeout(TEST_TIMEOUT);
        versionService = new VersionService();
        mockService = new MockVersionService(false, true);
        performanceTimer = 0;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Version History Functionality', () => {
        it('should retrieve version history within SLA timeframe', async () => {
            // Start performance timer
            performanceTimer = Date.now();

            // Get version history
            const response = await versionService.getVersionHistory(WORKBOOK_ID);

            // Verify performance
            const executionTime = Date.now() - performanceTimer;
            expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);

            // Verify response structure
            expect(response.success).toBe(true);
            expect(response.version).toBeDefined();
            expect(Array.isArray(response.version)).toBe(true);
        });

        it('should properly sort versions by timestamp in descending order', async () => {
            const response = await versionService.getVersionHistory(WORKBOOK_ID);
            
            if (response.success && response.version) {
                const versions = response.version;
                for (let i = 1; i < versions.length; i++) {
                    const currentTimestamp = new Date(versions[i].metadata.timestamp).getTime();
                    const previousTimestamp = new Date(versions[i-1].metadata.timestamp).getTime();
                    expect(currentTimestamp).toBeLessThanOrEqual(previousTimestamp);
                }
            }
        });

        it('should handle network errors gracefully', async () => {
            const errorMockService = new MockVersionService(true);
            const response = await errorMockService.getVersionHistory();
            expect(response).toHaveLength(0);
        });
    });

    describe('Version Creation and Validation', () => {
        it('should create new version with changes within SLA timeframe', async () => {
            const changes = [{
                cellReference: 'A1',
                previousValue: '100',
                newValue: '200',
                changeType: VersionChangeType.FORMULA_UPDATE,
                timestamp: new Date(),
                formula: '=SUM(B1:B10)'
            }];

            performanceTimer = Date.now();

            const response = await versionService.createVersion(
                WORKBOOK_ID,
                changes,
                VersionChangeType.FORMULA_UPDATE,
                'Updated SUM formula'
            );

            const executionTime = Date.now() - performanceTimer;
            expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
            expect(response.version).toBeDefined();
        });

        it('should validate version metadata completeness', async () => {
            const response = await versionService.createVersion(
                WORKBOOK_ID,
                [{
                    cellReference: 'B2',
                    previousValue: 'Old',
                    newValue: 'New',
                    changeType: VersionChangeType.CELL_MODIFICATION,
                    timestamp: new Date(),
                    formula: null
                }],
                VersionChangeType.CELL_MODIFICATION,
                'Modified cell content'
            );

            if (response.success && response.version) {
                const version = response.version;
                expect(version.id).toBeDefined();
                expect(version.number).toMatch(/^\d+\.\d+\.\d+$/);
                expect(version.metadata).toMatchObject({
                    timestamp: expect.any(Date),
                    author: expect.any(String),
                    description: expect.any(String),
                    changeType: expect.any(String),
                    workbookId: expect.any(String),
                    worksheetId: expect.any(String)
                });
            }
        });
    });

    describe('Version Restoration', () => {
        it('should restore previous version within SLA timeframe', async () => {
            // Create a version to restore
            const mockVersion = await createMockVersion(
                VersionChangeType.FORMULA_UPDATE,
                'Test version',
                null
            );

            performanceTimer = Date.now();

            const response = await versionService.restoreVersion(
                WORKBOOK_ID,
                mockVersion.id
            );

            const executionTime = Date.now() - performanceTimer;
            expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
        });

        it('should handle invalid version ID restoration attempts', async () => {
            const response = await versionService.restoreVersion(
                WORKBOOK_ID,
                'invalid-version-id'
            );
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
        });
    });

    describe('Version Comparison', () => {
        it('should compare versions and detect changes accurately', async () => {
            const version1 = await createMockVersion(
                VersionChangeType.FORMULA_UPDATE,
                'First version',
                null
            );
            const version2 = await createMockVersion(
                VersionChangeType.FORMULA_UPDATE,
                'Second version',
                version1
            );

            performanceTimer = Date.now();

            const response = await versionService.compareVersions(
                WORKBOOK_ID,
                version1.id,
                version2.id
            );

            const executionTime = Date.now() - performanceTimer;
            expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);

            if (response.success && response.version) {
                const comparison = response.version;
                expect(comparison.differences).toBeDefined();
                expect(Array.isArray(comparison.differences)).toBe(true);
                expect(comparison.summary).toBeDefined();
            }
        });

        it('should handle large version differences efficiently', async () => {
            // Create versions with many changes
            const largeVersion1 = await createMockVersion(
                VersionChangeType.DATA_CLEANING,
                'Large version 1',
                null
            );
            const largeVersion2 = await createMockVersion(
                VersionChangeType.DATA_CLEANING,
                'Large version 2',
                largeVersion1
            );

            performanceTimer = Date.now();

            const response = await versionService.compareVersions(
                WORKBOOK_ID,
                largeVersion1.id,
                largeVersion2.id
            );

            const executionTime = Date.now() - performanceTimer;
            expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle concurrent version operations', async () => {
            const operations = Array(10).fill(null).map(() => 
                versionService.createVersion(
                    WORKBOOK_ID,
                    [{
                        cellReference: 'A1',
                        previousValue: 'Old',
                        newValue: 'New',
                        changeType: VersionChangeType.CELL_MODIFICATION,
                        timestamp: new Date(),
                        formula: null
                    }],
                    VersionChangeType.CELL_MODIFICATION,
                    'Concurrent test'
                )
            );

            performanceTimer = Date.now();
            const results = await Promise.all(operations);
            const executionTime = Date.now() - performanceTimer;

            expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS * 2);
            results.forEach(result => {
                expect(result.success).toBe(true);
            });
        });

        it('should maintain performance under heavy load', async () => {
            const heavyLoadTest = async () => {
                const start = Date.now();
                for (let i = 0; i < 50; i++) {
                    await versionService.getVersionHistory(WORKBOOK_ID);
                }
                return Date.now() - start;
            };

            const totalTime = await heavyLoadTest();
            const averageTime = totalTime / 50;
            expect(averageTime).toBeLessThan(PERFORMANCE_SLA_MS);
        });
    });
});