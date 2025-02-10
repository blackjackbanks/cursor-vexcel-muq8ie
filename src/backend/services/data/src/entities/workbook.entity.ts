import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeUpdate
} from 'typeorm'; // ^0.3.17
import { IWorkbook, IWorkbookMetadata } from '../interfaces/workbook.interface';
import { User } from './user.entity';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

/**
 * Security classification levels for workbook data
 */
enum SecurityClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

/**
 * Audit trail entry structure for version control
 */
interface AuditEntry {
  timestamp: Date;
  userId: string;
  action: string;
  version: number;
  reason: string;
}

@Entity('workbooks')
@Index(['userId', 'isActive'])
@Index(['name', 'securityClassification'])
export class Workbook implements IWorkbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index()
  name: string;

  @Column({ type: 'jsonb', nullable: false })
  metadata: IWorkbookMetadata;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User, user => user.workbooks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany('Worksheet', 'workbook')
  worksheets: Promise<any[]>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: SecurityClassification,
    default: SecurityClassification.INTERNAL
  })
  securityClassification: SecurityClassification;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lockToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lockExpiresAt: Date | null;

  @Column({ type: 'jsonb', default: [] })
  auditTrail: AuditEntry[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  constructor(workbookData?: Partial<IWorkbook>) {
    if (workbookData) {
      Object.assign(this, workbookData);
    }
    this.securityClassification = SecurityClassification.INTERNAL;
    this.isActive = true;
    this.version = 1;
    this.auditTrail = [];
    this.metadata = this.metadata || {
      lastModifiedBy: '',
      lastModifiedAt: new Date(),
      size: 0,
      sheetCount: 0,
      dataClassification: 'internal',
      lastBackupAt: new Date()
    };
  }

  /**
   * Transforms the workbook entity to a secure JSON representation
   * @returns Sanitized workbook object for API responses
   */
  toJSON(): Record<string, any> {
    const sanitizedMetadata = { ...this.metadata };
    
    // Remove sensitive information based on security classification
    if (this.securityClassification === SecurityClassification.RESTRICTED) {
      delete sanitizedMetadata.lastBackupAt;
      delete sanitizedMetadata.size;
    }

    return {
      id: this.id,
      name: this.name,
      metadata: sanitizedMetadata,
      userId: this.userId,
      isActive: this.isActive,
      version: this.version,
      securityClassification: this.securityClassification,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isLocked: !!this.lockToken && this.lockExpiresAt > new Date()
    };
  }

  /**
   * Increments the workbook version with audit trail
   * @param userId - ID of the user making the change
   * @param reason - Reason for the version increment
   * @throws Error if workbook is locked by another user
   */
  @BeforeUpdate()
  incrementVersion(userId: string, reason: string): void {
    // Check if workbook is locked
    if (this.lockToken && this.lockExpiresAt > new Date()) {
      throw new Error('Workbook is locked for editing');
    }

    this.version += 1;
    
    // Add audit trail entry
    const auditEntry: AuditEntry = {
      timestamp: new Date(),
      userId,
      action: 'VERSION_INCREMENT',
      version: this.version,
      reason
    };
    
    this.auditTrail.push(auditEntry);
    this.metadata.lastModifiedBy = userId;
    this.metadata.lastModifiedAt = new Date();
  }

  /**
   * Acquires a lock for exclusive workbook access
   * @param userId - ID of the user requesting the lock
   * @param durationMinutes - Duration of the lock in minutes
   * @returns Lock token for subsequent operations
   * @throws Error if workbook is already locked
   */
  async acquireLock(userId: string, durationMinutes: number = 30): Promise<string> {
    if (this.lockToken && this.lockExpiresAt > new Date()) {
      throw new Error('Workbook is already locked');
    }

    const lockToken = uuidv4();
    const lockExpiresAt = new Date();
    lockExpiresAt.setMinutes(lockExpiresAt.getMinutes() + durationMinutes);

    this.lockToken = lockToken;
    this.lockExpiresAt = lockExpiresAt;

    // Add audit trail entry
    const auditEntry: AuditEntry = {
      timestamp: new Date(),
      userId,
      action: 'ACQUIRE_LOCK',
      version: this.version,
      reason: `Lock acquired for ${durationMinutes} minutes`
    };
    this.auditTrail.push(auditEntry);

    return lockToken;
  }

  /**
   * Releases the lock on the workbook
   * @param userId - ID of the user releasing the lock
   * @param lockToken - Current lock token
   * @throws Error if lock token doesn't match or user doesn't own the lock
   */
  releaseLock(userId: string, lockToken: string): void {
    if (this.lockToken !== lockToken) {
      throw new Error('Invalid lock token');
    }

    this.lockToken = null;
    this.lockExpiresAt = null;

    // Add audit trail entry
    const auditEntry: AuditEntry = {
      timestamp: new Date(),
      userId,
      action: 'RELEASE_LOCK',
      version: this.version,
      reason: 'Lock released'
    };
    this.auditTrail.push(auditEntry);
  }
}