"""Standardized API response envelopes.

Every endpoint in the application returns a consistent JSON structure::

    {
        "success": true,
        "message": "",
        "data": {}
    }
"""

from __future__ import annotations

from typing import Any

from flask import jsonify
from flask.wrappers import Response


def success_response(
    data: Any = None,
    message: str = "",
    status_code: int = 200,
    meta: dict[str, Any] | None = None,
) -> tuple[Response, int]:
    """Build a successful response envelope.

    Args:
        data: The payload returned to the client.
        message: A human-friendly success message.
        status_code: The HTTP status code to return.
        meta: Optional metadata (e.g. pagination info).

    Returns:
        A tuple of the JSON response and HTTP status code.
    """
    body: dict[str, Any] = {"success": True, "message": message, "data": data}
    if meta is not None:
        body["meta"] = meta
    return jsonify(body), status_code


def error_response(
    message: str,
    status_code: int = 400,
    errors: Any = None,
    error_code: str | None = None,
) -> tuple[Response, int]:
    """Build an error response envelope.

    Args:
        message: A friendly, non-sensitive error message.
        status_code: The HTTP status code to return.
        errors: Optional structured error details (e.g. field errors).
        error_code: Optional machine-readable error identifier.

    Returns:
        A tuple of the JSON response and HTTP status code.
    """
    body: dict[str, Any] = {"success": False, "message": message, "data": None}
    if errors is not None:
        body["errors"] = errors
    if error_code is not None:
        body["error_code"] = error_code
    return jsonify(body), status_code
