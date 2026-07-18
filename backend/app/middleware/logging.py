"""Structured application logging configuration.

Configures the root logger with the level defined in the environment. Supports
the INFO, WARNING, ERROR and CRITICAL levels mandated by the project standards.
"""

from __future__ import annotations

import logging
import sys

from flask import Flask

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def configure_logging(app: Flask) -> None:
    """Configure logging handlers and level for the application."""
    level_name = app.config.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT))

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Avoid duplicate handlers on reloads.
    if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
        root_logger.addHandler(handler)

    app.logger.setLevel(level)
