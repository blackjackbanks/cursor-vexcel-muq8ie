import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'; // ^10.0.0
import { Repository } from 'typeorm'; // ^0.3.17
import { AuditLogger } from '@company/audit-logger'; // ^1.0.0
import { SecurityService } from '@company/security'; // ^1.0.0

import { Workbook } from '../entities/workbook.entity';
import { IWorkbook, IWorkbookCreate, IWorkbookUpdate } from '../interfaces/workbook.interface';
import { DatabaseService } from '../config/database';

@Injectable()
export class WorkbookService {
  private workbookRepository: Repository<Workbook>;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly securityService: SecurityService,
    private readonly auditLogger: AuditLogger
  ) {
    this.workbookRepository = this.databaseService.getConnection().getRepository(Workbook);
  }

  /**
   * Creates a new workbook with security classification and audit trail
   * @param workbookData Workbook creation data
   * @param userId User creating the workbook
   * @param classification Security classification
   * @returns Created workbook instance
   */
  async createWorkbook(
    workbookData: IWorkbookCreate,
    userId: string,
    classification: SecurityClassification
  ): Promise<IWorkbook> {
    // Validate user permissions
    await this.securityService.validateUserAccess(userId, 'workbook:create');

    // Start transaction
    const queryRunner = this.databaseService.getConnection().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create workbook entity
      const workbook = new Workbook({
        name: workbookData.name,
        userId: userId,
        metadata: {
          ...workbookData.metadata,
          lastModifiedBy: userId,
          lastModifiedAt: new Date(),
          size: 0,
          sheetCount: 0,
          dataClassification: workbookData.dataClassification,
          lastBackupAt: new Date()
        },
        securityClassification: classification
      });

      // Save workbook
      const savedWorkbook = await queryRunner.manager.save(workbook);

      // Create audit entry
      await this.auditLogger.log({
        action: 'WORKBOOK_CREATE',
        resourceId: savedWorkbook.id,
        userId: userId,
        metadata: {
          classification: classification,
          workbookName: workbookData.name
        }
      });

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedWorkbook;
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Updates workbook with version control and security validation
   * @param id Workbook ID
   * @param updateData Update data
   * @param userId User performing update
   * @returns Updated workbook
   */
  async updateWorkbook(
    id: string,
    updateData: IWorkbookUpdate,
    userId: string
  ): Promise<IWorkbook> {
    const queryRunner = this.databaseService.getConnection().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get workbook with lock check
      const workbook = await this.workbookRepository.findOne({ where: { id } });
      if (!workbook) {
        throw new NotFoundException('Workbook not found');
      }

      // Check lock status
      if (workbook.lockToken && workbook.lockExpiresAt > new Date()) {
        throw new UnauthorizedException('Workbook is locked for editing');
      }

      // Validate user permissions
      await this.securityService.validateUserAccess(userId, 'workbook:update', workbook);

      // Update workbook
      workbook.name = updateData.name;
      workbook.metadata = {
        ...workbook.metadata,
        ...updateData.metadata,
        lastModifiedBy: userId,
        lastModifiedAt: new Date()
      };
      workbook.isActive = updateData.isActive;

      // Increment version with audit
      workbook.incrementVersion(userId, 'Workbook update');

      // Save changes
      const updatedWorkbook = await queryRunner.manager.save(workbook);

      // Log audit
      await this.auditLogger.log({
        action: 'WORKBOOK_UPDATE',
        resourceId: id,
        userId: userId,
        metadata: {
          version: updatedWorkbook.version,
          changes: updateData
        }
      });

      await queryRunner.commitTransaction();
      return updatedWorkbook;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lists workbooks with security filtering and pagination
   * @param userId User requesting list
   * @param pagination Pagination options
   * @param filters Filter options
   * @returns Paginated workbook list
   */
  async listWorkbooks(
    userId: string,
    pagination: { page: number; limit: number },
    filters?: { isActive?: boolean; classification?: SecurityClassification }
  ): Promise<{ items: IWorkbook[]; total: number }> {
    // Validate user access
    await this.securityService.validateUserAccess(userId, 'workbook:list');

    // Build query with security context
    const query = this.workbookRepository.createQueryBuilder('workbook')
      .where('workbook.userId = :userId', { userId })
      .andWhere('workbook.deletedAt IS NULL');

    // Apply filters
    if (filters?.isActive !== undefined) {
      query.andWhere('workbook.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters?.classification) {
      query.andWhere('workbook.securityClassification = :classification', {
        classification: filters.classification
      });
    }

    // Add pagination
    const [items, total] = await query
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    // Log audit
    await this.auditLogger.log({
      action: 'WORKBOOK_LIST',
      userId: userId,
      metadata: { filters, pagination }
    });

    return { items, total };
  }
}