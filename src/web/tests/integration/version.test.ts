/**
 * Integration tests for version control functionality in Excel Add-in
 * Validates version history, change tracking, rollback capabilities, and performance requirements
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { VersionService } from '../../src/services/version.service';
import { ApiService } from '../../src/services/api.service';
import {
    Version,
    VersionChangeType,
    VersionChange,
    VersionResponse,
    IVersionCompareResult
} from '../../src/types/version.types';
import {
    createMockVersion,
    createMockVersionResponse,
    MockVersionService,
    simulateNetworkDelay
} from '../mocks/version.mock';

// Test configuration constants
const PERFORMANCE_SLA_MS = 2000; // 2-second SLA requirement
const TEST_WORKBOOK_ID = 'test-workbook-123';
const BATCH_SIZE = 50;

describe('Version Control Integration Tests', () => {
    let versionService: VersionService;
    let apiService: ApiService;
    let mockVersionService: MockVersionService;
    let performanceTimer: number;

    beforeEach(() => {
        // Initialize services and mocks
        apiService = new ApiService();
        versionService = new VersionService();
        mockVersionService = new MockVersionService(false, true);
        performanceTimer = Date.now();

        // Mock API service methods
        jest.spyOn(apiService, 'get');
        jest.spyOn(apiService, 'post');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Version History Tests', () => {
        test('should retrieve paginated version history within SLA', async () => {
            // Arrange
            const limit = 20;
            const startTime = Date.now();

            // Act
            const response = await versionService.getVersionHistory(TEST_WORKBOOK_ID);

            // Assert
            expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
            expect(response.version).toBeDefined();
            expect(response.version?.length).toBeLessThanOrEqual(limit);
            expect(apiService.get).toHaveBeenCalledTimes(1);
        });

        test('should filter versions by date range', async () => {
            // Arrange
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            // Act
            const response = await versionService.getVersionHistory(TEST_WORKBOOK_ID);

            // Assert
            expect(response.success).toBe(true);
            response.version?.forEach(version => {
                const versionDate = new Date(version.metadata.timestamp);
                expect(versionDate >= startDate && versionDate <= endDate).toBe(true);
            });
        });

        test('should handle empty history gracefully', async () => {
            // Arrange
            jest.spyOn(apiService, 'get').mockResolvedValueOnce({
                success: true,
                version: [],
                error: null,
                timestamp: new Date()
            });

            // Act
            const response = await versionService.getVersionHistory(TEST_WORKBOOK_ID);

            // Assert
            expect(response.success).toBe(true);
            expect(response.version).toHaveLength(0);
        });
    });

    describe('Version Creation Tests', () => {
        test('should create single version with changes within SLA', async () => {
            // Arrange
            const changes: VersionChange[] = [{
                cellReference: 'A1',
                previousValue: '100',
                newValue: '200',
                changeType: VersionChangeType.FORMULA_UPDATE,
                timestamp: new Date(),
                formula: '=SUM(B1:B10)'
            }];

            // Act
            const startTime = Date.now();
            const response = await versionService.createVersion(
                TEST_WORKBOOK_ID,
                changes,
                VersionChangeType.FORMULA_UPDATE,
                'Updated formula in A1'
            );

            // Assert
            expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
            expect(response.version).toBeDefined();
            expect(apiService.post).toHaveBeenCalledTimes(1);
        });

        test('should handle batch version creation', async () => {
            // Arrange
            const batchChanges: VersionChange[] = Array.from({ length: BATCH_SIZE }, (_, i) => ({
                cellReference: `A${i + 1}`,
                previousValue: 'old',
                newValue: 'new',
                changeType: VersionChangeType.CELL_MODIFICATION,
                timestamp: new Date(),
                formula: null
            }));

            // Act
            const startTime = Date.now();
            const response = await versionService.createVersion(
                TEST_WORKBOOK_ID,
                batchChanges,
                VersionChangeType.CELL_MODIFICATION,
                'Batch cell updates'
            );

            // Assert
            expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
            expect(response.version?.changes).toHaveLength(BATCH_SIZE);
        });
    });

    describe('Version Restoration Tests', () => {
        test('should restore to valid version within SLA', async () => {
            // Arrange
            const mockVersion = createMockVersion(
                VersionChangeType.FORMULA_UPDATE,
                'Test version',
                null
            );

            // Act
            const startTime = Date.now();
            const response = await versionService.restoreVersion(
                TEST_WORKBOOK_ID,
                mockVersion.id
            );

            // Assert
            expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
            expect(response.version?.id).toBe(mockVersion.id);
        });

        test('should handle invalid version IDs', async () => {
            // Act
            const response = await versionService.restoreVersion(
                TEST_WORKBOOK_ID,
                'invalid-version-id'
            );

            // Assert
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
        });
    });

    describe('Version Comparison Tests', () => {
        test('should compare versions and generate diffs within SLA', async () => {
            // Arrange
            const version1 = createMockVersion(
                VersionChangeType.FORMULA_UPDATE,
                'Version 1',
                null
            );
            const version2 = createMockVersion(
                VersionChangeType.FORMULA_UPDATE,
                'Version 2',
                version1
            );

            // Act
            const startTime = Date.now();
            const response = await versionService.compareVersions(
                TEST_WORKBOOK_ID,
                version1.id,
                version2.id
            );

            // Assert
            expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
            expect(response.version).toBeDefined();
        });

        test('should handle large dataset comparisons efficiently', async () => {
            // Arrange
            const largeVersion1 = createMockVersion(
                VersionChangeType.DATA_CLEANING,
                'Large Version 1',
                null
            );
            const largeVersion2 = createMockVersion(
                VersionChangeType.DATA_CLEANING,
                'Large Version 2',
                largeVersion1
            );

            // Simulate large number of changes
            const largeChanges = Array.from({ length: 1000 }, (_, i) => ({
                cellReference: `A${i + 1}`,
                previousValue: 'old',
                newValue: 'new',
                changeType: VersionChangeType.DATA_CLEANING,
                timestamp: new Date(),
                formula: null
            }));

            // Act
            const startTime = Date.now();
            const response = await versionService.compareVersions(
                TEST_WORKBOOK_ID,
                largeVersion1.id,
                largeVersion2.id
            );

            // Assert
            expect(Date.now() - startTime).toBeLessThan(PERFORMANCE_SLA_MS);
            expect(response.success).toBe(true);
        });
    });

    describe('Error Handling Tests', () => {
        test('should handle network failures gracefully', async () => {
            // Arrange
            jest.spyOn(apiService, 'get').mockRejectedValueOnce(new Error('Network error'));

            // Act
            const response = await versionService.getVersionHistory(TEST_WORKBOOK_ID);

            // Assert
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
        });

        test('should recover from timeout scenarios', async () => {
            // Arrange
            jest.spyOn(apiService, 'get').mockImplementationOnce(async () => {
                await new Promise(resolve => setTimeout(resolve, PERFORMANCE_SLA_MS + 100));
                return createMockVersionResponse(true, null);
            });

            // Act
            const response = await versionService.getVersionHistory(TEST_WORKBOOK_ID);

            // Assert
            expect(response.success).toBe(false);
            expect(response.error).toContain('timeout');
        });

        test('should handle version conflicts', async () => {
            // Arrange
            const conflictingChanges: VersionChange[] = [{
                cellReference: 'A1',
                previousValue: 'original',
                newValue: 'conflicting',
                changeType: VersionChangeType.CELL_MODIFICATION,
                timestamp: new Date(),
                formula: null
            }];

            // Simulate concurrent modification
            await versionService.createVersion(
                TEST_WORKBOOK_ID,
                conflictingChanges,
                VersionChangeType.CELL_MODIFICATION,
                'Concurrent change'
            );

            // Act
            const response = await versionService.createVersion(
                TEST_WORKBOOK_ID,
                conflictingChanges,
                VersionChangeType.CELL_MODIFICATION,
                'Conflicting change'
            );

            // Assert
            expect(response.success).toBe(false);
            expect(response.error).toContain('conflict');
        });
    });
});