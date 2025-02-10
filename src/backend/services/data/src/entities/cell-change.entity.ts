import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm'; // ^0.3.17

import { User } from '../entities/user.entity';

// Enum for type safety
enum ChangeType {
  VALUE = 'Value',
  FORMAT = 'Format',
  FORMULA = 'Formula',
  VALIDATION = 'Validation',
  AI_SUGGESTION = 'AISuggestion'
}

// Interface for metadata type safety
interface ICellChangeMetadata {
  formulaContext?: string;
  aiConfidence?: number;
  validationRules?: object;
  formatDetails?: object;
  clientVersion?: string;
  sessionId?: string;
  changeSource?: 'manual' | 'ai' | 'import' | 'automation';
}

@Entity('cell_changes')
@Index(['worksheet_id', 'cell_reference'])
@Index(['changed_at'])
@Index(['batch_id'])
export class CellChange {
  @PrimaryGeneratedColumn('uuid')
  change_id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  cell_reference: string;

  @Column({ type: 'text', nullable: true })
  previous_value: string;

  @Column({ type: 'text', nullable: true })
  new_value: string;

  @Column({ type: 'uuid', nullable: false })
  worksheet_id: string;

  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  changed_at: Date;

  @Column({
    type: 'enum',
    enum: ChangeType,
    default: ChangeType.VALUE
  })
  change_type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  client_info: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  batch_id: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: ICellChangeMetadata;

  @DeleteDateColumn()
  deletedAt: Date;

  constructor() {
    this.changed_at = new Date();
    this.change_type = ChangeType.VALUE;
    this.metadata = {
      changeSource: 'manual',
      clientVersion: process.env.APP_VERSION || '1.0.0',
      sessionId: crypto.randomUUID()
    };
  }

  /**
   * Transforms the cell change entity to a detailed JSON representation
   * including audit data
   * @returns Enhanced JSON representation of the cell change
   */
  toJSON(): Record<string, any> {
    const json: Record<string, any> = {
      change_id: this.change_id,
      cell_reference: this.cell_reference,
      previous_value: this.previous_value,
      new_value: this.new_value,
      worksheet_id: this.worksheet_id,
      user_id: this.user_id,
      changed_at: this.changed_at,
      change_type: this.change_type,
      client_info: this.client_info
    };

    // Include user details if loaded
    if (this.user) {
      json.user = {
        id: this.user.id,
        name: this.user.name,
        email: this.user.email
      };
    }

    // Include batch information if present
    if (this.batch_id) {
      json.batch_id = this.batch_id;
    }

    // Include metadata if exists
    if (this.metadata) {
      json.metadata = this.metadata;
    }

    return json;
  }

  /**
   * Validates the cell change data before saving
   * @returns boolean indicating validation result
   * @throws Error if validation fails
   */
  validate(): boolean {
    // Check required fields
    if (!this.cell_reference || !this.worksheet_id || !this.user_id) {
      throw new Error('Missing required fields');
    }

    // Validate cell reference format (e.g., A1, B2, etc.)
    const cellRefRegex = /^[A-Z]+[1-9][0-9]*$/;
    if (!cellRefRegex.test(this.cell_reference)) {
      throw new Error('Invalid cell reference format');
    }

    // Verify change type is valid
    if (!Object.values(ChangeType).includes(this.change_type as ChangeType)) {
      throw new Error('Invalid change type');
    }

    // Validate metadata format if present
    if (this.metadata) {
      if (this.metadata.aiConfidence && 
          (this.metadata.aiConfidence < 0 || this.metadata.aiConfidence > 1)) {
        throw new Error('AI confidence must be between 0 and 1');
      }

      if (this.metadata.changeSource && 
          !['manual', 'ai', 'import', 'automation'].includes(this.metadata.changeSource)) {
        throw new Error('Invalid change source');
      }
    }

    return true;
  }
}