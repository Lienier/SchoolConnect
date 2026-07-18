"""Global error handlers producing standardized, safe error responses.

Stack traces are never returned to clients. Domain :class:`AppError` instances
map to their declared status codes, while unexpected exceptions are logged and
surfaced as a generic 500 response.
"""

from __future__ import annotations

import logging

from flask import Flask
from werkzeug.exceptions import HTTPException

from app.common.exceptions import AppError
from app.common.responses import error_response

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    """Attach global error handlers to the Flask application."""

    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        """Convert domain errors into standardized responses."""
        return error_response(
            message=error.message,
            status_code=error.status_code,
            errors=error.errors,
            error_code=error.error_code,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        """Convert Werkzeug HTTP exceptions into standardized responses."""
        return error_response(
            message=error.description or "Request could not be processed.",
            status_code=error.code or 500,
            error_code=error.name.lower().replace(" ", "_"),
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        """Log unexpected errors and return a generic 500 response."""
        logger.exception("Unhandled exception: %s", error)
        return error_response(
            message="An unexpected error occurred. Please try again later.",
            status_code=500,
            error_code="internal_server_error",
        )
