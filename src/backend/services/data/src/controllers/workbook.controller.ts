import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseFilters,
  UseInterceptors,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException
} from '@nestjs/common'; // ^10.0.0
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
  ApiBody,
  ApiParam
} from '@nestjs/swagger'; // ^7.0.0
import { JwtAuthGuard } from '@nestjs/jwt'; // ^10.0.0
import { RateLimit } from '@nestjs/throttler'; // ^5.0.0

import { WorkbookService } from '../services/workbook.service';
import { IWorkbook, IWorkbookCreate, IWorkbookUpdate } from '../interfaces/workbook.interface';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { User } from '../decorators/user.decorator';

@Controller('workbooks')
@ApiTags('workbooks')
@UseGuards(JwtAuthGuard)
@ApiSecurity('bearer')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(LoggingInterceptor)
export class WorkbookController {
  constructor(private readonly workbookService: WorkbookService) {}

  @Post()
  @RateLimit({ points: 10, duration: 60 })
  @ApiOperation({ summary: 'Create new workbook' })
  @ApiBody({ type: 'IWorkbookCreate' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Workbook created successfully',
    type: 'IWorkbook'
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async createWorkbook(
    @Body() workbookData: IWorkbookCreate,
    @User('id') userId: string
  ): Promise<IWorkbook> {
    try {
      return await this.workbookService.createWorkbook(
        workbookData,
        userId,
        workbookData.dataClassification
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  @RateLimit({ points: 100, duration: 60 })
  @ApiOperation({ summary: 'Get workbook by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Workbook retrieved successfully',
    type: 'IWorkbook'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workbook not found' })
  async getWorkbook(
    @Param('id', new ParseUUIDPipe()) id: string,
    @User('id') userId: string
  ): Promise<IWorkbook> {
    const workbook = await this.workbookService.getWorkbook(id, userId);
    if (!workbook) {
      throw new NotFoundException('Workbook not found');
    }
    return workbook;
  }

  @Put(':id')
  @RateLimit({ points: 20, duration: 60 })
  @ApiOperation({ summary: 'Update workbook' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: 'IWorkbookUpdate' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Workbook updated successfully',
    type: 'IWorkbook'
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workbook not found' })
  async updateWorkbook(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateData: IWorkbookUpdate,
    @User('id') userId: string
  ): Promise<IWorkbook> {
    try {
      return await this.workbookService.updateWorkbook(id, updateData, userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @RateLimit({ points: 10, duration: 60 })
  @ApiOperation({ summary: 'Delete workbook' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Workbook deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workbook not found' })
  async deleteWorkbook(
    @Param('id', new ParseUUIDPipe()) id: string,
    @User('id') userId: string
  ): Promise<void> {
    await this.workbookService.deleteWorkbook(id, userId);
  }

  @Get()
  @RateLimit({ points: 50, duration: 60 })
  @ApiOperation({ summary: 'List workbooks with pagination and filters' })
  @ApiQuery({ name: 'page', type: 'number', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'isActive', type: 'boolean', required: false })
  @ApiQuery({ name: 'classification', type: 'string', required: false })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Workbooks retrieved successfully',
    type: 'IWorkbook',
    isArray: true
  })
  async listWorkbooks(
    @User('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('isActive') isActive?: boolean,
    @Query('classification') classification?: string
  ): Promise<{ items: IWorkbook[]; total: number }> {
    return await this.workbookService.listWorkbooks(
      userId,
      { page, limit },
      { isActive, classification }
    );
  }

  @Post(':id/lock')
  @RateLimit({ points: 20, duration: 60 })
  @ApiOperation({ summary: 'Acquire workbook lock' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'duration', type: 'number', required: false, description: 'Lock duration in minutes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lock acquired successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workbook not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Workbook already locked' })
  async acquireLock(
    @Param('id', new ParseUUIDPipe()) id: string,
    @User('id') userId: string,
    @Query('duration') duration: number = 30
  ): Promise<{ lockToken: string }> {
    const workbook = await this.workbookService.getWorkbook(id, userId);
    if (!workbook) {
      throw new NotFoundException('Workbook not found');
    }
    const lockToken = await workbook.acquireLock(userId, duration);
    await this.workbookService.updateWorkbook(id, workbook, userId);
    return { lockToken };
  }

  @Delete(':id/lock')
  @RateLimit({ points: 20, duration: 60 })
  @ApiOperation({ summary: 'Release workbook lock' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ schema: { type: 'object', properties: { lockToken: { type: 'string' } } } })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Lock released successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workbook not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid lock token' })
  async releaseLock(
    @Param('id', new ParseUUIDPipe()) id: string,
    @User('id') userId: string,
    @Body('lockToken') lockToken: string
  ): Promise<void> {
    const workbook = await this.workbookService.getWorkbook(id, userId);
    if (!workbook) {
      throw new NotFoundException('Workbook not found');
    }
    workbook.releaseLock(userId, lockToken);
    await this.workbookService.updateWorkbook(id, workbook, userId);
  }
}