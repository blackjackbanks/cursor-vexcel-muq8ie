import { User } from '../entities/user.entity';

/**
 * Base interface for worksheet data needed by workbook
 * Used for establishing relationships between workbooks and worksheets
 */
export interface IWorksheetBase {
  id: string; // UUID
  name: string;
  version: number;
}

/**
 * Comprehensive metadata structure for workbooks
 * Tracks modification, security, and backup information
 */
export interface IWorkbookMetadata {
  lastModifiedBy: string; // UUID of user who last modified
  lastModifiedAt: Date;
  size: number; // Size in bytes
  sheetCount: number;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  lastBackupAt: Date;
}

/**
 * Main workbook interface with complete version control and relationship support
 * Implements enterprise-grade tracking and security features
 */
export interface IWorkbook {
  id: string; // UUID
  name: string;
  metadata: IWorkbookMetadata;
  userId: string; // UUID of owner
  user: User; // Relationship to user entity
  worksheets: IWorksheetBase[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lockExpiresAt: Date | null; // For concurrent access control
  lockedBy: string | null; // UUID of user holding lock
}

/**
 * Interface for workbook creation with required security classification
 * Ensures proper initialization of new workbooks
 */
export interface IWorkbookCreate {
  name: string;
  userId: string; // UUID
  metadata: Partial<IWorkbookMetadata>;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
}

/**
 * Interface for workbook updates with version control support
 * Enables safe modifications to existing workbooks
 */
export interface IWorkbookUpdate {
  name: string;
  metadata: Partial<IWorkbookMetadata>;
  isActive: boolean;
  version: number;
}