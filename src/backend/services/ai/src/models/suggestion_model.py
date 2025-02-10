"""
AI-powered Suggestion Model Module

Implements a comprehensive suggestion model for Excel formulas with enhanced validation,
optimization, and monitoring capabilities. Provides robust error handling and performance
tracking for AI-generated formula suggestions.

Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from uuid import uuid4
from datetime import datetime
import json
import logging

from .formula_model import Formula
from ..utils.validation import FormulaValidator
from ..utils.formula_parser import FormulaParser

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class Suggestion:
    """
    Core model class representing an AI-generated Excel formula suggestion with
    comprehensive validation, optimization, and monitoring capabilities.
    """

    # Required input fields
    original_input: str
    formula: Formula
    context: Dict[str, Any]
    confidence_score: float

    # Auto-generated and tracking fields
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)
    performance_metrics: Dict[str, Any] = field(default_factory=dict)
    validation_history: Dict[str, str] = field(default_factory=dict)
    optimization_cache: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """
        Initialize suggestion instance with validation and monitoring setup.
        """
        # Validate input parameters
        if not isinstance(self.original_input, str) or not self.original_input.strip():
            raise ValueError("Original input must be a non-empty string")

        if not isinstance(self.formula, Formula):
            raise ValueError("Formula must be a valid Formula instance")

        if not isinstance(self.context, dict):
            raise ValueError("Context must be a dictionary")

        if not isinstance(self.confidence_score, (int, float)):
            raise ValueError("Confidence score must be numeric")

        # Bound confidence score between 0 and 1
        self.confidence_score = max(0.0, min(1.0, float(self.confidence_score)))

        # Initialize metadata
        self.metadata = {
            'source': 'ai_suggestion',
            'version': '1.0.0',
            'timestamp': self.created_at.isoformat(),
            'input_length': len(self.original_input),
            'formula_length': len(self.formula.expression),
            'context_size': len(json.dumps(self.context))
        }

        # Initialize performance tracking
        self.performance_metrics = {
            'validation_time_ms': 0,
            'optimization_time_ms': 0,
            'total_validations': 0,
            'total_optimizations': 0,
            'error_count': 0
        }

        # Initialize validation history
        self.validation_history = {
            'initial_validation': 'pending',
            'last_validation': None,
            'validation_count': 0
        }

        # Initialize optimization cache
        self.optimization_cache = {
            'original_formula': self.formula.expression,
            'optimized_versions': [],
            'last_optimization': None
        }

        # Perform initial validation
        self._perform_initial_validation()

    def validate(self) -> tuple[bool, str, Dict[str, Any]]:
        """
        Performs comprehensive validation of the suggested formula with detailed error tracking.

        Returns:
            tuple[bool, str, Dict[str, Any]]: Validation result, error message, and validation metadata
        """
        start_time = datetime.utcnow()
        validation_metadata = {}

        try:
            # Create validator instance with context
            validator = FormulaValidator(self.context)

            # Validate formula syntax
            syntax_result = validator.validate_syntax(self.formula.expression)
            if not syntax_result.is_valid:
                return self._handle_validation_failure(
                    syntax_result.error_message,
                    'syntax_error',
                    start_time
                )

            # Validate cell references
            reference_result = validator.validate_references(
                self.formula.expression,
                self.context.get('sheet_name', ''),
                set(self.context.get('existing_references', []))
            )
            if not reference_result.is_valid:
                return self._handle_validation_failure(
                    reference_result.error_message,
                    'reference_error',
                    start_time
                )

            # Validate functions
            function_result = validator.validate_functions(self.formula.expression)
            if not function_result.is_valid:
                return self._handle_validation_failure(
                    function_result.error_message,
                    'function_error',
                    start_time
                )

            # Perform semantic validation
            semantic_result = validator.check_semantic_validity(
                self.formula.expression,
                self.context
            )
            if not semantic_result.is_valid:
                return self._handle_validation_failure(
                    semantic_result.error_message,
                    'semantic_error',
                    start_time
                )

            # Update validation metrics
            validation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self.performance_metrics['validation_time_ms'] = validation_time
            self.performance_metrics['total_validations'] += 1

            # Update validation history
            self.validation_history.update({
                'last_validation': 'success',
                'last_validation_time': datetime.utcnow().isoformat(),
                'validation_count': self.validation_history.get('validation_count', 0) + 1
            })

            validation_metadata = {
                'validation_time_ms': validation_time,
                'validation_count': self.validation_history['validation_count'],
                'confidence_score': self.confidence_score
            }

            return True, "Validation successful", validation_metadata

        except Exception as e:
            logger.error(f"Validation error for suggestion {self.id}: {str(e)}")
            return self._handle_validation_failure(
                str(e),
                'validation_error',
                start_time
            )

    def optimize(self) -> 'Suggestion':
        """
        Optimizes the suggested formula with performance tracking and caching.

        Returns:
            Suggestion: New suggestion instance with optimized formula
        """
        start_time = datetime.utcnow()

        try:
            # Check optimization cache
            cache_key = f"{self.formula.expression}_{self.context.get('optimization_level', 'default')}"
            if cache_key in self.optimization_cache.get('optimized_versions', []):
                return self

            # Validate current suggestion
            is_valid, error_msg, _ = self.validate()
            if not is_valid:
                raise ValueError(f"Cannot optimize invalid formula: {error_msg}")

            # Optimize formula
            optimized_formula = self.formula.optimize()

            # Create new suggestion with optimized formula
            optimized_suggestion = Suggestion(
                original_input=self.original_input,
                formula=optimized_formula,
                context=self.context,
                confidence_score=self.confidence_score
            )

            # Update optimization metrics
            optimization_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            optimized_suggestion.performance_metrics.update({
                'optimization_time_ms': optimization_time,
                'total_optimizations': self.performance_metrics['total_optimizations'] + 1,
                'size_reduction': len(self.formula.expression) - len(optimized_formula.expression),
                'original_complexity': self.formula._analyze_complexity(),
                'optimized_complexity': optimized_formula._analyze_complexity()
            })

            # Update optimization cache
            optimized_suggestion.optimization_cache = {
                'original_formula': self.formula.expression,
                'optimized_versions': self.optimization_cache['optimized_versions'] + [cache_key],
                'last_optimization': datetime.utcnow().isoformat()
            }

            logger.info(f"Formula optimization completed for suggestion {self.id}")
            return optimized_suggestion

        except Exception as e:
            logger.error(f"Optimization error for suggestion {self.id}: {str(e)}")
            raise

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts suggestion to a comprehensive dictionary representation with validation status.

        Returns:
            Dict[str, Any]: Complete dictionary representation of the suggestion
        """
        return {
            'id': self.id,
            'original_input': self.original_input,
            'formula': self.formula.to_dict(),
            'confidence_score': self.confidence_score,
            'context': self.context,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat(),
            'performance_metrics': self.performance_metrics,
            'validation_history': self.validation_history,
            'optimization_cache': self.optimization_cache
        }

    def _perform_initial_validation(self) -> None:
        """
        Performs initial validation of the suggestion during initialization.
        """
        try:
            is_valid, error_msg, metadata = self.validate()
            self.validation_history['initial_validation'] = 'success' if is_valid else 'failed'
            if not is_valid:
                logger.warning(f"Initial validation failed for suggestion {self.id}: {error_msg}")
        except Exception as e:
            logger.error(f"Error during initial validation for suggestion {self.id}: {str(e)}")
            self.validation_history['initial_validation'] = 'error'

    def _handle_validation_failure(
        self,
        error_message: str,
        error_type: str,
        start_time: datetime
    ) -> tuple[bool, str, Dict[str, Any]]:
        """
        Handles validation failures with comprehensive error tracking.
        """
        validation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        self.performance_metrics['validation_time_ms'] = validation_time
        self.performance_metrics['total_validations'] += 1
        self.performance_metrics['error_count'] += 1

        self.validation_history.update({
            'last_validation': 'failed',
            'last_error': error_message,
            'last_error_type': error_type,
            'last_validation_time': datetime.utcnow().isoformat()
        })

        validation_metadata = {
            'validation_time_ms': validation_time,
            'error_type': error_type,
            'validation_count': self.validation_history.get('validation_count', 0) + 1
        }

        return False, error_message, validation_metadata