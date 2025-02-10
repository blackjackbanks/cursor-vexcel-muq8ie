"""
AI-powered Excel Formula Suggestion Controller

This module implements a high-performance controller for handling formula suggestions
with comprehensive validation, caching, and monitoring capabilities.

Version: 1.0.0
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram
from tenacity import retry, stop_after_attempt, wait_exponential
from redis import Redis

from ..models.suggestion_model import Suggestion
from ..services.openai_service import OpenAIService
from ..utils.validation import FormulaValidator
from ..constants import (
    FORMULA_GENERATION,
    ERROR_CODES,
    PERFORMANCE_METRICS
)

# Initialize router
router = APIRouter()

# Initialize metrics
SUGGESTION_REQUESTS = Counter(
    'suggestion_requests_total',
    'Total number of formula suggestion requests'
)
SUGGESTION_LATENCY = Histogram(
    'suggestion_latency_seconds',
    'Formula suggestion request latency'
)
ERROR_COUNTER = Counter(
    'suggestion_errors_total',
    'Total number of suggestion errors',
    ['error_type']
)

class SuggestionRequest(BaseModel):
    """Pydantic model for formula suggestion request validation."""
    
    description: str = Field(
        ...,
        min_length=1,
        max_length=FORMULA_GENERATION['MAX_CONTEXT_LENGTH'],
        description="Natural language description of desired formula"
    )
    context: Dict[str, Any] = Field(
        ...,
        description="Contextual information about the worksheet"
    )
    constraints: Optional[List[str]] = Field(
        default=[],
        description="Optional constraints for formula generation"
    )
    preferences: Optional[Dict[str, Any]] = Field(
        default={},
        description="User preferences for formula generation"
    )

    class Config:
        schema_extra = {
            "example": {
                "description": "Calculate total sales for each quarter",
                "context": {
                    "sheet_name": "Sales",
                    "selected_range": "A1:D10",
                    "column_headers": ["Q1", "Q2", "Q3", "Q4"]
                },
                "constraints": ["Use SUM function", "Avoid array formulas"],
                "preferences": {
                    "complexity_level": "intermediate",
                    "include_comments": True
                }
            }
        }

class SuggestionController:
    """Controller for handling Excel formula suggestions with enhanced reliability."""

    def __init__(
        self,
        ai_service: OpenAIService,
        config: Dict[str, Any],
        cache: Optional[Redis] = None
    ):
        """Initialize controller with required services and configuration."""
        self._ai_service = ai_service
        self._config = config
        self._cache = cache
        self._validator = FormulaValidator({})
        self._logger = logging.getLogger(__name__)

    @router.post("/suggestions", response_model=List[Dict[str, Any]])
    @SUGGESTION_LATENCY.time()
    async def generate_suggestions(
        self,
        request: SuggestionRequest,
        background_tasks: BackgroundTasks
    ) -> List[Dict[str, Any]]:
        """
        Generate formula suggestions based on natural language input.

        Args:
            request: Validated suggestion request
            background_tasks: FastAPI background tasks handler

        Returns:
            List of validated formula suggestions with confidence scores
        """
        SUGGESTION_REQUESTS.inc()
        start_time = datetime.now()

        try:
            # Validate request context
            self._validate_context(request.context)

            # Generate suggestions with retry mechanism
            suggestions = await self._generate_with_retry(
                request.description,
                request.context,
                request.constraints,
                request.preferences
            )

            # Validate and rank suggestions
            valid_suggestions = await self._validate_suggestions(suggestions)

            # Record metrics in background
            background_tasks.add_task(
                self._record_metrics,
                start_time,
                len(valid_suggestions)
            )

            return [suggestion.to_dict() for suggestion in valid_suggestions]

        except Exception as e:
            error_type = type(e).__name__
            ERROR_COUNTER.labels(error_type=error_type).inc()
            self._logger.error(f"Error generating suggestions: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=ERROR_CODES.get('AI_002', "Failed to generate suggestions")
            )

    @router.post("/suggestions/{suggestion_id}/optimize")
    async def optimize_suggestion(
        self,
        suggestion_id: str,
        background_tasks: BackgroundTasks
    ) -> Dict[str, Any]:
        """
        Optimize an existing formula suggestion.

        Args:
            suggestion_id: Unique identifier of the suggestion
            background_tasks: FastAPI background tasks handler

        Returns:
            Optimized formula suggestion with performance metrics
        """
        try:
            # Retrieve suggestion from cache
            suggestion = await self._get_suggestion(suggestion_id)
            if not suggestion:
                raise HTTPException(status_code=404, detail="Suggestion not found")

            # Optimize suggestion
            optimized = await self._optimize_suggestion(suggestion)

            # Record optimization metrics
            background_tasks.add_task(
                self._record_optimization_metrics,
                suggestion_id,
                optimized
            )

            return optimized.to_dict()

        except HTTPException:
            raise
        except Exception as e:
            self._logger.error(f"Error optimizing suggestion: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=ERROR_CODES.get('AI_002', "Failed to optimize suggestion")
            )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def _generate_with_retry(
        self,
        description: str,
        context: Dict[str, Any],
        constraints: List[str],
        preferences: Dict[str, Any]
    ) -> List[Suggestion]:
        """Generate suggestions with retry mechanism."""
        suggestions = await self._ai_service.generate_formula(
            description=description,
            context=context,
            options={
                "constraints": constraints,
                "preferences": preferences
            }
        )

        return [
            Suggestion(
                original_input=description,
                formula=suggestion['formula'],
                context=context,
                confidence_score=suggestion['confidence']
            )
            for suggestion in suggestions
        ]

    async def _validate_suggestions(
        self,
        suggestions: List[Suggestion]
    ) -> List[Suggestion]:
        """Validate and rank generated suggestions."""
        valid_suggestions = []
        
        for suggestion in suggestions:
            is_valid, error_msg, validation_metrics = suggestion.validate()
            if is_valid and validation_metrics['confidence_score'] >= FORMULA_GENERATION['MIN_CONFIDENCE_SCORE']:
                valid_suggestions.append(suggestion)

        # Sort by confidence score
        return sorted(
            valid_suggestions,
            key=lambda x: x.confidence_score,
            reverse=True
        )

    async def _optimize_suggestion(self, suggestion: Suggestion) -> Suggestion:
        """Optimize suggestion with performance monitoring."""
        return suggestion.optimize()

    def _validate_context(self, context: Dict[str, Any]) -> None:
        """Validate request context."""
        required_fields = {'sheet_name', 'selected_range'}
        missing_fields = required_fields - set(context.keys())
        
        if missing_fields:
            raise ValueError(f"Missing required context fields: {missing_fields}")

    async def _get_suggestion(self, suggestion_id: str) -> Optional[Suggestion]:
        """Retrieve suggestion from cache."""
        if self._cache:
            cached = await self._cache.get(f"suggestion:{suggestion_id}")
            if cached:
                return Suggestion.from_dict(cached)
        return None

    def _record_metrics(
        self,
        start_time: datetime,
        suggestion_count: int
    ) -> None:
        """Record performance metrics."""
        duration = (datetime.now() - start_time).total_seconds()
        SUGGESTION_LATENCY.observe(duration)

    def _record_optimization_metrics(
        self,
        suggestion_id: str,
        optimized: Suggestion
    ) -> None:
        """Record optimization metrics."""
        if self._cache:
            self._cache.setex(
                f"optimization_metrics:{suggestion_id}",
                FORMULA_GENERATION['CACHE_TTL'],
                optimized.to_dict()
            )