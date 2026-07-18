"""Application-wide middleware registration."""

from app.middleware.error_handlers import register_error_handlers
from app.middleware.logging import configure_logging
from app.middleware.request_context import register_request_hooks

__all__ = ["register_error_handlers", "configure_logging", "register_request_hooks"]
