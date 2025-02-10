/**
 * Integration tests for Excel Add-in formula functionality
 * Tests AI-powered formula generation, optimization, and application
 * with comprehensive coverage of performance and accessibility requirements
 * 
 * @version 1.0.0
 * @requires jest@^29.0.0
 * @requires @microsoft/office-js@^1.1.0
 * @requires @testing-library/jest-dom@^5.16.5
 */

import { FormulaService } from '../../src/services/formula.service';
import { 
    mockFormulaRequest,
    mockFormulaSuggestions,
    mockValidationResult,
    createMockFormulaRequest,
    simulateNetworkLatency,
    DEFAULT_RESPONSE_TIME,
    DEFAULT_ERROR_RATE
} from '../mocks/formula.mock';
import { FormulaStyle, ComplexityLevel } from '../../src/types/formula.types';
import { RequestPriority } from '../../src/interfaces/formula.interface';
import { Office } from '@microsoft/office-js';

// Configure Jest for longer-running integration tests
jest.setTimeout(10000);

describe('FormulaService Integration Tests', () => {
    let formulaService: FormulaService;
    let excelContext: Office.Context;

    beforeAll(async () => {
        // Initialize Excel context and formula service
        await Office.onReady();
        formulaService = new FormulaService();
        
        // Set up performance monitoring
        performance.mark('test-suite-start');
    });

    afterAll(async () => {
        // Clean up and generate performance report
        performance.mark('test-suite-end');
        performance.measure('test-suite-duration', 'test-suite-start', 'test-suite-end');
    });

    describe('Formula Generation', () => {
        it('should generate formula suggestions within 2-second SLA', async () => {
            const startTime = performance.now();
            const request = createMockFormulaRequest({
                priority: RequestPriority.HIGH
            });

            const suggestions = await formulaService.generateFormula(request);

            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(2000); // 2-second SLA
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].confidence).toBeGreaterThan(0.5);
        });

        it('should handle complex formula generation with context', async () => {
            const request = createMockFormulaRequest({
                input: 'Calculate total sales with tax by region',
                preferences: {
                    ...mockFormulaRequest.preferences,
                    complexityLevel: ComplexityLevel.ADVANCED
                }
            });

            const suggestions = await formulaService.generateFormula(request);
            expect(suggestions[0].formula).toContain('SUMIFS');
            expect(suggestions[0].explanation).toBeTruthy();
        });

        it('should validate generated formulas for syntax errors', async () => {
            const request = createMockFormulaRequest();
            const suggestions = await formulaService.generateFormula(request);
            
            for (const suggestion of suggestions) {
                const validation = await formulaService.validateFormulaInput(suggestion.formula);
                expect(validation.isValid).toBe(true);
                expect(validation.errors).toHaveLength(0);
            }
        });
    });

    describe('Formula Optimization', () => {
        it('should optimize complex formulas for performance', async () => {
            const complexFormula = '=SUMIFS(Sales[Amount], Sales[Region], "North", Sales[Date], ">="&A1)';
            const startTime = performance.now();

            const optimizedFormula = await formulaService.optimizeFormula(complexFormula);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(1000);
            expect(optimizedFormula).not.toBe(complexFormula);
            expect(optimizedFormula.length).toBeLessThanOrEqual(complexFormula.length);
        });

        it('should maintain formula accuracy after optimization', async () => {
            const originalFormula = '=VLOOKUP(A1, Data!A:B, 2, FALSE)';
            const optimizedFormula = await formulaService.optimizeFormula(originalFormula);

            const validation = await formulaService.validateFormulaInput(optimizedFormula);
            expect(validation.isValid).toBe(true);
            expect(validation.performance.processingTime).toBeLessThan(500);
        });
    });

    describe('Performance and Caching', () => {
        it('should cache and reuse frequent formula suggestions', async () => {
            const request = createMockFormulaRequest();
            
            // First request - should hit API
            const startTime1 = performance.now();
            await formulaService.generateFormula(request);
            const duration1 = performance.now() - startTime1;

            // Second request - should use cache
            const startTime2 = performance.now();
            await formulaService.generateFormula(request);
            const duration2 = performance.now() - startTime2;

            expect(duration2).toBeLessThan(duration1);
        });

        it('should handle concurrent formula requests efficiently', async () => {
            const requests = Array(5).fill(null).map(() => createMockFormulaRequest());
            
            const startTime = performance.now();
            const results = await Promise.all(
                requests.map(req => formulaService.generateFormula(req))
            );
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(4000); // 2s SLA * 2 for concurrent
            expect(results).toHaveLength(requests.length);
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle network errors gracefully', async () => {
            jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
            
            const request = createMockFormulaRequest();
            await expect(formulaService.generateFormula(request))
                .rejects
                .toThrow('Network error');
        });

        it('should retry failed requests with exponential backoff', async () => {
            let attempts = 0;
            jest.spyOn(global, 'fetch').mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    return Promise.reject(new Error('Temporary error'));
                }
                return Promise.resolve(new Response(JSON.stringify(mockFormulaSuggestions)));
            });

            const request = createMockFormulaRequest();
            const result = await formulaService.generateFormula(request);
            
            expect(attempts).toBe(3);
            expect(result).toBeTruthy();
        });
    });

    describe('Internationalization and Localization', () => {
        it('should handle formulas in different locales', async () => {
            const locales = ['en-US', 'fr-FR', 'de-DE', 'ja-JP'];
            
            for (const locale of locales) {
                const request = createMockFormulaRequest({
                    preferences: {
                        ...mockFormulaRequest.preferences,
                        locale
                    }
                });

                const suggestions = await formulaService.generateFormula(request);
                expect(suggestions[0].formula).toBeTruthy();
            }
        });

        it('should format formulas according to locale conventions', async () => {
            const formula = '=SUM(1,5; 2,5; 3,5)';
            const request = createMockFormulaRequest({
                input: formula,
                preferences: {
                    ...mockFormulaRequest.preferences,
                    locale: 'fr-FR'
                }
            });

            const suggestions = await formulaService.generateFormula(request);
            expect(suggestions[0].formula).toMatch(/[0-9],[0-9]/);
        });
    });

    describe('Accessibility and Compliance', () => {
        it('should provide accessible formula explanations', async () => {
            const request = createMockFormulaRequest();
            const suggestions = await formulaService.generateFormula(request);
            
            expect(suggestions[0].explanation).toBeTruthy();
            expect(suggestions[0].explanation.length).toBeGreaterThan(20);
        });

        it('should maintain formula readability after optimization', async () => {
            const formula = '=IF(A1>0,SUMIFS(Sales[Amount],Sales[Region],"North"),0)';
            const optimized = await formulaService.optimizeFormula(formula);
            
            // Check for proper spacing and readability
            expect(optimized).toMatch(/IF\s*\(/);
            expect(optimized).toMatch(/,\s*/);
        });
    });
});