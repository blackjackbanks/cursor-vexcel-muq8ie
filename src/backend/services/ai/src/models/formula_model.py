"""
Formula Model Module

Implements the core Formula model class for representing, validating, and manipulating Excel formulas.
Provides comprehensive formula handling capabilities with robust error handling and security measures.

Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple

from ..constants import FORMULA_GENERATION, ERROR_CODES
from ..utils.formula_parser import FormulaParser

@dataclass
class Formula:
    """
    Core model class representing an Excel formula with comprehensive validation,
    optimization, and security features.
    """
    
    # Required fields
    expression: str
    sheet_name: str
    confidence_score: float
    
    # Internal state fields with default values
    ast: Dict[str, Any] = field(default_factory=dict)
    dependencies: Dict[str, List[str]] = field(default_factory=dict)
    validation_cache: Dict[str, Any] = field(default_factory=dict)
    optimization_metrics: Dict[str, Any] = field(default_factory=dict)
    validation_errors: List[str] = field(default_factory=list)
    
    # Parser instance
    _parser: FormulaParser = field(default_factory=FormulaParser, init=False)
    
    def __post_init__(self) -> None:
        """
        Initialize formula instance with validation and security checks.
        """
        # Validate input parameters
        if not self.expression or not isinstance(self.expression, str):
            raise ValueError("Formula expression must be a non-empty string")
            
        if not self.sheet_name or not isinstance(self.sheet_name, str):
            raise ValueError("Sheet name must be a non-empty string")
            
        if not isinstance(self.confidence_score, (int, float)):
            raise ValueError("Confidence score must be a numeric value")
            
        # Validate formula length
        if len(self.expression) > FORMULA_GENERATION['MAX_FORMULA_LENGTH']:
            raise ValueError(f"Formula exceeds maximum length of {FORMULA_GENERATION['MAX_FORMULA_LENGTH']} characters")
            
        # Validate confidence score
        if self.confidence_score < FORMULA_GENERATION['MIN_CONFIDENCE_SCORE']:
            raise ValueError(f"Confidence score below minimum threshold of {FORMULA_GENERATION['MIN_CONFIDENCE_SCORE']}")
            
        # Sanitize and normalize formula
        self.expression = self._sanitize_formula(self.expression)
        
        # Initialize validation cache
        self.validation_cache = {
            'last_validated': None,
            'validation_result': None,
            'ast_cache': None
        }
        
        # Initialize optimization metrics
        self.optimization_metrics = {
            'original_length': len(self.expression),
            'optimized_length': None,
            'complexity_score': None,
            'performance_impact': None
        }

    def validate(self) -> Tuple[bool, str]:
        """
        Performs comprehensive formula validation with caching and detailed error reporting.
        
        Returns:
            tuple[bool, str]: Validation result and detailed error message
        """
        # Check validation cache first
        if self.validation_cache['validation_result'] is not None:
            return self.validation_cache['validation_result']
            
        try:
            # Parse formula and generate AST
            parse_result = self._parser.parse(self.expression)
            
            if not parse_result['success']:
                self.validation_errors.append(parse_result['details'])
                return False, parse_result['error']
                
            # Store AST for future use
            self.ast = parse_result['tree']
            self.validation_cache['ast_cache'] = self.ast
            
            # Analyze dependencies
            dependency_result = self._parser.analyze_dependencies(
                self.expression,
                self.sheet_name
            )
            
            if not dependency_result['validation']['success']:
                self.validation_errors.extend(dependency_result['validation']['errors'])
                return False, ERROR_CODES['AI_002']
                
            # Store dependencies
            self.dependencies = dependency_result
            
            # Update validation cache
            validation_result = (True, "Formula validation successful")
            self.validation_cache['validation_result'] = validation_result
            self.validation_cache['last_validated'] = True
            
            return validation_result
            
        except Exception as e:
            error_msg = f"Validation error: {str(e)}"
            self.validation_errors.append(error_msg)
            return False, ERROR_CODES['AI_002']

    def optimize(self) -> 'Formula':
        """
        Optimizes formula structure with performance metrics and confidence adjustment.
        
        Returns:
            Formula: Optimized formula instance with updated metrics
        """
        # Validate current formula state first
        is_valid, error_msg = self.validate()
        if not is_valid:
            raise ValueError(f"Cannot optimize invalid formula: {error_msg}")
            
        try:
            # Create new formula instance for optimization
            optimized = Formula(
                expression=self.expression,
                sheet_name=self.sheet_name,
                confidence_score=self.confidence_score
            )
            
            # Analyze formula complexity
            complexity_metrics = self._analyze_complexity()
            
            # Apply optimization rules based on complexity
            if complexity_metrics['nested_functions'] > 3:
                optimized.expression = self._optimize_nested_functions(self.expression)
                
            if complexity_metrics['reference_chain_length'] > 5:
                optimized.expression = self._optimize_references(self.expression)
                
            # Update optimization metrics
            optimized.optimization_metrics.update({
                'original_length': len(self.expression),
                'optimized_length': len(optimized.expression),
                'complexity_score': complexity_metrics['overall_score'],
                'performance_impact': self._calculate_performance_impact(
                    self.expression,
                    optimized.expression
                )
            })
            
            # Adjust confidence score based on optimization impact
            optimized.confidence_score = self._adjust_confidence_score(
                self.confidence_score,
                optimized.optimization_metrics
            )
            
            # Transfer validation cache if applicable
            if self.validation_cache['ast_cache']:
                optimized.validation_cache['ast_cache'] = self.validation_cache['ast_cache']
                
            return optimized
            
        except Exception as e:
            raise ValueError(f"Optimization failed: {str(e)}")

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts formula to comprehensive dictionary representation with metrics.
        
        Returns:
            Dict[str, Any]: Complete dictionary representation of formula state
        """
        return {
            'expression': self.expression,
            'sheet_name': self.sheet_name,
            'confidence_score': self.confidence_score,
            'ast': self.ast,
            'dependencies': self.dependencies,
            'validation_status': {
                'is_valid': self.validation_cache.get('last_validated', False),
                'errors': self.validation_errors
            },
            'optimization_metrics': self.optimization_metrics,
            'performance_metrics': {
                'length': len(self.expression),
                'complexity': self._analyze_complexity()
            }
        }

    def _sanitize_formula(self, formula: str) -> str:
        """
        Sanitizes and normalizes formula input for security and consistency.
        """
        # Ensure formula starts with '='
        if not formula.startswith('='):
            formula = f'={formula}'
            
        # Remove potentially dangerous characters
        formula = ''.join(char for char in formula if ord(char) < 128)
        
        # Normalize whitespace
        formula = ' '.join(formula.split())
        
        return formula

    def _analyze_complexity(self) -> Dict[str, Any]:
        """
        Analyzes formula complexity with detailed metrics.
        """
        return {
            'length': len(self.expression),
            'nested_functions': self.expression.count('('),
            'reference_chain_length': len(self.dependencies.get('direct', [])),
            'cross_sheet_references': len(self.dependencies.get('cross_sheet', [])),
            'overall_score': self._calculate_complexity_score()
        }

    def _calculate_complexity_score(self) -> float:
        """
        Calculates overall complexity score based on multiple factors.
        """
        score = 0
        score += len(self.expression) / FORMULA_GENERATION['MAX_FORMULA_LENGTH']
        score += self.expression.count('(') * 0.1
        score += len(self.dependencies.get('direct', [])) * 0.2
        score += len(self.dependencies.get('cross_sheet', [])) * 0.3
        return min(score, 1.0)

    def _optimize_nested_functions(self, formula: str) -> str:
        """
        Optimizes nested function calls in the formula.
        """
        # Implementation would optimize nested function structure
        return formula

    def _optimize_references(self, formula: str) -> str:
        """
        Optimizes cell references in the formula.
        """
        # Implementation would optimize reference patterns
        return formula

    def _calculate_performance_impact(self, original: str, optimized: str) -> float:
        """
        Calculates performance impact of optimization.
        """
        original_complexity = len(original) + original.count('(') * 2
        optimized_complexity = len(optimized) + optimized.count('(') * 2
        return 1 - (optimized_complexity / original_complexity)

    def _adjust_confidence_score(self, original_score: float, 
                               optimization_metrics: Dict[str, Any]) -> float:
        """
        Adjusts confidence score based on optimization impact.
        """
        impact = optimization_metrics['performance_impact']
        if impact > 0.2:
            return min(original_score * (1 + impact), 1.0)
        return original_score