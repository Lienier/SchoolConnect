"""Domain-level exceptions used across all feature modules.

Services raise these exceptions instead of returning ad-hoc error tuples. A
single global error handler (see ``app.middleware.error_handlers``) converts
them into standardized API responses, ensuring stack traces are never leaked.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base application error.

    Attributes:
        message: Friendly, client-safe error message.
        status_code: HTTP status code to emit.
        errors: Optional structured error details.
        error_code: Optional machine-readable identifier.
    """

    status_code: int = 400
    error_code: str = "app_error"

    def __init__(
        self,
        message: str = "An error occurred.",
        *,
        status_code: int | None = None,
        errors: Any = None,
        error_code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.errors = errors
        if error_code is not None:
            self.error_code = error_code


class ValidationError(AppError):
    """Raised when input validation fails."""

    status_code = 422
    error_code = "validation_error"


class AuthenticationError(AppError):
    """Raised when authentication is required or credentials are invalid."""

    status_code = 401
    error_code = "authentication_error"


class AuthorizationError(AppError):
    """Raised when an authenticated user lacks the required permission."""

    status_code = 403
    error_code = "authorization_error"


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    status_code = 404
    error_code = "not_found"


class ConflictError(AppError):
    """Raised when an operation conflicts with existing state."""

    status_code = 409
    error_code = "conflict"
