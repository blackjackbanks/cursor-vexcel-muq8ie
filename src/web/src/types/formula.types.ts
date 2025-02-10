/**
 * @fileoverview Type definitions for formula-related functionality in the AI-enhanced Excel Add-in
 * @version 1.0.0
 * @package @microsoft/office-js@1.1.0
 */

import { RangeSelection } from './excel.types';
import { Office } from '@microsoft/office-js';

/**
 * Enum representing different formula notation styles
 */
export enum FormulaStyle {
    MODERN = 'modern',
    LEGACY = 'legacy',
    R1C1 = 'r1c1'
}

/**
 * Enum representing formula complexity preferences
 */
export enum ComplexityLevel {
    BASIC = 'basic',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced'
}

/**
 * Enum representing different types of formula errors
 */
export enum FormulaErrorType {
    SYNTAX = 'syntax',
    REFERENCE = 'reference',
    TYPE_MISMATCH = 'type_mismatch',
    CIRCULAR_REFERENCE = 'circular_reference'
}

/**
 * Type representing immutable workbook-level context data
 */
export type WorkbookContext = Readonly<{
    sheets: readonly string[];
    namedRanges: Readonly<Record<string, string>>;
    dataTypes: Readonly<Record<string, string>>;
}>;

/**
 * Type representing user-specific formula preferences
 */
export type UserPreferences = Readonly<{
    locale: string;
    formulaStyle: FormulaStyle;
    complexityLevel: ComplexityLevel;
}>;

/**
 * Type representing the complete context for formula operations
 */
export type FormulaContext = Readonly<{
    selectedRange: Readonly<RangeSelection>;
    workbookData: Readonly<WorkbookContext>;
    userPreferences: Readonly<UserPreferences>;
}>;

/**
 * Type representing an AI-generated formula suggestion with confidence scoring
 */
export type FormulaSuggestion = Readonly<{
    formula: string;
    confidence: number;
    explanation: string;
    context: Readonly<Record<string, unknown>>;
}>;

/**
 * Type representing a formula error with position information
 */
export type FormulaError = Readonly<{
    type: FormulaErrorType;
    message: string;
    position: number;
}>;

/**
 * Type representing the result of formula validation
 */
export type FormulaValidationResult = Readonly<{
    isValid: boolean;
    errors: readonly FormulaError[];
    suggestions: readonly FormulaSuggestion[];
}>;

/**
 * Type guard to check if a value is a valid FormulaStyle
 */
export const isFormulaStyle = (value: unknown): value is FormulaStyle => {
    return Object.values(FormulaStyle).includes(value as FormulaStyle);
};

/**
 * Type guard to check if a value is a valid ComplexityLevel
 */
export const isComplexityLevel = (value: unknown): value is ComplexityLevel => {
    return Object.values(ComplexityLevel).includes(value as ComplexityLevel);
};

/**
 * Type guard to check if a value is a valid FormulaErrorType
 */
export const isFormulaErrorType = (value: unknown): value is FormulaErrorType => {
    return Object.values(FormulaErrorType).includes(value as FormulaErrorType);
};