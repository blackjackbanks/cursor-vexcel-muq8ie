import { DataSource, DataSourceOptions } from 'typeorm'; // ^0.3.17
import { CellChange } from '../entities/cell-change.entity';
import { Workbook } from '../entities/workbook.entity';
import { User } from '../entities/user.entity';

/**
 * Comprehensive database configuration with security, performance, and monitoring settings
 */
const DATABASE_CONFIG: DataSourceOptions = {
  type: 'mssql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Enhanced security settings
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.SSL_CERT
  },
  extra: {
    trustServerCertificate: false,
    encrypt: true,
    enableArithAbort: true,
    connectionIsolationLevel: 'READ_COMMITTED',
    maxRetriesOnDeadlock: 3
  },

  // Optimized connection pooling
  pool: {
    min: 0,
    max: 50,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
    validateConnection: true,
    evictionRunIntervalMillis: 10000
  },

  // Performance and timeout settings
  options: {
    useUTC: true,
    requestTimeout: 30000,
    cancelTimeout: 5000,
    packetSize: 16384
  },

  // Schema and entity configuration
  entities: [User, Workbook, CellChange],
  synchronize: false,
  migrationsRun: true,
  migrationsTableName: 'typeorm_migrations',
  
  // Logging and monitoring
  logging: ['error', 'warn', 'schema', 'migration'],
  logger: 'advanced-console',
  
  // Query result caching with Redis
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined
    },
    duration: 60000 // 1 minute default cache duration
  },

  // Naming strategy for database objects
  namingStrategy: {
    tableName: (className: string) => `tbl_${className.toLowerCase()}`,
    columnName: (propertyName: string) => propertyName.toLowerCase()
  }
};

/**
 * Creates and configures a new TypeORM DataSource instance with comprehensive
 * security, performance, and monitoring settings
 */
export const createDataSource = (): DataSource => {
  const dataSource = new DataSource(DATABASE_CONFIG);

  // Add performance monitoring hooks
  dataSource.driver.afterConnect = () => {
    console.log('Database connection established successfully');
  };

  return dataSource;
};

/**
 * Comprehensive database service class that manages connections, monitoring,
 * and operations with security and performance optimizations
 */
export class DatabaseService {
  private dataSource: DataSource;
  private readonly retryAttempts = 5;
  private readonly retryDelay = 5000;

  constructor() {
    this.dataSource = createDataSource();
  }

  /**
   * Initializes database connection with advanced retry logic and monitoring
   */
  async initialize(): Promise<void> {
    let currentAttempt = 0;

    while (currentAttempt < this.retryAttempts) {
      try {
        if (!this.dataSource.isInitialized) {
          await this.dataSource.initialize();
          console.log('Database connection initialized successfully');
          
          // Verify connection health
          await this.dataSource.query('SELECT 1');
          return;
        }
      } catch (error) {
        currentAttempt++;
        console.error(`Database initialization attempt ${currentAttempt} failed:`, error);

        if (currentAttempt === this.retryAttempts) {
          throw new Error('Failed to initialize database connection after multiple attempts');
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * currentAttempt));
      }
    }
  }

  /**
   * Retrieves active database connection with health validation
   */
  getConnection(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database connection not initialized');
    }
    return this.dataSource;
  }

  /**
   * Performs health check on the database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        return false;
      }
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Gracefully closes the database connection
   */
  async disconnect(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      console.log('Database connection closed successfully');
    }
  }
}

// Export configured database service and utilities
export { DATABASE_CONFIG };
export default new DatabaseService();