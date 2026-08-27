"""HTTP routes for the attendance module."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.attendance.service import AttendanceService
from app.attendance.validators import (
    GenerateQrRequest,
    MarkAttendanceRequest,
    QrCheckInRequest,
)
from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.permissions.decorators import has_permission, require_any_permission, require_permission
from app.realtime.service import emit_update

bp = Blueprint("attendance", __name__, url_prefix="/attendance")
_service = AttendanceService()


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.get("/mine")
@jwt_required()
def list_mine():
    """Return only the signed-in user's attendance records."""
    actor = uuid.UUID(get_jwt_identity())
    params = PaginationParams.from_request()
    items, meta = paginate(_service.list_for_user(actor), params)
    return success_response(data=[a.to_dict() for a in items], meta=meta)


@bp.get("/event/<event_id>")
@jwt_required()
@require_permission("attendance.view")
def list_for_event(event_id: str):
    """List the attendance sheet for an event."""
    items = _service.sheet_for_event(uuid.UUID(event_id))
    return success_response(
        data=items,
        meta={
            "page": 1,
            "per_page": len(items),
            "total_items": len(items),
            "total_pages": 1,
        },
    )


@bp.get("/event/<event_id>/summary")
@jwt_required()
@require_permission("attendance.view")
def summary(event_id: str):
    """Return an attendance status breakdown for an event."""
    return success_response(data=_service.summary(uuid.UUID(event_id)))


@bp.post("/mark")
@jwt_required()
@require_permission("attendance.manage")
def mark():
    """Manually mark a participant's attendance."""
    payload = MarkAttendanceRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    event = _service._get_event(uuid.UUID(payload.event_id))
    if event.organizer_id != actor and not has_permission(str(actor), "events.approve"):
        raise ValidationError("You can only record attendance for events you manage.")
    record = _service.mark(
        event_id=uuid.UUID(payload.event_id),
        user_id=uuid.UUID(payload.user_id),
        status=payload.status,
        actor_id=actor,
    )
    emit_update(
        "attendance",
        "marked",
        entity_id=record.id,
        message="Attendance recorded.",
        data={"event_id": str(record.event_id), "user_id": str(record.user_id), "status": record.status},
    )
    return success_response(data=record.to_dict(), message="Attendance recorded.")


@bp.post("/qr/generate")
@jwt_required()
@require_permission("attendance.manage")
def generate_qr():
    """Generate a single-use QR token for check-in."""
    payload = GenerateQrRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    event = _service._get_event(uuid.UUID(payload.event_id))
    if event.organizer_id != actor and not has_permission(str(actor), "events.approve"):
        raise ValidationError("You can only generate attendance codes for events you manage.")
    token = _service.generate_qr(
        event_id=uuid.UUID(payload.event_id),
        user_id=uuid.UUID(payload.user_id) if payload.user_id else None,
        ttl_minutes=payload.ttl_minutes,
    )
    emit_update(
        "attendance",
        "qr_generated",
        entity_id=token.id,
        message="Attendance QR generated.",
        data={"event_id": str(token.event_id), "expires_at": token.expires_at.isoformat() if token.expires_at else None},
    )
    return success_response(data=token.to_dict(), message="QR token generated.", status_code=201)


@bp.post("/qr/check-in")
@jwt_required()
@require_any_permission("attendance.scan", "attendance.checkin")
def qr_check_in():
    """Check in a participant using a QR token."""
    payload = QrCheckInRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    record = _service.check_in_via_qr(token=payload.token, actor_id=actor)
    emit_update(
        "attendance",
        "checked_in",
        entity_id=record.id,
        user_id=record.user_id,
        message="Attendance checked in.",
        data={"event_id": str(record.event_id), "user_id": str(record.user_id), "status": record.status},
    )
    return success_response(data=record.to_dict(), message="Checked in.")
