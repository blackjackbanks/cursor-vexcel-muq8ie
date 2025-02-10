"""
AI Service Initialization Module

This module initializes and configures the FastAPI application for the AI service,
setting up routes, middleware, monitoring, and core services with comprehensive
error handling and performance optimization.

Version: 1.0.0
"""

import logging
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator  # version: 5.9.1
from fastapi_limiter import FastAPILimiter  # version: 0.1.5
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor  # version: 1.0.0
import redis  # version: 4.5.0
from circuitbreaker import circuit  # version: 1.3.0

from .config import Settings, load_settings
from .controllers.formula_controller import FormulaController
from .controllers.suggestion_controller import SuggestionController
from .services.openai_service import OpenAIService
from .constants import PERFORMANCE_METRICS, ERROR_CODES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@circuit(failure_threshold=3, recovery_timeout=60)
def create_app() -> FastAPI:
    """
    Creates and configures the FastAPI application with comprehensive middleware
    and monitoring setup.

    Returns:
        FastAPI: Configured FastAPI application instance
    """
    # Initialize FastAPI with custom configuration
    app = FastAPI(
        title="AI Excel Assistant",
        description="AI-powered Excel formula generation and optimization service",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json"
    )

    try:
        # Load service settings
        settings = load_settings()

        # Initialize Redis for rate limiting and caching
        redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=0,
            decode_responses=True
        )

        # Initialize OpenAI service
        ai_service = OpenAIService(settings, redis_client)

        # Initialize controllers
        formula_controller = FormulaController(ai_service, redis_client)
        suggestion_controller = SuggestionController(ai_service, redis_client)

        # Configure CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure appropriately for production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID"]
        )

        # Configure compression
        app.add_middleware(GZipMiddleware, minimum_size=1000)

        # Initialize rate limiting
        @app.on_event("startup")
        async def initialize_rate_limiting():
            await FastAPILimiter.init(redis_client)

        # Configure Prometheus metrics
        Instrumentator().instrument(app).expose(app, include_in_schema=False)

        # Configure OpenTelemetry tracing
        FastAPIInstrumentor.instrument_app(app)

        # Register routes
        app.include_router(
            formula_controller.router,
            prefix="/api/v1",
            tags=["formulas"]
        )
        app.include_router(
            suggestion_controller.router,
            prefix="/api/v1",
            tags=["suggestions"]
        )

        # Configure health check endpoint
        @app.get("/health")
        async def health_check() -> Dict[str, Any]:
            return {
                "status": "healthy",
                "version": "1.0.0",
                "openai_status": await ai_service.check_health(),
                "redis_status": redis_client.ping()
            }

        # Configure error handlers
        @app.exception_handler(HTTPException)
        async def http_exception_handler(request, exc):
            return {
                "error": {
                    "code": exc.status_code,
                    "message": exc.detail,
                    "type": "http_error"
                }
            }

        @app.exception_handler(Exception)
        async def general_exception_handler(request, exc):
            logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
            return {
                "error": {
                    "code": 500,
                    "message": ERROR_CODES['AI_002'],
                    "type": "internal_error"
                }
            }

        # Configure shutdown handlers
        @app.on_event("shutdown")
        async def shutdown_event():
            await FastAPILimiter.close()
            redis_client.close()

        logger.info("AI service initialized successfully")
        return app

    except Exception as e:
        logger.error(f"Failed to initialize AI service: {str(e)}", exc_info=True)
        raise

# Create FastAPI application instance
app = create_app()

# Export application instance and settings
__all__ = ['app', 'settings']