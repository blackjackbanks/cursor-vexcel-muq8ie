import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm'; // ^0.3.17

// Enums for type safety
enum UserRole {
  BASIC = 'basic',
  POWER = 'power',
  ADMIN = 'admin',
  AUDITOR = 'auditor'
}

enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

// Interface for strongly typed preferences
interface IUserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: {
    email: boolean;
    inApp: boolean;
  };
  security?: {
    mfaEnabled: boolean;
    lastPasswordChange: Date;
    securityQuestions: boolean;
  };
  excel?: {
    defaultFormat: string;
    autoSave: boolean;
    formulaSuggestions: boolean;
  };
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.BASIC
  })
  role: UserRole;

  @Column({
    type: 'jsonb',
    nullable: true
  })
  preferences: IUserPreferences;

  @OneToMany('Workbook', 'user')
  workbooks: Promise<Workbook[]>;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: DataClassification,
    default: DataClassification.CONFIDENTIAL
  })
  dataClassification: DataClassification;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  constructor() {
    this.role = UserRole.BASIC;
    this.isActive = true;
    this.dataClassification = DataClassification.CONFIDENTIAL;
    this.preferences = {
      theme: 'system',
      notifications: {
        email: true,
        inApp: true
      },
      security: {
        mfaEnabled: false,
        lastPasswordChange: new Date(),
        securityQuestions: false
      },
      excel: {
        defaultFormat: 'General',
        autoSave: true,
        formulaSuggestions: true
      }
    };
  }

  /**
   * Transforms the user entity to a secure JSON representation
   * @returns Sanitized user object for API responses
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      preferences: {
        ...this.preferences,
        security: undefined // Remove sensitive security settings
      },
      isActive: this.isActive,
      dataClassification: this.dataClassification,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Securely updates user preferences with validation
   * @param preferences - New preferences to merge with existing ones
   */
  async updatePreferences(preferences: Partial<IUserPreferences>): Promise<void> {
    // Validate preference structure
    if (preferences.security) {
      // Preserve existing security settings
      delete preferences.security;
    }

    // Merge with existing preferences
    this.preferences = {
      ...this.preferences,
      ...preferences,
      // Ensure security settings are preserved
      security: {
        ...this.preferences.security
      }
    };
  }

  /**
   * Validates user data before database operations
   */
  @BeforeInsert()
  @BeforeUpdate()
  async validateData(): Promise<void> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }

    // Validate name
    if (!this.name || this.name.length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    // Ensure preferences structure
    if (!this.preferences) {
      this.preferences = new User().preferences;
    }

    // Validate role permissions
    if (!Object.values(UserRole).includes(this.role)) {
      throw new Error('Invalid user role');
    }

    // Ensure data classification
    if (!Object.values(DataClassification).includes(this.dataClassification)) {
      throw new Error('Invalid data classification');
    }
  }
}