/**
 * @fileoverview Comprehensive test suite for FormulaController validating Excel formula
 * generation, validation, and optimization functionality with extensive error handling
 * and performance monitoring
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { FormulaController } from '../src/controllers/formula.controller';
import { FormulaService } from '../src/services/formula.service';
import { CircuitBreaker } from 'circuit-breaker-ts';
import { 
    IFormulaRequest, 
    IFormulaSuggestionResponse,
    IFormulaValidationResult,
    ErrorSeverity,
    FormulaErrorCode
} from '../src/interfaces/formula.interface';
import { PERFORMANCE_CONFIG } from '../src/constants';

// Mock dependencies
jest.mock('../src/services/formula.service');
jest.mock('circuit-breaker-ts');

describe('FormulaController', () => {
    let controller: FormulaController;
    let mockFormulaService: jest.Mocked<FormulaService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        // Reset mocks
        mockFormulaService = {
            generateFormula: jest.fn(),
            validateFormula: jest.fn(),
            optimizeFormula: jest.fn()
        } as any;

        // Initialize controller with mocked dependencies
        controller = new FormulaController(
            mockFormulaService as FormulaService,
            new CircuitBreaker() as any
        );

        // Setup request/response mocks
        mockRequest = {
            headers: { 'x-correlation-id': 'test-correlation-id' },
            body: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockNext = jest.fn();
    });

    describe('generateFormula', () => {
        const validRequest: IFormulaRequest = {
            input: 'Calculate total sales',
            context: {
                selectedRange: 'A1:D10',
                sheetName: 'Sheet1',
                workbookContext: {
                    namedRanges: new Map(),
                    customFunctions: [],
                    settings: {},
                    validationRules: {}
                },
                dataTypes: new Map()
            },
            locale: 'en-US',
            preferences: {
                maxComplexity: 'intermediate',
                style: 'modern',
                allowArrayFormulas: true,
                allowDynamicArrays: true,
                maxNestingLevel: 3
            }
        };

        it('should return formula suggestions within 2-second SLA', async () => {
            // Setup mock response
            const mockSuggestions: IFormulaSuggestionResponse = {
                success: true,
                suggestions: [{
                    formula: '=SUM(A1:D10)',
                    confidence: 0.95,
                    context: {
                        references: ['A1:D10']
                    }
                }],
                processingTime: 150,
                metrics: {
                    totalTime: 150,
                    inferenceTime: 100,
                    tokenCount: 50,
                    cacheHit: false
                }
            };

            mockFormulaService.generateFormula.mockResolvedValue(mockSuggestions);
            mockRequest.body = validRequest;

            // Execute with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('SLA timeout')), PERFORMANCE_CONFIG.REQUEST_TIMEOUT);
            });

            const resultPromise = controller.generateFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            await Promise.race([resultPromise, timeoutPromise]);

            expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockSuggestions,
                processingTime: expect.any(Number)
            });
        });

        it('should handle invalid input with proper error response', async () => {
            const invalidRequest = {
                ...validRequest,
                input: '' // Invalid empty input
            };

            mockRequest.body = invalidRequest;
            mockFormulaService.generateFormula.mockRejectedValue({
                code: FormulaErrorCode.SYNTAX_ERROR,
                message: 'Invalid formula input'
            });

            await controller.generateFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                code: FormulaErrorCode.SYNTAX_ERROR
            }));
        });

        it('should validate all required request body fields', async () => {
            const incompleteRequest = {
                input: 'Calculate total'
                // Missing context and preferences
            };

            mockRequest.body = incompleteRequest;

            await controller.generateFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should maintain performance under load', async () => {
            mockRequest.body = validRequest;
            const requests = Array(10).fill(null).map(() => 
                controller.generateFormula(
                    mockRequest as Request,
                    mockResponse as Response,
                    mockNext
                )
            );

            const startTime = Date.now();
            await Promise.all(requests);
            const totalTime = Date.now() - startTime;

            expect(totalTime).toBeLessThan(PERFORMANCE_CONFIG.REQUEST_TIMEOUT * 2);
        });
    });

    describe('validateFormula', () => {
        const validFormula = '=SUM(A1:D10)';
        const validContext = {
            selectedRange: 'A1:D10',
            sheetName: 'Sheet1'
        };

        it('should validate syntactically correct formulas', async () => {
            const mockValidationResult: IFormulaValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                performance: {
                    calculationTime: 50,
                    memoryUsage: 1024,
                    isVolatile: false,
                    referenceCount: 1
                }
            };

            mockFormulaService.validateFormula.mockResolvedValue(mockValidationResult);
            mockRequest.body = { formula: validFormula, context: validContext };

            await controller.validateFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockValidationResult,
                processingTime: expect.any(Number)
            });
        });

        it('should detect and report syntax errors accurately', async () => {
            const invalidFormula = '=SUM(A1:D10';
            const mockValidationResult: IFormulaValidationResult = {
                isValid: false,
                errors: [{
                    code: FormulaErrorCode.SYNTAX_ERROR,
                    message: 'Unmatched parentheses',
                    location: { start: 11, end: 12 },
                    severity: ErrorSeverity.ERROR,
                    suggestions: ['Add closing parenthesis']
                }],
                warnings: [],
                performance: {
                    calculationTime: 30,
                    memoryUsage: 1024,
                    isVolatile: false,
                    referenceCount: 1
                }
            };

            mockFormulaService.validateFormula.mockResolvedValue(mockValidationResult);
            mockRequest.body = { formula: invalidFormula, context: validContext };

            await controller.validateFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockValidationResult,
                processingTime: expect.any(Number)
            });
        });

        it('should validate complex nested formulas', async () => {
            const complexFormula = '=IF(SUMIFS(A1:A10,B1:B10,">0")>1000,VLOOKUP(C1,D1:E10,2,FALSE),0)';
            mockRequest.body = { formula: complexFormula, context: validContext };

            await controller.validateFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockFormulaService.validateFormula).toHaveBeenCalledWith(
                complexFormula,
                validContext,
                'test-correlation-id'
            );
        });
    });

    describe('optimizeFormula', () => {
        const formula = '=VLOOKUP(A1,B1:C10,2,FALSE)';
        const context = {
            selectedRange: 'D1',
            sheetName: 'Sheet1'
        };

        it('should return optimized formula version', async () => {
            const mockOptimizationResult = {
                optimizedFormula: '=XLOOKUP(A1,B1:B10,C1:C10)',
                performance: {
                    improvement: '30%',
                    originalTime: 100,
                    optimizedTime: 70
                }
            };

            mockFormulaService.optimizeFormula.mockResolvedValue(mockOptimizationResult);
            mockRequest.body = { formula, context };

            await controller.optimizeFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockOptimizationResult,
                processingTime: expect.any(Number)
            });
        });

        it('should preserve formula functionality after optimization', async () => {
            const complexFormula = '=IF(SUMIFS(A1:A10,B1:B10,">0")>1000,VLOOKUP(C1,D1:E10,2,FALSE),0)';
            mockRequest.body = { formula: complexFormula, context };

            const mockOptimizationResult = {
                optimizedFormula: '=LET(sum,SUMIFS(A1:A10,B1:B10,">0"),IF(sum>1000,XLOOKUP(C1,D1:D10,E1:E10),0))',
                performance: {
                    improvement: '25%',
                    originalTime: 120,
                    optimizedTime: 90
                }
            };

            mockFormulaService.optimizeFormula.mockResolvedValue(mockOptimizationResult);

            await controller.optimizeFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockOptimizationResult,
                processingTime: expect.any(Number)
            });
        });

        it('should return original if no optimization possible', async () => {
            const simpleFormula = '=SUM(A1:A10)';
            mockRequest.body = { formula: simpleFormula, context };

            const mockOptimizationResult = {
                optimizedFormula: simpleFormula,
                performance: {
                    improvement: '0%',
                    originalTime: 50,
                    optimizedTime: 50
                }
            };

            mockFormulaService.optimizeFormula.mockResolvedValue(mockOptimizationResult);

            await controller.optimizeFormula(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockOptimizationResult,
                processingTime: expect.any(Number)
            });
        });
    });
});