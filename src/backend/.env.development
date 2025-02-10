"""
Configuration module for the AI service that manages environment variables, OpenAI settings,
and service configuration parameters with enhanced security and validation features.

This module provides secure configuration management for the AI service, including:
- OpenAI API settings and model configuration
- Environment-specific settings
- Security and performance parameters
- Configuration validation and monitoring

Version: 1.0.0
"""

import os
from typing import Dict, Optional
from cryptography.fernet import Fernet  # version: 41.0.0
from pydantic import BaseModel, Field, validator  # version: 2.0.0
from dotenv import load_dotenv  # version: 1.0.0
from .constants import AI_MODEL_CONFIG

class OpenAISettings(BaseModel):
    """Pydantic settings class for OpenAI configuration with enhanced security and validation."""
    
    api_key: str = Field(..., description="OpenAI API key with encryption")
    organization_id: str = Field(..., description="OpenAI organization identifier")
    model_name: str = Field(default=AI_MODEL_CONFIG['MODEL_NAME'])
    max_tokens: int = Field(default=AI_MODEL_CONFIG['MAX_TOKENS'])
    use_fine_tuning: bool = Field(default=True)
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    request_timeout: int = Field(default=5000, ge=1000)
    model_parameters: Dict = Field(default_factory=dict)

    @validator('api_key')
    def validate_api_key(cls, v: str) -> str:
        """Validates OpenAI API key format and accessibility."""
        if not v.startswith('sk-') or len(v) < 40:
            raise ValueError("Invalid OpenAI API key format")
        return v

    class Config:
        env_prefix = 'OPENAI_'
        extra = 'forbid'
        validate_assignment = True

class Settings(BaseModel):
    """Main settings class for AI service configuration with environment-specific settings."""
    
    environment: str = Field(
        default='development',
        regex='^(development|staging|production)$'
    )
    debug: bool = Field(default=False)
    openai: OpenAISettings
    request_timeout_ms: int = Field(default=2000, ge=1000)
    max_retries: int = Field(default=3, ge=1, le=5)
    environment_overrides: Dict = Field(default_factory=dict)
    performance_settings: Dict = Field(default_factory=dict)
    security_settings: Dict = Field(
        default_factory=lambda: {
            'encryption_enabled': True,
            'audit_logging': True,
            'key_rotation_days': 30
        }
    )

    class Config:
        env_prefix = 'AI_SERVICE_'
        validate_assignment = True
        extra = 'forbid'

    def reload_configuration(self) -> bool:
        """Safely reloads configuration during runtime."""
        try:
            current_config = self.dict()
            load_dotenv(override=True)
            
            # Create new settings instance with current environment
            new_settings = load_settings(
                env_file_path=os.getenv('ENV_FILE_PATH', '.env'),
                overrides=self.environment_overrides
            )
            
            # Validate new configuration
            new_settings.validate_all()
            
            # Update current instance with new settings
            for key, value in new_settings.dict().items():
                setattr(self, key, value)
            
            return True
        except Exception as e:
            # Restore previous configuration on failure
            for key, value in current_config.items():
                setattr(self, key, value)
            return False

    def validate_all(self) -> None:
        """Comprehensive validation of all settings."""
        self.openai.validate_api_key(self.openai.api_key)
        if not 1000 <= self.request_timeout_ms <= 10000:
            raise ValueError("Request timeout must be between 1000 and 10000 ms")
        if self.environment == 'production' and self.debug:
            raise ValueError("Debug mode cannot be enabled in production")

def initialize_encryption(key: Optional[str] = None) -> Fernet:
    """Initialize encryption for sensitive configuration values."""
    if key is None:
        key = os.getenv('ENCRYPTION_KEY')
        if key is None:
            key = Fernet.generate_key()
            os.environ['ENCRYPTION_KEY'] = key.decode()
    return Fernet(key.encode() if isinstance(key, str) else key)

def load_settings(env_file_path: str, overrides: Optional[Dict] = None) -> Settings:
    """Loads and validates all service settings with enhanced security."""
    
    # Verify environment file integrity
    if not os.path.exists(env_file_path):
        raise FileNotFoundError(f"Environment file not found: {env_file_path}")
    
    # Load environment variables
    load_dotenv(env_file_path, override=True)
    
    # Initialize encryption
    fernet = initialize_encryption()
    
    # Load OpenAI settings with encryption for sensitive values
    openai_settings = OpenAISettings(
        api_key=fernet.encrypt(os.getenv('OPENAI_API_KEY', '').encode()).decode(),
        organization_id=os.getenv('OPENAI_ORG_ID', ''),
        model_name=AI_MODEL_CONFIG['MODEL_NAME'],
        max_tokens=AI_MODEL_CONFIG['MAX_TOKENS'],
        use_fine_tuning=os.getenv('OPENAI_USE_FINE_TUNING', 'true').lower() == 'true',
        temperature=float(os.getenv('OPENAI_TEMPERATURE', '0.7')),
        request_timeout=int(os.getenv('OPENAI_REQUEST_TIMEOUT', '5000')),
        model_parameters={
            'frequency_penalty': float(os.getenv('OPENAI_FREQ_PENALTY', '0.0')),
            'presence_penalty': float(os.getenv('OPENAI_PRES_PENALTY', '0.0')),
            'top_p': float(os.getenv('OPENAI_TOP_P', '1.0'))
        }
    )

    # Create main settings instance
    settings = Settings(
        environment=os.getenv('AI_SERVICE_ENVIRONMENT', 'development'),
        debug=os.getenv('AI_SERVICE_DEBUG', 'false').lower() == 'true',
        openai=openai_settings,
        request_timeout_ms=int(os.getenv('AI_SERVICE_TIMEOUT_MS', '2000')),
        max_retries=int(os.getenv('AI_SERVICE_MAX_RETRIES', '3')),
        environment_overrides=overrides or {},
        performance_settings={
            'target_response_time': int(os.getenv('AI_SERVICE_TARGET_RESPONSE_TIME', '2000')),
            'max_concurrent_requests': int(os.getenv('AI_SERVICE_MAX_CONCURRENT', '50')),
            'batch_size': int(os.getenv('AI_SERVICE_BATCH_SIZE', '5'))
        }
    )

    # Apply any environment-specific overrides
    if overrides:
        for key, value in overrides.items():
            if hasattr(settings, key):
                setattr(settings, key, value)

    # Validate all settings
    settings.validate_all()

    return settings

# Export configuration classes and functions
__all__ = ['Settings', 'OpenAISettings', 'load_settings']