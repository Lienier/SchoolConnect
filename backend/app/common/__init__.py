"""Cross-cutting helpers shared by every feature module."""

from app.common.exceptions import (
    AppError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.common.pagination import PaginationParams, paginate
from app.common.responses import error_response, success_response

__all__ = [
    "AppError",
    "AuthenticationError",
    "AuthorizationError",
    "ConflictError",
    "NotFoundError",
    "ValidationError",
    "PaginationParams",
    "paginate",
    "error_response",
    "success_response",
]
