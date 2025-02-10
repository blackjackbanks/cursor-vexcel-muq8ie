import { 
    Controller, 
    Post, 
    Get, 
    Body, 
    Param, 
    UseGuards, 
    UseInterceptors,
    UseFilters,
    Logger,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { RateLimit } from '@nestjs/throttler';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { CleaningService } from '../services/cleaning.service';
import { 
    ICleaningRequest, 
    ICleaningResult, 
    ICleaningProgress, 
    CleaningStatus 
} from '../interfaces/cleaning.interface';
import { IAPIResponse } from '@shared/interfaces';
import { AuthGuard } from '../guards/auth.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

/**
 * Controller handling data cleaning operations for Excel worksheets
 * Implements secure, rate-limited endpoints with comprehensive error handling
 * @version 1.0.0
 */
@Controller('api/v1/data/cleaning')
@UseInterceptors(LoggingInterceptor)
@UseFilters(HttpExceptionFilter)
export class CleaningController {
    private readonly logger = new Logger(CleaningController.name);

    constructor(
        private readonly cleaningService: CleaningService
    ) {}

    /**
     * Initiates a data cleaning operation with progress tracking
     * Rate limited to 20 requests per minute per user
     * @param request Cleaning operation parameters
     * @returns API response with cleaning operation details
     */
    @Post()
    @UseGuards(AuthGuard)
    @RateLimit({ limit: 20, ttl: 60000 })
    async cleanData(
        @Body() request: ICleaningRequest
    ): Promise<IAPIResponse<ICleaningResult>> {
        const correlationId = uuidv4();
        
        try {
            this.logger.log({
                message: 'Initiating data cleaning operation',
                correlationId,
                workbookId: request.workbookId,
                worksheetId: request.worksheetId,
                range: request.range
            });

            // Validate request parameters
            this.validateRequest(request);

            // Process cleaning request
            const result = await this.cleaningService.cleanData(request);

            this.logger.log({
                message: 'Data cleaning operation completed successfully',
                correlationId,
                changesApplied: result.changesApplied
            });

            return {
                success: true,
                data: result,
                correlationId
            };

        } catch (error) {
            this.logger.error({
                message: 'Data cleaning operation failed',
                correlationId,
                error: error.message,
                stack: error.stack
            });

            throw new HttpException({
                success: false,
                error: {
                    code: 'DAT-001',
                    message: 'Data cleaning operation failed',
                    details: error.message,
                    correlationId
                }
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Retrieves the progress of an ongoing cleaning operation
     * Rate limited to 300 requests per minute per user
     * @param operationId Unique identifier of the cleaning operation
     * @returns API response with progress details
     */
    @Get(':operationId/progress')
    @UseGuards(AuthGuard)
    @RateLimit({ limit: 300, ttl: 60000 })
    async getProgress(
        @Param('operationId') operationId: string
    ): Promise<IAPIResponse<ICleaningProgress>> {
        const correlationId = uuidv4();

        try {
            this.logger.debug({
                message: 'Retrieving cleaning operation progress',
                correlationId,
                operationId
            });

            if (!this.isValidUUID(operationId)) {
                throw new HttpException({
                    success: false,
                    error: {
                        code: 'DAT-002',
                        message: 'Invalid operation ID format',
                        correlationId
                    }
                }, HttpStatus.BAD_REQUEST);
            }

            const progress = await this.cleaningService.trackProgress(operationId);

            if (!progress) {
                throw new HttpException({
                    success: false,
                    error: {
                        code: 'DAT-003',
                        message: 'Operation not found',
                        correlationId
                    }
                }, HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: progress,
                correlationId
            };

        } catch (error) {
            this.logger.error({
                message: 'Failed to retrieve cleaning operation progress',
                correlationId,
                operationId,
                error: error.message
            });

            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException({
                success: false,
                error: {
                    code: 'DAT-004',
                    message: 'Failed to retrieve progress',
                    details: error.message,
                    correlationId
                }
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Validates cleaning request parameters
     * @param request Cleaning request to validate
     * @throws HttpException if validation fails
     */
    private validateRequest(request: ICleaningRequest): void {
        if (!request.workbookId || !this.isValidUUID(request.workbookId)) {
            throw new HttpException({
                success: false,
                error: {
                    code: 'DAT-005',
                    message: 'Invalid workbook ID'
                }
            }, HttpStatus.BAD_REQUEST);
        }

        if (!request.worksheetId || !this.isValidUUID(request.worksheetId)) {
            throw new HttpException({
                success: false,
                error: {
                    code: 'DAT-006',
                    message: 'Invalid worksheet ID'
                }
            }, HttpStatus.BAD_REQUEST);
        }

        if (!request.range || !this.isValidExcelRange(request.range)) {
            throw new HttpException({
                success: false,
                error: {
                    code: 'DAT-007',
                    message: 'Invalid Excel range format'
                }
            }, HttpStatus.BAD_REQUEST);
        }

        if (!request.options || Object.keys(request.options).length === 0) {
            throw new HttpException({
                success: false,
                error: {
                    code: 'DAT-008',
                    message: 'Cleaning options must be specified'
                }
            }, HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Validates UUID format
     * @param uuid String to validate as UUID
     * @returns boolean indicating if string is valid UUID
     */
    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Validates Excel range notation format
     * @param range String to validate as Excel range
     * @returns boolean indicating if string is valid Excel range
     */
    private isValidExcelRange(range: string): boolean {
        const rangeRegex = /^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$/;
        return rangeRegex.test(range);
    }
}