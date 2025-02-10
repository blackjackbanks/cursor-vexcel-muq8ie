import { Test, TestingModule } from '@nestjs/testing'; // ^10.0.0
import { Repository } from 'typeorm'; // ^0.3.17
import { SecurityService } from '@company/security'; // ^1.0.0
import { AuditLogger } from '@company/audit-logger'; // ^1.0.0

import { WorkbookService } from '../src/services/workbook.service';
import { DatabaseService } from '../src/config/database';
import { IWorkbook, IWorkbookCreate, IWorkbookUpdate } from '../src/interfaces/workbook.interface';
import { Workbook } from '../src/entities/workbook.entity';

describe('WorkbookService', () => {
  let module: TestingModule;
  let workbookService: WorkbookService;
  let mockRepository: jest.Mocked<Repository<Workbook>>;
  let mockSecurityService: jest.Mocked<SecurityService>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'POWER_USER'
  };

  const mockWorkbook: IWorkbook = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Workbook',
    metadata: {
      lastModifiedBy: mockUser.id,
      lastModifiedAt: new Date(),
      size: 1024,
      sheetCount: 1,
      dataClassification: 'internal',
      lastBackupAt: new Date()
    },
    userId: mockUser.id,
    user: null,
    worksheets: [],
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lockExpiresAt: null,
    lockedBy: null
  };

  beforeEach(async () => {
    // Create mock implementations
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockSecurityService = {
      validateUserAccess: jest.fn(),
    } as any;

    mockAuditLogger = {
      log: jest.fn(),
    } as any;

    mockDatabaseService = {
      getConnection: jest.fn().mockReturnValue({
        getRepository: jest.fn().mockReturnValue(mockRepository),
        createQueryRunner: jest.fn().mockReturnValue({
          connect: jest.fn(),
          startTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          rollbackTransaction: jest.fn(),
          release: jest.fn(),
          manager: {
            save: jest.fn()
          }
        })
      })
    } as any;

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        WorkbookService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService
        },
        {
          provide: SecurityService,
          useValue: mockSecurityService
        },
        {
          provide: AuditLogger,
          useValue: mockAuditLogger
        }
      ],
    }).compile();

    workbookService = module.get<WorkbookService>(WorkbookService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('createWorkbook', () => {
    const createWorkbookData: IWorkbookCreate = {
      name: 'New Workbook',
      userId: mockUser.id,
      metadata: {
        dataClassification: 'internal'
      },
      dataClassification: 'internal'
    };

    it('should create a workbook with proper security validation', async () => {
      mockSecurityService.validateUserAccess.mockResolvedValue(true);
      const queryRunner = mockDatabaseService.getConnection().createQueryRunner();
      queryRunner.manager.save.mockResolvedValue({ ...mockWorkbook, ...createWorkbookData });

      const result = await workbookService.createWorkbook(
        createWorkbookData,
        mockUser.id,
        'INTERNAL'
      );

      expect(mockSecurityService.validateUserAccess).toHaveBeenCalledWith(
        mockUser.id,
        'workbook:create'
      );
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(mockAuditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'WORKBOOK_CREATE',
        userId: mockUser.id
      }));
      expect(result).toMatchObject(expect.objectContaining({
        name: createWorkbookData.name,
        userId: mockUser.id
      }));
    });

    it('should rollback transaction on error', async () => {
      mockSecurityService.validateUserAccess.mockRejectedValue(new Error('Access denied'));
      const queryRunner = mockDatabaseService.getConnection().createQueryRunner();

      await expect(workbookService.createWorkbook(
        createWorkbookData,
        mockUser.id,
        'INTERNAL'
      )).rejects.toThrow('Access denied');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('updateWorkbook', () => {
    const updateData: IWorkbookUpdate = {
      name: 'Updated Workbook',
      metadata: {
        lastModifiedBy: mockUser.id,
        lastModifiedAt: new Date()
      },
      isActive: true,
      version: 2
    };

    it('should update workbook with version control', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkbook);
      mockSecurityService.validateUserAccess.mockResolvedValue(true);
      const queryRunner = mockDatabaseService.getConnection().createQueryRunner();
      queryRunner.manager.save.mockResolvedValue({ ...mockWorkbook, ...updateData });

      const result = await workbookService.updateWorkbook(
        mockWorkbook.id,
        updateData,
        mockUser.id
      );

      expect(mockSecurityService.validateUserAccess).toHaveBeenCalledWith(
        mockUser.id,
        'workbook:update',
        mockWorkbook
      );
      expect(mockAuditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'WORKBOOK_UPDATE',
        resourceId: mockWorkbook.id
      }));
      expect(result.version).toBe(updateData.version);
    });

    it('should prevent updates on locked workbooks', async () => {
      const lockedWorkbook = {
        ...mockWorkbook,
        lockToken: 'token123',
        lockExpiresAt: new Date(Date.now() + 3600000)
      };
      mockRepository.findOne.mockResolvedValue(lockedWorkbook);

      await expect(workbookService.updateWorkbook(
        mockWorkbook.id,
        updateData,
        mockUser.id
      )).rejects.toThrow('Workbook is locked for editing');
    });
  });

  describe('listWorkbooks', () => {
    const pagination = { page: 1, limit: 10 };
    const filters = { isActive: true, classification: 'INTERNAL' };

    it('should list workbooks with security filtering', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockWorkbook], 1])
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockSecurityService.validateUserAccess.mockResolvedValue(true);

      const result = await workbookService.listWorkbooks(
        mockUser.id,
        pagination,
        filters
      );

      expect(mockSecurityService.validateUserAccess).toHaveBeenCalledWith(
        mockUser.id,
        'workbook:list'
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockAuditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'WORKBOOK_LIST',
        userId: mockUser.id
      }));
    });

    it('should apply security classification filters', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0])
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockSecurityService.validateUserAccess.mockResolvedValue(true);

      await workbookService.listWorkbooks(mockUser.id, pagination, {
        classification: 'RESTRICTED'
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'workbook.securityClassification = :classification',
        { classification: 'RESTRICTED' }
      );
    });
  });
});