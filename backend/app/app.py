"""Application factory for SchoolConnect.

Constructs and configures the Flask application, wiring extensions, middleware,
error handlers and feature blueprints. Keeping construction in a factory makes
the app easy to configure per-environment and to instantiate in tests.
"""

from __future__ import annotations

from flask import Flask

from app.common.registry import register_blueprints
from app.common.responses import success_response
from app.config import get_config
from app.extensions import cache, cors, db, jwt, limiter, mail, migrate
from app.middleware import (
    configure_logging,
    register_error_handlers,
    register_request_hooks,
)


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure a Flask application instance.

    Args:
        config_name: Optional environment name overriding ``FLASK_ENV``.

    Returns:
        A fully configured Flask application.
    """
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    configure_logging(app)
    _init_extensions(app)
    register_request_hooks(app)
    register_error_handlers(app)
    register_blueprints(app)
    _register_healthcheck(app)
    _configure_jwt()

    return app


def _init_extensions(app: Flask) -> None:
    """Initialize all Flask extensions with the application."""
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
        supports_credentials=True,
    )


def _configure_jwt() -> None:
    """Wire JWT callbacks (token revocation checks, user lookup)."""
    from uuid import UUID

    from flask_jwt_extended import get_jwt, get_jwt_identity

    from app.auth.model import User
    from app.common.exceptions import AuthenticationError
    from app.extensions import db

    @jwt.user_lookup_loader
    def load_user(_jwt_header, jwt_data):
        """Resolve the current user from the JWT identity."""
        identity = jwt_data.get("sub")
        if not identity:
            return None
        try:
            user_id = UUID(identity)
        except (ValueError, TypeError):
            return None
        return db.session.get(User, user_id)

    @jwt.token_in_blocklist_loader
    def check_blocklist(_jwt_header, jwt_data):
        """Reject access tokens for soft-deleted users."""
        identity = jwt_data.get("sub")
        if not identity:
            return True
        try:
            user_id = UUID(identity)
        except (ValueError, TypeError):
            return True
        user = db.session.get(User, user_id)
        return user is None or user.deleted_at is not None


def _register_healthcheck(app: Flask) -> None:
    """Register a lightweight liveness endpoint."""

    @app.get("/")
    def root():
        """Return basic API information at the root path."""
        return success_response(
            data={
                "service": app.config.get("APP_NAME"),
                "docs": "/health",
                "api_prefix": app.config.get("API_PREFIX", "/api"),
            },
            message="SchoolConnect API. Use the /api endpoints.",
        )

    @app.get("/health")
    def health():
        """Return service liveness status."""
        return success_response(
            data={"status": "ok", "service": app.config.get("APP_NAME")},
            message="Service is healthy.",
        )


# WSGI entrypoint for `flask run` / gunicorn: `app.app:app`
app = create_app()
