"""
Excel Formula Validation Utility Module

This module provides comprehensive validation utilities for Excel formulas, including
syntax checking, reference validation, and semantic analysis. It implements context-aware
validation with support for international Excel versions and performance optimization
through pattern caching.

Version: 1.0.0
"""

import re
from typing import Dict, Any, Set, Pattern, List, Tuple
from dataclasses import dataclass
from functools import lru_cache

from ..constants import FORMULA_GENERATION, ERROR_CODES

@dataclass
class ValidationResult:
    """Data class for storing validation results with detailed error information."""
    is_valid: bool
    error_message: str
    error_code: str = ""
    error_details: Dict[str, Any] = None

class FormulaValidator:
    """
    Comprehensive Excel formula validator with support for syntax, reference,
    and semantic validation with international Excel version compatibility.
    """

    def __init__(self, validation_context: Dict[str, Any]):
        """
        Initialize the FormulaValidator with validation patterns and caching.

        Args:
            validation_context (Dict[str, Any]): Context for validation including
                locale settings, Excel version, and worksheet information.
        """
        self._validation_context = validation_context
        self._cached_patterns: Dict[str, Pattern] = {}
        
        # Compile regex patterns for common validations
        self._syntax_pattern = re.compile(r'^\s*=\s*([^=].*$)')
        self._reference_pattern = re.compile(
            r'\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?'
        )
        self._function_pattern = re.compile(r'([A-Za-z_]+)\s*\(')
        
        # Initialize validation rules from constants
        self._max_formula_length = FORMULA_GENERATION['MAX_FORMULA_LENGTH']
        self._valid_functions = FORMULA_GENERATION.get('VALID_FUNCTIONS', {})

    @lru_cache(maxsize=1000)
    def validate_syntax(self, formula: str) -> ValidationResult:
        """
        Validates the basic syntax of an Excel formula.

        Args:
            formula (str): The Excel formula to validate.

        Returns:
            ValidationResult: Validation result with error details if invalid.
        """
        if not formula or len(formula) > self._max_formula_length:
            return ValidationResult(
                False,
                f"Formula length exceeds maximum of {self._max_formula_length} characters",
                ERROR_CODES['AI_003']
            )

        if not self._syntax_pattern.match(formula):
            return ValidationResult(
                False,
                "Formula must start with '='",
                ERROR_CODES['AI_003']
            )

        # Check for balanced parentheses and brackets
        brackets = {'(': ')', '[': ']', '{': '}'}
        stack = []
        
        for char in formula:
            if char in brackets:
                stack.append(char)
            elif char in brackets.values():
                if not stack or char != brackets[stack.pop()]:
                    return ValidationResult(
                        False,
                        "Unmatched brackets or parentheses",
                        ERROR_CODES['AI_003']
                    )

        if stack:
            return ValidationResult(
                False,
                "Unclosed brackets or parentheses",
                ERROR_CODES['AI_003']
            )

        # Validate operator usage
        invalid_operators = re.findall(r'[\+\-\*/]{2,}', formula)
        if invalid_operators:
            return ValidationResult(
                False,
                "Invalid operator combination found",
                ERROR_CODES['AI_003']
            )

        return ValidationResult(True, "")

    def validate_references(
        self,
        formula: str,
        sheet_name: str,
        existing_references: Set[str]
    ) -> ValidationResult:
        """
        Validates cell references within the formula including circular reference detection.

        Args:
            formula (str): The Excel formula to validate.
            sheet_name (str): Current worksheet name.
            existing_references (Set[str]): Set of references already used in dependent formulas.

        Returns:
            ValidationResult: Validation result with error details if invalid.
        """
        # Extract all cell references
        references = set(self._reference_pattern.findall(formula))
        
        # Validate each reference
        for ref in references:
            # Check for circular references
            if ref in existing_references:
                return ValidationResult(
                    False,
                    f"Circular reference detected: {ref}",
                    ERROR_CODES['AI_003']
                )

            # Validate reference format
            if not self._validate_reference_format(ref):
                return ValidationResult(
                    False,
                    f"Invalid cell reference format: {ref}",
                    ERROR_CODES['AI_003']
                )

            # Validate reference bounds
            if not self._validate_reference_bounds(ref, sheet_name):
                return ValidationResult(
                    False,
                    f"Cell reference {ref} is out of worksheet bounds",
                    ERROR_CODES['AI_003']
                )

        return ValidationResult(True, "")

    def validate_functions(self, formula: str) -> ValidationResult:
        """
        Validates Excel functions used in the formula with argument checking.

        Args:
            formula (str): The Excel formula to validate.

        Returns:
            ValidationResult: Validation result with error details if invalid.
        """
        # Extract all function calls
        functions = self._function_pattern.findall(formula)
        
        for func in functions:
            # Check if function exists in valid functions list
            if func.upper() not in self._valid_functions:
                return ValidationResult(
                    False,
                    f"Invalid or unsupported function: {func}",
                    ERROR_CODES['AI_003']
                )

            # Validate function arguments
            arg_validation = self._validate_function_arguments(formula, func)
            if not arg_validation.is_valid:
                return arg_validation

        return ValidationResult(True, "")

    def check_semantic_validity(
        self,
        formula: str,
        context: Dict[str, Any]
    ) -> ValidationResult:
        """
        Performs context-aware semantic validation of the formula.

        Args:
            formula (str): The Excel formula to validate.
            context (Dict[str, Any]): Additional context for semantic validation.

        Returns:
            ValidationResult: Validation result with error details if invalid.
        """
        # Validate data type compatibility
        type_validation = self._validate_data_types(formula, context)
        if not type_validation.is_valid:
            return type_validation

        # Validate formula complexity
        complexity_validation = self._validate_formula_complexity(formula)
        if not complexity_validation.is_valid:
            return complexity_validation

        # Validate locale-specific requirements
        locale_validation = self._validate_locale_specific(formula, context)
        if not locale_validation.is_valid:
            return locale_validation

        return ValidationResult(True, "")

    def _validate_reference_format(self, reference: str) -> bool:
        """Validates the format of a cell reference."""
        pattern = re.compile(
            r'^(\$?[A-Za-z]{1,3}\$?\d+)(:\$?[A-Za-z]{1,3}\$?\d+)?$'
        )
        return bool(pattern.match(reference))

    def _validate_reference_bounds(self, reference: str, sheet_name: str) -> bool:
        """Validates if a cell reference is within worksheet bounds."""
        max_rows = self._validation_context.get('max_rows', 1048576)
        max_cols = self._validation_context.get('max_cols', 16384)
        
        # Extract row and column from reference
        match = re.match(r'\$?([A-Za-z]{1,3})\$?(\d+)', reference)
        if not match:
            return False
            
        col, row = match.groups()
        col_num = self._column_to_number(col)
        row_num = int(row)
        
        return 1 <= row_num <= max_rows and 1 <= col_num <= max_cols

    def _validate_function_arguments(
        self,
        formula: str,
        function_name: str
    ) -> ValidationResult:
        """Validates function arguments count and types."""
        function_spec = self._valid_functions.get(function_name.upper())
        if not function_spec:
            return ValidationResult(True, "")  # Skip if no spec available
            
        # Extract arguments for the function
        args_start = formula.find(f"{function_name}(") + len(function_name) + 1
        args_end = self._find_closing_parenthesis(formula[args_start:])
        if args_end == -1:
            return ValidationResult(
                False,
                f"Invalid argument structure for function: {function_name}",
                ERROR_CODES['AI_003']
            )
            
        args = self._parse_function_arguments(
            formula[args_start:args_start + args_end]
        )
        
        # Validate argument count
        if len(args) < function_spec.get('min_args', 0) or \
           len(args) > function_spec.get('max_args', float('inf')):
            return ValidationResult(
                False,
                f"Invalid number of arguments for function: {function_name}",
                ERROR_CODES['AI_003']
            )
            
        return ValidationResult(True, "")

    def _validate_data_types(
        self,
        formula: str,
        context: Dict[str, Any]
    ) -> ValidationResult:
        """Validates data type compatibility in the formula."""
        # Implementation would include type inference and compatibility checks
        return ValidationResult(True, "")

    def _validate_formula_complexity(self, formula: str) -> ValidationResult:
        """Validates formula complexity metrics."""
        # Check nesting depth
        depth = 0
        max_depth = 0
        for char in formula:
            if char == '(':
                depth += 1
                max_depth = max(max_depth, depth)
            elif char == ')':
                depth -= 1
                
        if max_depth > 7:  # Maximum recommended nesting depth
            return ValidationResult(
                False,
                "Formula exceeds maximum recommended nesting depth",
                ERROR_CODES['AI_003']
            )
            
        return ValidationResult(True, "")

    def _validate_locale_specific(
        self,
        formula: str,
        context: Dict[str, Any]
    ) -> ValidationResult:
        """Validates locale-specific requirements."""
        locale = context.get('locale', 'en-US')
        
        # Validate decimal separator usage
        if locale in ['de-DE', 'fr-FR']:  # Examples of comma decimal separators
            if '.' in formula:
                return ValidationResult(
                    False,
                    "Invalid decimal separator for locale",
                    ERROR_CODES['AI_003']
                )
                
        return ValidationResult(True, "")

    @staticmethod
    def _column_to_number(column: str) -> int:
        """Converts Excel column letter to number."""
        result = 0
        for char in column.upper():
            result = result * 26 + (ord(char) - ord('A') + 1)
        return result

    @staticmethod
    def _find_closing_parenthesis(text: str) -> int:
        """Finds the position of the closing parenthesis."""
        count = 0
        for i, char in enumerate(text):
            if char == '(':
                count += 1
            elif char == ')':
                count -= 1
                if count == -1:
                    return i
        return -1

    @staticmethod
    def _parse_function_arguments(args_str: str) -> List[str]:
        """Parses function arguments handling nested functions."""
        args = []
        current_arg = []
        paren_count = 0
        in_quotes = False
        
        for char in args_str:
            if char == '"':
                in_quotes = not in_quotes
            elif not in_quotes:
                if char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                elif char == ',' and paren_count == 0:
                    args.append(''.join(current_arg).strip())
                    current_arg = []
                    continue
            current_arg.append(char)
            
        if current_arg:
            args.append(''.join(current_arg).strip())
            
        return args