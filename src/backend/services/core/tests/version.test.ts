/**
 * @fileoverview Comprehensive test suite for VersionService with full coverage of all operations
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import Redis from 'redis-mock';
import { Logger } from 'winston';
import {
    IVersion,
    IVersionChange,
    IVersionMetadata,
    IVersionResponse,
    IVersionChangeType
} from '../src/interfaces/version.interface';
import { VersionService } from '../src/services/version.service';

// Mock constants
const MOCK_VERSION_ID = 'test-version-1';
const MOCK_WORKBOOK_ID = 'test-workbook-1';
const MOCK_USER_ID = 'test-user-1';
const MOCK_TIMESTAMP = new Date('2024-01-01T00:00:00Z');

/**
 * Creates mock version data for testing
 */
const createMockVersionData = (overrides: Partial<IVersionMetadata> = {}): IVersionResponse => ({
    version: {
        id: MOCK_VERSION_ID,
        workbookId: MOCK_WORKBOOK_ID,
        worksheetId: 'test-worksheet-1',
        versionNumber: 1,
        timestamp: MOCK_TIMESTAMP,
        userId: MOCK_USER_ID,
        parentVersionId: null,
        tags: [],
        isArchived: false
    },
    metadata: {
        service: 'test-service',
        action: 'test-action',
        description: 'Test version',
        clientInfo: {
            platform: 'test-platform',
            version: '1.0.0',
            locale: 'en-US'
        },
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        ...overrides
    },
    changes: [
        {
            cellReference: 'A1',
            previousValue: '=SUM(B1:B10)',
            newValue: '=SUM(B1:B20)',
            changeType: IVersionChangeType.FORMULA,
            timestamp: MOCK_TIMESTAMP,
            userId: MOCK_USER_ID,
            metadata: {
                service: 'formula-service',
                action: 'update',
                description: 'Updated formula range',
                clientInfo: {},
                userAgent: 'test-agent',
                ipAddress: '127.0.0.1'
            }
        }
    ],
    pagination: {
        currentPage: 1,
        pageSize: 1,
        totalPages: 1,
        totalItems: 1,
        hasNext: false,
        hasPrevious: false
    }
});

describe('VersionService', () => {
    let versionService: VersionService;
    let mockVersionRepo: jest.Mocked<Repository<IVersion>>;
    let mockChangeRepo: jest.Mocked<Repository<IVersionChange>>;
    let mockRedis: Redis.RedisClient;
    let mockLogger: jest.Mocked<Logger>;
    let mockMetrics: jest.Mocked<any>;
    let mockConfig: jest.Mocked<any>;

    beforeEach(() => {
        // Setup repository mocks
        mockVersionRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            save: jest.fn(),
            manager: {
                connection: {
                    createQueryRunner: jest.fn().mockReturnValue({
                        startTransaction: jest.fn(),
                        commitTransaction: jest.fn(),
                        rollbackTransaction: jest.fn(),
                        release: jest.fn(),
                        manager: {
                            save: jest.fn()
                        }
                    })
                }
            }
        } as unknown as jest.Mocked<Repository<IVersion>>;

        mockChangeRepo = {
            find: jest.fn(),
            save: jest.fn()
        } as unknown as jest.Mocked<Repository<IVersionChange>>;

        // Setup Redis mock
        mockRedis = Redis.createClient();

        // Setup logger mock
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as unknown as jest.Mocked<Logger>;

        // Setup metrics mock
        mockMetrics = {
            startTimer: jest.fn().mockReturnValue({ end: () => 100 }),
            recordVersionCreation: jest.fn(),
            recordCacheHit: jest.fn(),
            recordCacheMiss: jest.fn()
        };

        // Setup config mock
        mockConfig = {};

        // Initialize service
        versionService = new VersionService(
            mockVersionRepo,
            mockChangeRepo,
            mockRedis as any,
            mockLogger,
            mockMetrics,
            mockConfig
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createVersion', () => {
        it('should successfully create a new version', async () => {
            const mockData = createMockVersionData();
            const { changes, metadata } = mockData;

            mockVersionRepo.manager.connection.createQueryRunner().manager.save
                .mockResolvedValueOnce(mockData.version);

            const result = await versionService.createVersion(
                MOCK_WORKBOOK_ID,
                changes,
                metadata
            );

            expect(result).toEqual(mockData.version);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Creating new version',
                expect.any(Object)
            );
            expect(mockMetrics.recordVersionCreation).toHaveBeenCalled();
        });

        it('should handle validation errors', async () => {
            await expect(
                versionService.createVersion('', [], {} as IVersionMetadata)
            ).rejects.toThrow('Workbook ID is required');
        });

        it('should handle transaction failures', async () => {
            const mockData = createMockVersionData();
            const { changes, metadata } = mockData;

            mockVersionRepo.manager.connection.createQueryRunner().manager.save
                .mockRejectedValueOnce(new Error('Database error'));

            await expect(
                versionService.createVersion(MOCK_WORKBOOK_ID, changes, metadata)
            ).rejects.toThrow('Database error');

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getVersion', () => {
        it('should return cached version if available', async () => {
            const mockData = createMockVersionData();
            jest.spyOn(mockRedis, 'get').mockImplementation((key, callback) => {
                callback(null, JSON.stringify(mockData));
                return {} as any;
            });

            const result = await versionService.getVersion(MOCK_VERSION_ID);

            expect(result).toEqual(mockData);
            expect(mockMetrics.recordCacheHit).toHaveBeenCalled();
        });

        it('should fetch from database on cache miss', async () => {
            const mockData = createMockVersionData();
            mockVersionRepo.findOne.mockResolvedValueOnce(mockData.version);
            mockChangeRepo.find.mockResolvedValueOnce(mockData.changes);

            jest.spyOn(mockRedis, 'get').mockImplementation((key, callback) => {
                callback(null, null);
                return {} as any;
            });

            const result = await versionService.getVersion(MOCK_VERSION_ID);

            expect(result.version).toEqual(mockData.version);
            expect(mockMetrics.recordCacheMiss).toHaveBeenCalled();
        });

        it('should handle version not found', async () => {
            mockVersionRepo.findOne.mockResolvedValueOnce(null);

            await expect(
                versionService.getVersion('non-existent-id')
            ).rejects.toThrow('Version not found');
        });
    });

    describe('listVersions', () => {
        it('should list versions with pagination', async () => {
            const mockData = createMockVersionData();
            mockVersionRepo.findAndCount.mockResolvedValueOnce([[mockData.version], 1]);
            mockChangeRepo.find.mockResolvedValueOnce(mockData.changes);

            const result = await versionService.listVersions(MOCK_WORKBOOK_ID, 1, 10);

            expect(result).toHaveLength(1);
            expect(result[0].version).toEqual(mockData.version);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Listing versions',
                expect.any(Object)
            );
        });

        it('should handle empty results', async () => {
            mockVersionRepo.findAndCount.mockResolvedValueOnce([[], 0]);

            const result = await versionService.listVersions(MOCK_WORKBOOK_ID);

            expect(result).toHaveLength(0);
        });
    });

    describe('revertToVersion', () => {
        it('should successfully revert to previous version', async () => {
            const mockData = createMockVersionData();
            const mockRevertedVersion = {
                ...mockData.version,
                id: 'reverted-version-id'
            };

            jest.spyOn(versionService, 'getVersion').mockResolvedValueOnce(mockData);
            jest.spyOn(versionService, 'createVersion').mockResolvedValueOnce(mockRevertedVersion);

            const result = await versionService.revertToVersion(MOCK_VERSION_ID);

            expect(result).toEqual(mockRevertedVersion);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Reverting to version',
                expect.any(Object)
            );
        });

        it('should handle revert failures', async () => {
            jest.spyOn(versionService, 'getVersion').mockRejectedValueOnce(
                new Error('Version not found')
            );

            await expect(
                versionService.revertToVersion(MOCK_VERSION_ID)
            ).rejects.toThrow('Version not found');

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});