"""
Test suite for FormulaController class validating formula generation, optimization,
and validation with comprehensive test coverage and performance monitoring.

Version: 1.0.0
"""

import pytest
import asyncio
import time
from typing import Dict, Any, List
from datetime import datetime

from fastapi.testclient import TestClient  # version: 0.95.0
from ..src.controllers.formula_controller import FormulaController
from ..src.models.formula_model import Formula
from ..src.constants import (
    FORMULA_GENERATION,
    ERROR_CODES,
    PERFORMANCE_METRICS,
    CACHE_CONFIG
)

# Test data constants
TEST_FORMULAS = {
    'simple': '=SUM(A1:A10)',
    'complex': '=IF(VLOOKUP(A1,Sheet2!B2:C10,2,FALSE)>100,SUMIFS(D1:D10,E1:E10,">=50"),0)',
    'nested': '=IF(AND(A1>0,OR(B1="Yes",C1>100)),SUMPRODUCT(D1:D10,E1:E10),0)',
    'array': '=SUM(IF(A1:A10>0,B1:B10,0))',
    'error_syntax': '=SUM(A1:A10,)',
    'error_circular': '=A1+B1',
    'error_reference': '=SUM(XFD1048577:XFD1048578)'
}

TEST_DESCRIPTIONS = {
    'en': 'Calculate total sales for products with price greater than $100',
    'complex': 'Find the weighted average of sales by region, excluding outliers above 3 standard deviations',
    'error': 'Sum all values but include circular reference'
}

TEST_CONTEXTS = {
    'standard': {
        'sheet_name': 'Sheet1',
        'selected_range': 'A1:D10',
        'data_types': {'A': 'number', 'B': 'text', 'C': 'date', 'D': 'currency'}
    },
    'complex': {
        'sheet_name': 'Sales',
        'selected_range': 'A1:F100',
        'data_types': {'A': 'text', 'B': 'number', 'C': 'currency', 'D': 'date', 'E': 'number', 'F': 'percentage'},
        'headers': ['Product', 'Quantity', 'Price', 'Date', 'Region', 'Discount']
    }
}

PERFORMANCE_THRESHOLDS = {
    'response_time_ms': PERFORMANCE_METRICS['TARGET_RESPONSE_TIME_MS'],
    'memory_mb': PERFORMANCE_METRICS['MEMORY_THRESHOLD_MB'],
    'cpu_percent': PERFORMANCE_METRICS['CPU_THRESHOLD_PERCENT']
}

@pytest.fixture
async def controller(mocker):
    """Initialize FormulaController with mocked dependencies."""
    ai_service = mocker.Mock()
    cache_client = mocker.Mock()
    background_tasks = mocker.Mock()
    
    controller = FormulaController(ai_service, cache_client, background_tasks)
    return controller

@pytest.mark.asyncio
@pytest.mark.timeout(3)
async def test_generate_formula_success(controller: FormulaController, test_context: Dict[str, Any]):
    """
    Test successful formula generation with performance validation.
    """
    # Arrange
    description = TEST_DESCRIPTIONS['en']
    context = TEST_CONTEXTS['standard']
    expected_suggestions = [
        {'formula': TEST_FORMULAS['simple'], 'confidence': 0.95},
        {'formula': TEST_FORMULAS['complex'], 'confidence': 0.85}
    ]
    controller._ai_service.generate_formula.return_value = expected_suggestions

    # Act
    start_time = time.time()
    response = await controller.generate_formula({
        'description': description,
        'sheet_name': context['sheet_name'],
        'context': context
    })
    response_time = (time.time() - start_time) * 1000

    # Assert - Response Structure
    assert response['suggestions'] is not None
    assert len(response['suggestions']) > 0
    assert 'metadata' in response
    
    # Assert - Performance
    assert response_time < PERFORMANCE_THRESHOLDS['response_time_ms']
    assert response['metadata']['performance_metrics']['response_time_ms'] < PERFORMANCE_THRESHOLDS['response_time_ms']

    # Assert - Formula Validation
    for suggestion in response['suggestions']:
        formula = Formula(
            expression=suggestion['formula'],
            sheet_name=context['sheet_name'],
            confidence_score=suggestion['confidence']
        )
        is_valid, _ = formula.validate()
        assert is_valid

    # Assert - Cache Behavior
    controller._cache.get.assert_called_once()
    controller._cache.setex.assert_called_once()

@pytest.mark.asyncio
async def test_optimize_formula_complex(controller: FormulaController, complex_formula: Formula):
    """
    Test formula optimization with complex nested formulas.
    """
    # Arrange
    formula = TEST_FORMULAS['complex']
    optimization_request = {
        'formula': formula,
        'sheet_name': 'Sheet1',
        'preserve_structure': True,
        'complexity_target': 5
    }
    
    expected_optimization = {
        'formula': '=SUMIFS(D1:D10,E1:E10,">=50")',
        'confidence': 0.9,
        'metrics': {
            'original_length': len(formula),
            'optimized_length': 32,
            'complexity_reduction': 0.4
        }
    }
    controller._ai_service.optimize_formula.return_value = expected_optimization

    # Act
    start_time = time.time()
    response = await controller.optimize_formula(optimization_request)
    response_time = (time.time() - start_time) * 1000

    # Assert - Response Structure
    assert 'original' in response
    assert 'optimized' in response
    assert 'optimization_metrics' in response
    assert 'performance_metrics' in response

    # Assert - Performance
    assert response_time < PERFORMANCE_THRESHOLDS['response_time_ms']
    
    # Assert - Optimization Quality
    assert len(response['optimized']['expression']) < len(response['original']['expression'])
    assert response['optimization_metrics']['complexity_reduction'] > 0
    
    # Validate optimized formula
    optimized_formula = Formula(
        expression=response['optimized']['expression'],
        sheet_name='Sheet1',
        confidence_score=response['optimized']['confidence_score']
    )
    is_valid, _ = optimized_formula.validate()
    assert is_valid

@pytest.mark.asyncio
async def test_validate_formula_comprehensive(controller: FormulaController, test_formulas: List[Formula]):
    """
    Test comprehensive formula validation including edge cases.
    """
    # Test valid formulas
    for formula_type in ['simple', 'complex', 'nested', 'array']:
        formula = TEST_FORMULAS[formula_type]
        response = await controller.validate_formula(formula, 'Sheet1')
        
        assert response['is_valid']
        assert 'validation_details' in response
        assert 'formula_metrics' in response
        assert response['suggestions'] == []

    # Test invalid formulas
    error_cases = [
        ('error_syntax', 'Invalid formula syntax'),
        ('error_circular', 'Circular reference detected'),
        ('error_reference', 'Invalid cell reference')
    ]
    
    for error_type, expected_error in error_cases:
        formula = TEST_FORMULAS[error_type]
        response = await controller.validate_formula(formula, 'Sheet1')
        
        assert not response['is_valid']
        assert expected_error in response['validation_details']['error_message']
        assert len(response['suggestions']) > 0
        assert all(isinstance(s, dict) for s in response['suggestions'])

@pytest.mark.asyncio
async def test_formula_generation_error_handling(controller: FormulaController):
    """
    Test error handling in formula generation.
    """
    # Arrange
    controller._ai_service.generate_formula.side_effect = Exception("AI service error")
    
    # Act & Assert
    with pytest.raises(Exception) as exc_info:
        await controller.generate_formula({
            'description': TEST_DESCRIPTIONS['error'],
            'sheet_name': 'Sheet1',
            'context': TEST_CONTEXTS['standard']
        })
    
    assert str(exc_info.value) == ERROR_CODES['AI_002']
    assert controller._metrics['errors_total'] > 0

@pytest.mark.asyncio
async def test_formula_validation_performance(controller: FormulaController):
    """
    Test validation performance with large formulas.
    """
    # Arrange
    large_formula = '=' + '*'.join([f'A{i}' for i in range(1, 1000)])
    
    # Act
    start_time = time.time()
    response = await controller.validate_formula(large_formula, 'Sheet1')
    validation_time = (time.time() - start_time) * 1000

    # Assert
    assert validation_time < PERFORMANCE_THRESHOLDS['response_time_ms']
    assert 'performance_metrics' in response
    assert response['formula_metrics']['complexity_score'] > 0.7

@pytest.mark.asyncio
async def test_formula_caching_behavior(controller: FormulaController):
    """
    Test caching behavior for formula operations.
    """
    # Arrange
    cache_key = f"formula:{hash(TEST_DESCRIPTIONS['en'])}"
    cached_response = {
        'suggestions': [{'formula': TEST_FORMULAS['simple'], 'confidence': 0.9}],
        'metadata': {'cache_hit': True}
    }
    controller._cache.get.return_value = controller._serialize_cache(cached_response)

    # Act
    response = await controller.generate_formula({
        'description': TEST_DESCRIPTIONS['en'],
        'sheet_name': 'Sheet1',
        'context': TEST_CONTEXTS['standard']
    })

    # Assert
    assert response['metadata']['cache_hit']
    assert controller._cache.get.called_with(cache_key)
    assert not controller._ai_service.generate_formula.called

@pytest.mark.asyncio
async def test_concurrent_formula_requests(controller: FormulaController):
    """
    Test handling of concurrent formula requests.
    """
    # Arrange
    num_concurrent = 5
    requests = [
        {
            'description': TEST_DESCRIPTIONS['en'],
            'sheet_name': 'Sheet1',
            'context': TEST_CONTEXTS['standard']
        }
        for _ in range(num_concurrent)
    ]

    # Act
    start_time = time.time()
    responses = await asyncio.gather(*[
        controller.generate_formula(req)
        for req in requests
    ])
    total_time = (time.time() - start_time) * 1000

    # Assert
    assert len(responses) == num_concurrent
    assert total_time < PERFORMANCE_THRESHOLDS['response_time_ms'] * 2
    assert all(r['suggestions'] for r in responses)