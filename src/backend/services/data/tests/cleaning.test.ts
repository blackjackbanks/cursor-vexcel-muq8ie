import { Test, TestingModule } from '@nestjs/testing'; // ^10.0.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import { Repository } from 'typeorm'; // ^0.3.17
import { SecurityService } from '@nestjs/security'; // ^10.0.0
import { RedisClusterService } from '@nestjs/redis';
import { MetricsService } from '@nestjs/metrics';

import { CleaningController } from '../src/controllers/cleaning.controller';
import { CleaningService } from '../src/services/cleaning.service';
import { CellChange } from '../src/entities/cell-change.entity';
import { 
    ICleaningRequest, 
    ICleaningResult, 
    CleaningStatus, 
    CleaningChangeType 
} from '../src/interfaces/cleaning.interface';
import { DataClassification } from '../src/entities/user.entity';

describe('Data Cleaning Tests', () => {
    let module: TestingModule;
    let cleaningController: CleaningController;
    let cleaningService: CleaningService;
    let securityService: SecurityService;
    let repository: Repository<CellChange>;
    let redisService: RedisClusterService;
    let metricsService: MetricsService;

    // Test data fixtures
    const validRequest: ICleaningRequest = {
        workbookId: '123e4567-e89b-12d3-a456-426614174000',
        worksheetId: '123e4567-e89b-12d3-a456-426614174001',
        range: 'A1:D10',
        options: {
            removeDuplicates: true,
            fillMissingValues: true,
            standardizeFormats: true
        }
    };

    const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'test@example.com',
        dataClassification: DataClassification.CONFIDENTIAL
    };

    beforeEach(async () => {
        // Create mocks
        const mockRepository = {
            find: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([])
            }))
        };

        const mockRedisService = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        };

        const mockMetricsService = {
            startTimer: jest.fn(),
            endTimer: jest.fn(),
            recordHistogram: jest.fn(),
            incrementCounter: jest.fn()
        };

        const mockSecurityService = {
            validateDataAccess: jest.fn().mockResolvedValue(true),
            getCurrentUser: jest.fn().mockResolvedValue(mockUser)
        };

        // Initialize test module
        module = await Test.createTestingModule({
            controllers: [CleaningController],
            providers: [
                CleaningService,
                {
                    provide: Repository,
                    useValue: mockRepository
                },
                {
                    provide: RedisClusterService,
                    useValue: mockRedisService
                },
                {
                    provide: MetricsService,
                    useValue: mockMetricsService
                },
                {
                    provide: SecurityService,
                    useValue: mockSecurityService
                }
            ]
        }).compile();

        // Get service instances
        cleaningController = module.get<CleaningController>(CleaningController);
        cleaningService = module.get<CleaningService>(CleaningService);
        securityService = module.get<SecurityService>(SecurityService);
        repository = module.get<Repository<CellChange>>(Repository);
        redisService = module.get<RedisClusterService>(RedisClusterService);
        metricsService = module.get<MetricsService>(MetricsService);
    });

    afterEach(async () => {
        await module.close();
        jest.clearAllMocks();
    });

    describe('Authentication and Authorization', () => {
        it('should validate user authentication before processing', async () => {
            const spy = jest.spyOn(securityService, 'getCurrentUser');
            
            await cleaningController.cleanData(validRequest);
            
            expect(spy).toHaveBeenCalled();
        });

        it('should check data classification access rights', async () => {
            const spy = jest.spyOn(securityService, 'validateDataAccess');
            
            await cleaningController.cleanData(validRequest);
            
            expect(spy).toHaveBeenCalledWith(
                validRequest.workbookId,
                mockUser.dataClassification
            );
        });

        it('should reject requests with insufficient permissions', async () => {
            jest.spyOn(securityService, 'validateDataAccess')
                .mockResolvedValueOnce(false);

            await expect(cleaningController.cleanData(validRequest))
                .rejects
                .toThrow('Unauthorized data access attempt');
        });
    });

    describe('Data Cleaning Operations', () => {
        it('should process duplicate removal correctly', async () => {
            const result = await cleaningService.cleanData({
                ...validRequest,
                options: { removeDuplicates: true }
            });

            expect(result.duplicatesRemoved).toBeGreaterThanOrEqual(0);
            expect(metricsService.incrementCounter)
                .toHaveBeenCalledWith('data_cleaning_success');
        });

        it('should handle missing value filling', async () => {
            const result = await cleaningService.cleanData({
                ...validRequest,
                options: { fillMissingValues: true }
            });

            expect(result.missingValuesFilled).toBeGreaterThanOrEqual(0);
            expect(result.cellChanges).toBeInstanceOf(Array);
        });

        it('should standardize formats as requested', async () => {
            const result = await cleaningService.cleanData({
                ...validRequest,
                options: { standardizeFormats: true }
            });

            expect(result.formatsStandardized).toBeGreaterThanOrEqual(0);
            expect(result.processingTime).toBeGreaterThan(0);
        });

        it('should track all cell changes', async () => {
            const result = await cleaningService.cleanData(validRequest);

            expect(repository.save).toHaveBeenCalled();
            expect(result.cellChanges.every(change => 
                change.hasOwnProperty('cellReference') &&
                change.hasOwnProperty('previousValue') &&
                change.hasOwnProperty('newValue')
            )).toBeTruthy();
        });
    });

    describe('Progress Tracking', () => {
        it('should initialize progress tracking', async () => {
            const operationId = '123e4567-e89b-12d3-a456-426614174003';
            
            await cleaningService.cleanData(validRequest);

            expect(redisService.set).toHaveBeenCalledWith(
                expect.stringContaining('cleaning:progress:'),
                expect.stringContaining(CleaningStatus.IN_PROGRESS)
            );
        });

        it('should update progress during operation', async () => {
            const spy = jest.spyOn(redisService, 'set');
            
            await cleaningService.cleanData(validRequest);

            expect(spy).toHaveBeenCalledTimes(expect.any(Number));
            expect(spy).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('"progress":')
            );
        });

        it('should report final progress on completion', async () => {
            const result = await cleaningController.cleanData(validRequest);

            expect(result.success).toBeTruthy();
            expect(redisService.set).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.stringContaining(CleaningStatus.COMPLETED)
            );
        });
    });

    describe('Error Handling', () => {
        it('should validate request parameters', async () => {
            const invalidRequest = {
                ...validRequest,
                range: 'invalid-range'
            };

            await expect(cleaningController.cleanData(invalidRequest))
                .rejects
                .toThrow();
        });

        it('should handle database errors gracefully', async () => {
            jest.spyOn(repository, 'save')
                .mockRejectedValueOnce(new Error('Database error'));

            await expect(cleaningService.cleanData(validRequest))
                .rejects
                .toThrow();
            
            expect(metricsService.incrementCounter)
                .toHaveBeenCalledWith('data_cleaning_error');
        });

        it('should maintain progress state on failure', async () => {
            jest.spyOn(cleaningService, 'cleanData')
                .mockRejectedValueOnce(new Error('Processing error'));

            await expect(cleaningController.cleanData(validRequest))
                .rejects
                .toThrow();

            expect(redisService.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining(CleaningStatus.FAILED)
            );
        });

        it('should handle concurrent requests safely', async () => {
            const requests = Array(3).fill(validRequest);
            
            await Promise.all(requests.map(req => 
                cleaningController.cleanData(req)
            ));

            expect(metricsService.incrementCounter)
                .toHaveBeenCalledTimes(3);
        });
    });

    describe('Performance Monitoring', () => {
        it('should track operation duration', async () => {
            await cleaningService.cleanData(validRequest);

            expect(metricsService.startTimer).toHaveBeenCalled();
            expect(metricsService.endTimer).toHaveBeenCalled();
        });

        it('should record batch processing metrics', async () => {
            await cleaningService.cleanData(validRequest);

            expect(metricsService.recordHistogram)
                .toHaveBeenCalledWith(
                    'data_cleaning_batch_size',
                    expect.any(Number)
                );
        });

        it('should cache cleaning results', async () => {
            await cleaningService.cleanData(validRequest);

            expect(redisService.set).toHaveBeenCalledWith(
                expect.stringContaining('cleaning:results:'),
                expect.any(String),
                expect.any(Object)
            );
        });
    });
});