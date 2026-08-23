"""Request lifecycle hooks.

Attaches a correlation/request identifier to every request for traceable
logging and assigns it to the response headers.
"""

from __future__ import annotations

import uuid

from flask import Flask, g, request


def register_request_hooks(app: Flask) -> None:
    """Register before/after request hooks for request correlation."""

    @app.before_request
    def assign_request_id() -> None:
        """Attach a unique request id to the request context."""
        # Never trust a caller-supplied value as the canonical correlation id.
        g.request_id = str(uuid.uuid4())

    @app.after_request
    def attach_request_id(response):
        """Echo the request id back to the client for tracing."""
        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers["X-Request-ID"] = request_id
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if request.is_secure:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response
