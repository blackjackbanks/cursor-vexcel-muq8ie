"""
Pytest configuration and fixtures for AI service testing.
Provides comprehensive test components for formula generation, validation,
performance monitoring, and error handling with async support.

Version: 1.0.0
"""

import pytest
import asyncio
from datetime import datetime
from typing import Dict, Any, Callable
from unittest.mock import MagicMock, AsyncMock

from ..src.models.formula_model import Formula
from ..src.models.suggestion_model import Suggestion
from ..src.services.openai_service import OpenAIService
from ..src.constants import (
    FORMULA_GENERATION,
    PERFORMANCE_METRICS,
    ERROR_CODES
)

@pytest.fixture
def mock_openai_service(mocker) -> MagicMock:
    """
    Fixture providing a mocked OpenAI service with performance monitoring 
    and error simulation capabilities.
    """
    mock_service = MagicMock(spec=OpenAIService)
    
    # Configure generate_formula mock with timing simulation
    async def mock_generate_formula(description: str, context: Dict, options: Dict = None) -> Dict:
        await asyncio.sleep(0.1)  # Simulate API latency
        
        if "error" in description.lower():
            raise Exception(ERROR_CODES['AI_002'])
            
        return {
            'suggestions': [
                {
                    'formula': '=SUM(A1:A10)',
                    'confidence_score': 0.95,
                    'metadata': {
                        'processing_time_ms': 150,
                        'model_version': 'gpt-4'
                    }
                }
            ],
            'performance_metrics': {
                'response_time_ms': 150,
                'token_count': 100
            }
        }
    
    mock_service.generate_formula = AsyncMock(side_effect=mock_generate_formula)
    
    # Configure validate_syntax mock
    async def mock_validate_syntax(formula: str) -> Dict:
        await asyncio.sleep(0.05)  # Simulate validation time
        
        if "invalid" in formula.lower():
            return {
                'is_valid': False,
                'error_message': ERROR_CODES['AI_003'],
                'error_details': {'position': 0}
            }
            
        return {
            'is_valid': True,
            'validation_time_ms': 50
        }
    
    mock_service.validate_syntax = AsyncMock(side_effect=mock_validate_syntax)
    
    # Add performance monitoring
    mock_service.metrics = {
        'requests_total': 0,
        'cache_hits': 0,
        'errors_total': 0,
        'average_response_time': 0
    }
    
    return mock_service

@pytest.fixture
def performance_monitor() -> Dict[str, Any]:
    """
    Fixture providing utilities for monitoring and validating response times
    against SLA requirements.
    """
    timings = []
    start_time = None
    
    def start_timing():
        nonlocal start_time
        start_time = datetime.now()
    
    def stop_timing():
        if start_time:
            duration = (datetime.now() - start_time).total_seconds() * 1000
            timings.append(duration)
            return duration
        return 0
    
    def validate_sla(max_time: float = PERFORMANCE_METRICS['TARGET_RESPONSE_TIME_MS']):
        return all(t <= max_time for t in timings)
    
    def get_stats():
        if not timings:
            return {'min': 0, 'max': 0, 'avg': 0, 'count': 0}
        return {
            'min': min(timings),
            'max': max(timings),
            'avg': sum(timings) / len(timings),
            'count': len(timings)
        }
    
    return {
        'start_timing': start_timing,
        'stop_timing': stop_timing,
        'validate_sla': validate_sla,
        'get_stats': get_stats,
        'clear': lambda: timings.clear()
    }

@pytest.fixture
def error_simulator() -> Dict[str, Callable]:
    """
    Fixture providing utilities for simulating various error scenarios
    and validating error handling.
    """
    error_counts = {code: 0 for code in ERROR_CODES.keys()}
    
    def simulate_error(error_code: str):
        if error_code not in ERROR_CODES:
            raise ValueError(f"Invalid error code: {error_code}")
        error_counts[error_code] += 1
        raise Exception(ERROR_CODES[error_code])
    
    def get_error_counts():
        return error_counts.copy()
    
    def validate_error_handling(error_code: str, handler_fn: Callable):
        try:
            simulate_error(error_code)
        except Exception as e:
            return handler_fn(e)
    
    return {
        'simulate_error': simulate_error,
        'get_error_counts': get_error_counts,
        'validate_error_handling': validate_error_handling,
        'reset_counts': lambda: error_counts.clear()
    }

@pytest.fixture
def async_context():
    """
    Fixture providing async test context with timeout management
    and cleanup utilities.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def run_async(coroutine, timeout=FORMULA_GENERATION['TIMEOUT_MS'] / 1000):
        try:
            return await asyncio.wait_for(coroutine, timeout=timeout)
        except asyncio.TimeoutError:
            raise Exception(ERROR_CODES['AI_004'])
    
    def cleanup():
        loop.close()
    
    yield {
        'loop': loop,
        'run_async': run_async,
        'cleanup': cleanup
    }
    
    cleanup()

@pytest.fixture
def sample_formula() -> Formula:
    """Fixture providing a sample Formula instance for testing."""
    return Formula(
        expression="=SUM(A1:A10)",
        sheet_name="Sheet1",
        confidence_score=0.95
    )

@pytest.fixture
def sample_suggestion(sample_formula) -> Suggestion:
    """Fixture providing a sample Suggestion instance for testing."""
    return Suggestion(
        original_input="Sum values in column A from row 1 to 10",
        formula=sample_formula,
        context={
            'sheet_name': 'Sheet1',
            'selected_range': 'A1:A10',
            'locale': 'en-US'
        },
        confidence_score=0.95
    )