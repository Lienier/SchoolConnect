"""Central blueprint registry.

Each feature module exposes a ``bp`` (Flask ``Blueprint``) inside its
``routes.py``. This registry imports and registers them all in one place,
keeping the application factory free of feature-specific imports.

To add a new feature, append its blueprint import to :data:`FEATURE_BLUEPRINTS`.
"""

from __future__ import annotations

import logging

from flask import Blueprint, Flask

logger = logging.getLogger(__name__)


def _load_feature_blueprints() -> list[Blueprint]:
    """Import and return all feature blueprints.

    Imports are performed lazily inside the function to avoid import-time side
    effects and circular dependencies at module load.
    """
    blueprints: list[Blueprint] = []
    # Feature blueprints are appended here as modules are implemented.
    from app.auth.routes import bp as auth_bp
    blueprints.append(auth_bp)
    from app.users.routes import bp as users_bp
    blueprints.append(users_bp)
    from app.roles.routes import bp as roles_bp
    blueprints.append(roles_bp)
    from app.school.routes import bp as school_bp
    blueprints.append(school_bp)
    from app.announcements.routes import bp as announcements_bp
    blueprints.append(announcements_bp)
    from app.events.routes import bp as events_bp
    blueprints.append(events_bp)
    from app.registrations.routes import bp as registrations_bp
    blueprints.append(registrations_bp)
    from app.attendance.routes import bp as attendance_bp
    blueprints.append(attendance_bp)
    from app.notifications.routes import bp as notifications_bp
    blueprints.append(notifications_bp)
    from app.audit.routes import bp as audit_bp
    blueprints.append(audit_bp)
    from app.uploads.routes import bp as uploads_bp
    blueprints.append(uploads_bp)
    from app.reports.routes import bp as reports_bp
    blueprints.append(reports_bp)
    return blueprints


def register_blueprints(app: Flask) -> None:
    """Register every feature blueprint under the configured API prefix."""
    api_prefix = app.config.get("API_PREFIX", "/api")
    for blueprint in _load_feature_blueprints():
        url_prefix = f"{api_prefix}{blueprint.url_prefix or ''}"
        app.register_blueprint(blueprint, url_prefix=url_prefix)
        logger.info("Registered blueprint: %s at %s", blueprint.name, url_prefix)
