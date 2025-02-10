"""
Constants module for AI service configuration.

This module centralizes all configuration constants used throughout the AI service,
including model settings, performance thresholds, error codes, and templates.

Version: 1.0.0
"""

import os

# GPT-4 Model Configuration
AI_MODEL_CONFIG = {
    'MODEL_NAME': os.getenv('AI_MODEL_NAME', 'gpt-4'),
    'MAX_TOKENS': int(os.getenv('AI_MAX_TOKENS', 8192)),
    'TEMPERATURE': float(os.getenv('AI_TEMPERATURE', 0.7)),
    'TOP_P': float(os.getenv('AI_TOP_P', 1.0)),
    'FREQUENCY_PENALTY': float(os.getenv('AI_FREQUENCY_PENALTY', 0.0)),
    'PRESENCE_PENALTY': float(os.getenv('AI_PRESENCE_PENALTY', 0.0)),
    'FINE_TUNING_DATASET_SIZE': os.getenv('AI_FINE_TUNING_DATASET_SIZE', '1M+'),
    'FINE_TUNING_EPOCHS': int(os.getenv('AI_FINE_TUNING_EPOCHS', 3)),
    'MODEL_TIMEOUT': int(os.getenv('AI_MODEL_TIMEOUT', 5000)),
    'MAX_RETRIES': int(os.getenv('AI_MAX_RETRIES', 3))
}

# Formula Generation Parameters
FORMULA_GENERATION = {
    'MAX_RETRIES': int(os.getenv('FORMULA_MAX_RETRIES', 3)),
    'TIMEOUT_MS': int(os.getenv('FORMULA_TIMEOUT_MS', 2000)),
    'BATCH_SIZE': int(os.getenv('FORMULA_BATCH_SIZE', 5)),
    'MIN_CONFIDENCE_SCORE': float(os.getenv('FORMULA_MIN_CONFIDENCE', 0.8)),
    'MAX_FORMULA_LENGTH': int(os.getenv('FORMULA_MAX_LENGTH', 1000)),
    'MAX_CONTEXT_LENGTH': int(os.getenv('FORMULA_MAX_CONTEXT', 5000)),
    'PARALLEL_REQUESTS': int(os.getenv('FORMULA_PARALLEL_REQUESTS', 10))
}

# Cache Configuration
CACHE_CONFIG = {
    'FORMULA_CACHE_TTL': int(os.getenv('CACHE_FORMULA_TTL', 3600)),
    'SUGGESTION_CACHE_TTL': int(os.getenv('CACHE_SUGGESTION_TTL', 1800)),
    'MAX_CACHE_SIZE': int(os.getenv('CACHE_MAX_SIZE', 10000)),
    'CACHE_CLEANUP_INTERVAL': int(os.getenv('CACHE_CLEANUP_INTERVAL', 300)),
    'CACHE_HIT_RATIO_TARGET': float(os.getenv('CACHE_HIT_RATIO_TARGET', 0.8))
}

# Error Codes and Messages
ERROR_CODES = {
    'AI_001': 'AI Service Unavailable - Service is temporarily unavailable. Retry after {retry_after} seconds',
    'AI_002': 'Formula Generation Failed - Unable to generate formula. Check input parameters',
    'AI_003': 'Invalid Input Format - Input data does not match required schema',
    'AI_004': 'Model Response Timeout - Request exceeded maximum allowed time',
    'AI_005': 'Token Limit Exceeded - Input context exceeds maximum token limit'
}

# Performance Metrics and Thresholds
PERFORMANCE_METRICS = {
    'TARGET_RESPONSE_TIME_MS': int(os.getenv('PERF_TARGET_RESPONSE_TIME', 2000)),
    'MAX_CONCURRENT_REQUESTS': int(os.getenv('PERF_MAX_CONCURRENT', 50)),
    'RATE_LIMIT_PER_MINUTE': int(os.getenv('PERF_RATE_LIMIT', 100)),
    'CPU_THRESHOLD_PERCENT': int(os.getenv('PERF_CPU_THRESHOLD', 80)),
    'MEMORY_THRESHOLD_MB': int(os.getenv('PERF_MEMORY_THRESHOLD', 512)),
    'BATCH_PROCESSING_TIMEOUT': int(os.getenv('PERF_BATCH_TIMEOUT', 10000))
}

# Prompt Templates for Different AI Operations
PROMPT_TEMPLATES = {
    'FORMULA_GENERATION': '''Generate Excel formula for: {description}
Context: {context}
Constraints: {constraints}''',
    
    'FORMULA_OPTIMIZATION': '''Optimize Excel formula: {formula}
Constraints: {constraints}
Performance target: {target}''',
    
    'SYNTAX_VALIDATION': '''Validate Excel formula syntax: {formula}
Rules: {rules}''',
    
    'ERROR_CORRECTION': '''Fix Excel formula errors: {formula}
Error details: {error}''',
    
    'FORMULA_EXPLANATION': '''Explain Excel formula: {formula}
Detail level: {detail_level}'''
}