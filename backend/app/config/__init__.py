"""Application configuration package.

Exposes the configuration selector used by the application factory.
"""

from app.config.settings import Config, DevelopmentConfig, ProductionConfig, TestingConfig, get_config

__all__ = [
    "Config",
    "DevelopmentConfig",
    "ProductionConfig",
    "TestingConfig",
    "get_config",
]
