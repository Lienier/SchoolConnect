"""Environment-driven application configuration.

All configuration values are sourced from environment variables so that no
secret or environment-specific value is ever hardcoded. Each runtime
environment (development, testing, production) has a dedicated config class.
"""

from __future__ import annotations

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _get_bool(key: str, default: bool = False) -> bool:
    """Return an environment variable coerced to a boolean."""
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(key: str, default: int) -> int:
    """Return an environment variable coerced to an integer."""
    value = os.getenv(key)
    if value is None or value.strip() == "":
        return default
    return int(value)


class Config:
    """Base configuration shared across all environments."""

    # Core
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-env")
    APP_NAME: str = os.getenv("APP_NAME", "SchoolConnect")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    APP_TIMEZONE: str = os.getenv("APP_TIMEZONE", "Asia/Manila")

    # Database
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/schoolconnect"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {"pool_pre_ping": True}

    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(
        minutes=_get_int("JWT_ACCESS_TOKEN_MINUTES", 15)
    )
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(
        days=_get_int("JWT_REFRESH_TOKEN_DAYS", 7)
    )
    JWT_TOKEN_LOCATION: list = ["headers"]

    # CORS
    CORS_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]

    # Rate limiting
    RATELIMIT_STORAGE_URI: str = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT: str = os.getenv("RATELIMIT_DEFAULT", "200 per hour")

    # File storage
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")  # local | cloudinary
    UPLOAD_FOLDER: str = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH: int = _get_int("MAX_CONTENT_LENGTH_MB", 10) * 1024 * 1024
    ALLOWED_UPLOAD_EXTENSIONS: set = {
        ext.strip().lower()
        for ext in os.getenv(
            "ALLOWED_UPLOAD_EXTENSIONS", "png,jpg,jpeg,gif,pdf,docx,xlsx"
        ).split(",")
        if ext.strip()
    }

    # Cloudinary (production storage)
    CLOUDINARY_CLOUD_NAME: str | None = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY: str | None = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET: str | None = os.getenv("CLOUDINARY_API_SECRET")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    DEBUG: bool = False
    TESTING: bool = False


class DevelopmentConfig(Config):
    """Development environment configuration."""

    DEBUG = True


class TestingConfig(Config):
    """Testing environment configuration."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    RATELIMIT_ENABLED = False


class ProductionConfig(Config):
    """Production environment configuration."""

    DEBUG = False


_CONFIG_MAP: dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str | None = None) -> type[Config]:
    """Return the config class matching ``name`` or the ``FLASK_ENV`` variable."""
    resolved = (name or os.getenv("FLASK_ENV", "development")).lower()
    return _CONFIG_MAP.get(resolved, DevelopmentConfig)


def validate_security_config(config: type[Config]) -> None:
    """Fail closed when production is configured with placeholder secrets."""
    if not issubclass(config, ProductionConfig):
        return
    placeholders = {"", "change-me-in-env", "replace-with-a-long-random-string"}
    if config.SECRET_KEY in placeholders or config.JWT_SECRET_KEY in placeholders:
        raise RuntimeError(
            "Production requires strong SECRET_KEY and JWT_SECRET_KEY values."
        )
    if config.RATELIMIT_STORAGE_URI == "memory://":
        raise RuntimeError(
            "Production requires persistent RATELIMIT_STORAGE_URI storage."
        )
