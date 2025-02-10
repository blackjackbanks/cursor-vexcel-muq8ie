"""
Test suite for SuggestionController class validating formula generation, optimization,
and performance requirements with comprehensive error handling and metrics validation.

Version: 1.0.0
"""

import pytest
import time
from typing import Dict, Any
from unittest.mock import MagicMock

from ..src.controllers.suggestion_controller import SuggestionController
from ..src.constants import FORMULA_GENERATION, PERFORMANCE_METRICS, ERROR_CODES

@pytest.fixture
def suggestion_controller_fixture(mock_openai_service: MagicMock) -> SuggestionController:
    """Provides a configured SuggestionController instance for testing."""
    config = {
        'performance_threshold_ms': PERFORMANCE_METRICS['TARGET_RESPONSE_TIME_MS'],
        'min_confidence_score': FORMULA_GENERATION['MIN_CONFIDENCE_SCORE'],
        'max_suggestions': FORMULA_GENERATION['BATCH_SIZE']
    }
    return SuggestionController(mock_openai_service, config)

@pytest.mark.asyncio
class TestSuggestionController:
    """
    Comprehensive test suite for validating SuggestionController functionality
    including performance and accuracy requirements.
    """

    PERFORMANCE_THRESHOLD_SECONDS = PERFORMANCE_METRICS['TARGET_RESPONSE_TIME_MS'] / 1000
    ACCURACY_THRESHOLD_PERCENT = 0.95  # 95% accuracy requirement

    async def test_generate_suggestions_success(
        self,
        suggestion_controller_fixture: SuggestionController,
        mock_openai_service: MagicMock,
        performance_monitor: Dict[str, Any]
    ) -> None:
        """Tests successful generation of formula suggestions with performance validation."""
        # Arrange
        test_request = {
            "description": "Calculate total sales for Q1 to Q4",
            "context": {
                "sheet_name": "Sales",
                "selected_range": "A1:D10",
                "column_headers": ["Q1", "Q2", "Q3", "Q4"]
            },
            "constraints": ["Use SUM function", "Include all quarters"]
        }

        # Act
        performance_monitor['start_timing']()
        suggestions = await suggestion_controller_fixture.generate_suggestions(test_request)
        response_time = performance_monitor['stop_timing']()

        # Assert - Performance
        assert response_time <= self.PERFORMANCE_THRESHOLD_SECONDS, \
            f"Response time {response_time}s exceeded threshold {self.PERFORMANCE_THRESHOLD_SECONDS}s"

        # Assert - Response Structure
        assert isinstance(suggestions, list), "Should return a list of suggestions"
        assert len(suggestions) > 0, "Should return at least one suggestion"
        
        # Assert - Suggestion Content
        for suggestion in suggestions:
            assert 'formula' in suggestion, "Each suggestion should contain a formula"
            assert 'confidence_score' in suggestion, "Each suggestion should have a confidence score"
            assert suggestion['confidence_score'] >= FORMULA_GENERATION['MIN_CONFIDENCE_SCORE'], \
                "Confidence score should meet minimum threshold"
            assert suggestion['formula'].startswith('='), "Formula should start with '='"

        # Assert - Formula Validation
        first_suggestion = suggestions[0]
        assert 'SUM' in first_suggestion['formula'], "Formula should include requested SUM function"
        assert all(f"Q{i}" in str(first_suggestion['context']) for i in range(1, 5)), \
            "Formula context should include all quarters"

        # Assert - Service Interaction
        mock_openai_service.generate_formula.assert_called_once()
        call_args = mock_openai_service.generate_formula.call_args[0]
        assert call_args[0] == test_request['description'], "Description should match request"
        assert call_args[1] == test_request['context'], "Context should match request"

    async def test_generate_suggestions_validation_error(
        self,
        suggestion_controller_fixture: SuggestionController,
        mock_openai_service: MagicMock
    ) -> None:
        """Tests error handling for invalid suggestion requests."""
        # Arrange
        invalid_request = {
            "description": "",  # Empty description should trigger validation error
            "context": {
                "sheet_name": "Sales",
                "selected_range": "A1:D10"
            }
        }

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await suggestion_controller_fixture.generate_suggestions(invalid_request)

        # Assert - Error Details
        assert "description" in str(exc_info.value).lower(), \
            "Error message should mention invalid description"
        assert not mock_openai_service.generate_formula.called, \
            "AI service should not be called with invalid input"

    async def test_optimize_suggestion_performance(
        self,
        suggestion_controller_fixture: SuggestionController,
        mock_openai_service: MagicMock,
        sample_suggestion: Dict[str, Any],
        performance_monitor: Dict[str, Any]
    ) -> None:
        """Tests suggestion optimization with focus on performance improvements."""
        # Arrange
        original_formula = "=SUM(A1)+SUM(A2)+SUM(A3)"  # Inefficient formula
        sample_suggestion['formula'] = original_formula

        # Act
        performance_monitor['start_timing']()
        optimized = await suggestion_controller_fixture.optimize_suggestion(sample_suggestion)
        optimization_time = performance_monitor['stop_timing']()

        # Assert - Performance
        assert optimization_time <= self.PERFORMANCE_THRESHOLD_SECONDS, \
            f"Optimization time {optimization_time}s exceeded threshold {self.PERFORMANCE_THRESHOLD_SECONDS}s"

        # Assert - Optimization Result
        assert optimized['formula'] != original_formula, "Formula should be optimized"
        assert len(optimized['formula']) < len(original_formula), \
            "Optimized formula should be more concise"
        assert optimized['performance_metrics']['optimization_time_ms'] > 0, \
            "Should include optimization timing"
        assert 'complexity_score' in optimized['performance_metrics'], \
            "Should include complexity metrics"

        # Assert - Service Interaction
        mock_openai_service.optimize_formula.assert_called_once()
        assert mock_openai_service.optimize_formula.call_args[0][0] == original_formula, \
            "Original formula should be passed to optimization"

    async def test_suggestion_batch_processing(
        self,
        suggestion_controller_fixture: SuggestionController,
        mock_openai_service: MagicMock,
        performance_monitor: Dict[str, Any]
    ) -> None:
        """Tests batch processing of multiple suggestions with performance monitoring."""
        # Arrange
        batch_requests = [
            {
                "description": f"Calculate total for column {i}",
                "context": {"sheet_name": "Data", "selected_range": f"{chr(65+i)}1:{chr(65+i)}10"}
            }
            for i in range(3)  # Test with 3 concurrent requests
        ]

        # Act
        performance_monitor['start_timing']()
        results = await asyncio.gather(*[
            suggestion_controller_fixture.generate_suggestions(request)
            for request in batch_requests
        ])
        batch_time = performance_monitor['stop_timing']()

        # Assert - Performance
        assert batch_time <= self.PERFORMANCE_THRESHOLD_SECONDS * 2, \
            "Batch processing should be efficient"
        
        # Assert - Results
        assert len(results) == len(batch_requests), "Should process all requests"
        for result in results:
            assert len(result) > 0, "Each request should yield suggestions"
            assert all(s['confidence_score'] >= FORMULA_GENERATION['MIN_CONFIDENCE_SCORE'] 
                      for s in result), "All suggestions should meet confidence threshold"

    async def test_error_handling_and_recovery(
        self,
        suggestion_controller_fixture: SuggestionController,
        mock_openai_service: MagicMock,
        error_simulator: Dict[str, Any]
    ) -> None:
        """Tests error handling and recovery mechanisms."""
        # Arrange
        test_request = {
            "description": "Calculate average",
            "context": {"sheet_name": "Data", "selected_range": "A1:A10"}
        }
        mock_openai_service.generate_formula.side_effect = [
            Exception(ERROR_CODES['AI_001']),  # First call fails
            {"suggestions": [{"formula": "=AVERAGE(A1:A10)", "confidence_score": 0.95}]}  # Second succeeds
        ]

        # Act
        result = await suggestion_controller_fixture.generate_suggestions(test_request)

        # Assert
        assert len(result) > 0, "Should recover and provide suggestions"
        assert mock_openai_service.generate_formula.call_count == 2, \
            "Should retry after initial failure"
        assert result[0]['formula'] == "=AVERAGE(A1:A10)", \
            "Should return valid formula after recovery"