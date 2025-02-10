"""
OpenAI service module for handling AI-powered Excel formula generation and optimization.
Implements enterprise-grade features including caching, retry mechanisms, and comprehensive monitoring.

Version: 1.0.0
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime

import openai  # version: 1.0.0
import redis  # version: 4.0.0
import tenacity  # version: 8.0.0
import aiohttp  # version: 3.8.0
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import Settings
from ..constants import (
    AI_MODEL_CONFIG,
    PROMPT_TEMPLATES,
    FORMULA_GENERATION,
    CACHE_CONFIG,
    ERROR_CODES,
    PERFORMANCE_METRICS
)

class OpenAIService:
    """
    Enhanced service class for managing OpenAI API interactions with enterprise features
    including caching, retry policies, and comprehensive error handling.
    """

    def __init__(self, settings: Settings, cache_config: Optional[Dict] = None):
        """
        Initialize OpenAI service with enhanced configuration and monitoring.

        Args:
            settings: Application settings including OpenAI configuration
            cache_config: Optional Redis cache configuration
        """
        self._settings = settings
        self._logger = logging.getLogger(__name__)
        
        # Initialize OpenAI client
        openai.api_key = settings.openai.api_key
        openai.organization = settings.openai.organization_id
        
        # Configure Redis cache
        self._cache = redis.Redis(
            host=cache_config.get('host', 'localhost'),
            port=cache_config.get('port', 6379),
            db=cache_config.get('db', 0),
            decode_responses=True
        )
        
        # Configure retry policy
        self._retry_config = {
            'stop': stop_after_attempt(settings.max_retries),
            'wait': wait_exponential(multiplier=1, min=4, max=10),
            'retry': self._should_retry,
            'before': self._before_retry,
            'after': self._after_retry
        }

        # Initialize performance metrics
        self._metrics = {
            'requests_total': 0,
            'cache_hits': 0,
            'errors_total': 0,
            'average_response_time': 0
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_formula(
        self,
        description: str,
        context: Dict,
        options: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Generate Excel formula suggestions with caching and retry support.

        Args:
            description: Natural language description of desired formula
            context: Contextual information about the worksheet
            options: Optional parameters for formula generation

        Returns:
            List of formula suggestions with confidence scores
        """
        start_time = datetime.now()
        cache_key = f"formula:{hash(f'{description}:{str(context)}')}"

        try:
            # Check cache first
            if cached_result := self._cache.get(cache_key):
                self._metrics['cache_hits'] += 1
                return self._parse_cached_result(cached_result)

            # Prepare prompt with context
            prompt = PROMPT_TEMPLATES['FORMULA_GENERATION'].format(
                description=description,
                context=self._format_context(context),
                constraints=self._get_constraints(options)
            )

            # Make API call with monitoring
            response = await self._make_api_call(
                model=self._settings.openai.model_name,
                prompt=prompt,
                max_tokens=FORMULA_GENERATION['MAX_FORMULA_LENGTH'],
                temperature=self._settings.openai.temperature,
                top_p=self._settings.openai.model_parameters.get('top_p', 1.0)
            )

            # Process and validate suggestions
            suggestions = self._process_suggestions(response)
            valid_suggestions = self._validate_suggestions(suggestions)

            # Cache successful results
            if valid_suggestions:
                self._cache.setex(
                    cache_key,
                    CACHE_CONFIG['FORMULA_CACHE_TTL'],
                    self._serialize_suggestions(valid_suggestions)
                )

            # Update metrics
            self._update_metrics(start_time)
            
            return valid_suggestions

        except Exception as e:
            self._handle_error(e, 'formula_generation')
            raise

    @retry(stop=stop_after_attempt(3))
    async def optimize_formula(
        self,
        formula: str,
        optimization_options: Optional[Dict] = None
    ) -> Dict:
        """
        Optimize Excel formula using AI with performance monitoring.

        Args:
            formula: Excel formula to optimize
            optimization_options: Optional optimization parameters

        Returns:
            Optimized formula with performance metrics
        """
        start_time = datetime.now()
        cache_key = f"optimize:{hash(formula)}"

        try:
            # Check cache
            if cached_result := self._cache.get(cache_key):
                self._metrics['cache_hits'] += 1
                return self._parse_cached_result(cached_result)

            # Prepare optimization prompt
            prompt = PROMPT_TEMPLATES['FORMULA_OPTIMIZATION'].format(
                formula=formula,
                constraints=self._get_constraints(optimization_options),
                target=PERFORMANCE_METRICS['TARGET_RESPONSE_TIME_MS']
            )

            # Make API call
            response = await self._make_api_call(
                model=self._settings.openai.model_name,
                prompt=prompt,
                max_tokens=FORMULA_GENERATION['MAX_FORMULA_LENGTH'],
                temperature=0.3  # Lower temperature for optimization
            )

            # Process and validate optimization
            optimized = self._process_optimization(response, formula)
            
            # Cache result
            self._cache.setex(
                cache_key,
                CACHE_CONFIG['FORMULA_CACHE_TTL'],
                self._serialize_optimization(optimized)
            )

            # Update metrics
            self._update_metrics(start_time)
            
            return optimized

        except Exception as e:
            self._handle_error(e, 'formula_optimization')
            raise

    async def _make_api_call(self, **kwargs) -> Dict:
        """Make API call to OpenAI with timeout and error handling."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://api.openai.com/v1/completions',
                headers={'Authorization': f'Bearer {self._settings.openai.api_key}'},
                json=kwargs,
                timeout=self._settings.openai.request_timeout / 1000
            ) as response:
                if response.status != 200:
                    raise Exception(f"OpenAI API error: {response.status}")
                return await response.json()

    def _should_retry(self, retry_state: tenacity.RetryCallState) -> bool:
        """Determine if operation should be retried based on error type."""
        exception = retry_state.outcome.exception()
        return isinstance(exception, (
            aiohttp.ClientError,
            redis.RedisError,
            openai.error.RateLimitError,
            openai.error.ServiceUnavailableError
        ))

    def _before_retry(self, retry_state: tenacity.RetryCallState) -> None:
        """Actions to perform before retry attempt."""
        self._logger.warning(
            f"Retrying operation after error: {retry_state.outcome.exception()}"
            f" (attempt {retry_state.attempt_number})"
        )

    def _after_retry(self, retry_state: tenacity.RetryCallState) -> None:
        """Actions to perform after retry attempt."""
        if retry_state.outcome.failed:
            self._metrics['errors_total'] += 1

    def _handle_error(self, error: Exception, operation: str) -> None:
        """Comprehensive error handling with logging and metrics update."""
        error_code = self._get_error_code(error)
        self._logger.error(
            f"Error in {operation}: {error_code} - {str(error)}",
            exc_info=True
        )
        self._metrics['errors_total'] += 1
        
        if self._settings.debug:
            raise error
        else:
            raise Exception(ERROR_CODES.get(error_code, 'Unknown error occurred'))

    def _update_metrics(self, start_time: datetime) -> None:
        """Update service performance metrics."""
        self._metrics['requests_total'] += 1
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        self._metrics['average_response_time'] = (
            (self._metrics['average_response_time'] * (self._metrics['requests_total'] - 1) +
             response_time) / self._metrics['requests_total']
        )

    def _get_error_code(self, error: Exception) -> str:
        """Map exception to error code."""
        error_mapping = {
            openai.error.RateLimitError: 'AI_001',
            openai.error.InvalidRequestError: 'AI_002',
            ValueError: 'AI_003',
            asyncio.TimeoutError: 'AI_004',
            openai.error.InvalidRequestError: 'AI_005'
        }
        return error_mapping.get(type(error), 'AI_002')

    def get_metrics(self) -> Dict:
        """Return current service metrics."""
        return {
            **self._metrics,
            'cache_hit_ratio': (
                self._metrics['cache_hits'] / self._metrics['requests_total']
                if self._metrics['requests_total'] > 0 else 0
            )
        }