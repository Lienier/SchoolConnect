"""HTTP routes for the dashboard module.

Exposes a single endpoint that returns aggregated statistics. The set of
metrics is driven by the ``widgets`` query parameter, delegating the actual
computation to :class:`DashboardService` and its registered providers.
"""

from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.common.exceptions import ValidationError
from app.common.responses import success_response
from app.dashboard.service import DashboardService
from app.permissions.decorators import require_any_permission

bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")
_service = DashboardService()


@bp.get("/stats")
@jwt_required()
@require_any_permission("reports.view", "events.view", "announcements.view", "users.view")
def dashboard_stats():
    """Return dashboard statistics.

    Optional ``widgets`` query param (comma-separated) restricts which metrics
    are computed, e.g. ``?widgets=total_users,active_events``.
    """
    raw = request.args.get("widgets")
    widgets = [w.strip() for w in raw.split(",") if w.strip()] if raw else None
    try:
        stats = _service.snapshot(widgets)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc
    return success_response(data=stats, message="Dashboard statistics retrieved.")
