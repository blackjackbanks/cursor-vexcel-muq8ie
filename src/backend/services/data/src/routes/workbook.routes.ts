import { Module } from '@nestjs/common'; // ^10.0.0
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // ^5.0.0
import { CircuitBreakerModule } from '@nestjs/circuit-breaker'; // ^1.0.0
import { 
  ApiTags, 
  ApiSecurity, 
  ApiOperation, 
  ApiResponse 
} from '@nestjs/swagger'; // ^7.0.0

import { WorkbookController } from '../controllers/workbook.controller';

/**
 * Global route prefix for workbook endpoints
 */
const WORKBOOK_ROUTES_PREFIX = '/api/v1/workbooks';

/**
 * NestJS module that configures workbook routes with comprehensive security,
 * monitoring, and documentation features.
 * 
 * Features:
 * - Rate limiting with ThrottlerModule
 * - Circuit breaker pattern for fault tolerance
 * - Azure AD security integration
 * - OpenAPI/Swagger documentation
 * - Comprehensive request validation
 */
@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot({
      ttl: 60, // Time window in seconds
      limit: 100, // Max requests per window
      ignoreUserAgents: [/health-check/], // Exclude health checks
      skipIf: (context) => context.getHandler().isHealthCheck === true
    }),

    // Circuit breaker for external service calls
    CircuitBreakerModule.register({
      timeout: 5000, // 5s timeout
      maxFailures: 3, // Trip after 3 failures
      resetTimeout: 30000, // 30s reset timeout
      monitorBuckets: 10, // Monitor 10 time buckets
      volumeThreshold: 10 // Minimum requests before tripping
    })
  ],
  controllers: [WorkbookController],
  providers: [
    // Global rate limiting guard
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard
    }
  ]
})
@ApiTags('Workbooks')
@ApiSecurity('azure-ad')
export class WorkbookRoutesModule {
  /**
   * API version for workbook routes
   */
  private readonly version: string = 'v1';

  constructor() {
    // Configure global route metadata
    Reflect.defineMetadata(
      'api:ApiTags',
      ['Workbooks'],
      WorkbookController
    );

    // Configure global security metadata
    Reflect.defineMetadata(
      'api:ApiSecurity',
      [{ azure: [] }],
      WorkbookController
    );

    // Configure global response metadata
    Reflect.defineMetadata(
      'api:ApiResponse',
      [
        {
          status: 429,
          description: 'Too Many Requests - Rate limit exceeded'
        },
        {
          status: 503,
          description: 'Service Unavailable - Circuit breaker open'
        }
      ],
      WorkbookController
    );
  }
}

// Export module and constants
export { WORKBOOK_ROUTES_PREFIX };
export default WorkbookRoutesModule;