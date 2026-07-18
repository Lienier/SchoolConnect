"""HTTP routes for the reports / dashboard analytics module."""

from __future__ import annotations

import uuid

from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.common.responses import success_response
from app.permissions.decorators import require_permission
from app.reports.service import ReportService

bp = Blueprint("reports", __name__, url_prefix="/reports")
_service = ReportService()


@bp.get("/dashboard")
@jwt_required()
@require_permission("reports.view")
def dashboard():
    """Return high-level dashboard analytics."""
    return success_response(data=_service.dashboard())


@bp.get("/registrations")
@jwt_required()
@require_permission("reports.view")
def registration_statistics():
    """Return overall registration statistics."""
    return success_response(data=_service.registration_statistics())


@bp.get("/events/<event_id>/participation")
@jwt_required()
@require_permission("reports.view")
def event_participation(event_id: str):
    """Return participation breakdown for an event."""
    return success_response(data=_service.event_participation(uuid.UUID(event_id)))


@bp.get("/events/<event_id>/attendance")
@jwt_required()
@require_permission("reports.view")
def attendance_summary(event_id: str):
    """Return attendance breakdown for an event."""
    return success_response(data=_service.attendance_summary(uuid.UUID(event_id)))


@bp.get("/active-students")
@jwt_required()
@require_permission("reports.view")
def most_active_students():
    """Return the most active students by registration count."""
    return success_response(data=_service.most_active_students())


@bp.get("/popular-categories")
@jwt_required()
@require_permission("reports.view")
def popular_categories():
    """Return the most popular event categories by registration count."""
    return success_response(data=_service.popular_categories())
