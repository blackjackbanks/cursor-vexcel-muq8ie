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

import { Workbook } from './workbook.entity';
import { CellChange } from './cell-change.entity';

// Interface for worksheet settings with security context
interface IWorksheetSettings {
  hidden: boolean;
  protected: boolean;
  zoom: number;
  gridLinesVisible: boolean;
  autoFilter: boolean;
  freezePanes: {
    row: number;
    column: number;
  };
  security: {
    encryptionEnabled: boolean;
    restrictedRanges: string[];
    lastSecurityAudit: Date;
    modificationRestrictions: string[];
  };
  performance: {
    volatileFormulas: boolean;
    calculationMode: 'auto' | 'manual';
    precisionAsDisplayed: boolean;
  };
  audit: {
    lastModifiedBy: string;
    lastModifiedAt: Date;
    changeHistory: Array<{
      timestamp: Date;
      userId: string;
      action: string;
    }>;
  };
}

@Entity('worksheets')
@Index(['workbook_id', 'name'], { unique: true })
@Index(['isActive'])
export class Worksheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index()
  name: string;

  @Column({ type: 'jsonb', nullable: false })
  settings: IWorksheetSettings;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  workbook_id: string;

  @ManyToOne(() => Workbook, workbook => workbook.worksheets, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'workbook_id' })
  workbook: Workbook;

  @OneToMany(() => CellChange, cellChange => cellChange.worksheet_id, {
    cascade: ['insert', 'update'],
    eager: false
  })
  cellChanges: Promise<CellChange[]>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  constructor() {
    this.isActive = true;
    this.version = 1;
    this.settings = {
      hidden: false,
      protected: false,
      zoom: 100,
      gridLinesVisible: true,
      autoFilter: false,
      freezePanes: {
        row: 0,
        column: 0
      },
      security: {
        encryptionEnabled: false,
        restrictedRanges: [],
        lastSecurityAudit: new Date(),
        modificationRestrictions: []
      },
      performance: {
        volatileFormulas: true,
        calculationMode: 'auto',
        precisionAsDisplayed: false
      },
      audit: {
        lastModifiedBy: '',
        lastModifiedAt: new Date(),
        changeHistory: []
      }
    };
  }

  /**
   * Transforms the worksheet entity to a secure JSON representation
   * @returns Sanitized worksheet object for API responses
   */
  toJSON(): Record<string, any> {
    const sanitizedSettings = { ...this.settings };

    // Remove sensitive security information
    if (sanitizedSettings.security) {
      delete sanitizedSettings.security.encryptionEnabled;
      delete sanitizedSettings.security.restrictedRanges;
    }

    return {
      id: this.id,
      name: this.name,
      workbook_id: this.workbook_id,
      settings: sanitizedSettings,
      isActive: this.isActive,
      version: this.version,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Increments worksheet version and updates audit trail
   * @param userId ID of the user making the change
   * @param action Description of the change action
   */
  @BeforeUpdate()
  incrementVersion(userId: string, action: string): void {
    this.version += 1;
    
    // Update audit information
    this.settings.audit.lastModifiedBy = userId;
    this.settings.audit.lastModifiedAt = new Date();
    this.settings.audit.changeHistory.push({
      timestamp: new Date(),
      userId,
      action
    });

    // Maintain a reasonable history size
    if (this.settings.audit.changeHistory.length > 100) {
      this.settings.audit.changeHistory = this.settings.audit.changeHistory.slice(-100);
    }
  }

  /**
   * Updates worksheet security settings
   * @param restrictions Array of modification restrictions
   * @param enableEncryption Boolean to toggle encryption
   */
  updateSecurity(restrictions: string[], enableEncryption: boolean): void {
    this.settings.security.modificationRestrictions = restrictions;
    this.settings.security.encryptionEnabled = enableEncryption;
    this.settings.security.lastSecurityAudit = new Date();
  }

  /**
   * Validates worksheet name format
   * @throws Error if name format is invalid
   */
  validateName(): void {
    const nameRegex = /^[a-zA-Z0-9\s\-_]{1,31}$/;
    if (!nameRegex.test(this.name)) {
      throw new Error('Invalid worksheet name format. Must be 1-31 characters and contain only letters, numbers, spaces, hyphens, or underscores.');
    }
  }
}