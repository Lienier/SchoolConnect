"""HTTP routes for the notifications module."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.notifications.service import NotificationService
from app.notifications.validators import BroadcastRequest, TemplateCreateRequest
from app.permissions.decorators import require_permission

bp = Blueprint("notifications", __name__, url_prefix="/notifications")
_service = NotificationService()


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.get("")
@jwt_required()
def my_notifications():
    """List the current user's notifications (paginated)."""
    params = PaginationParams.from_request()
    actor = uuid.UUID(get_jwt_identity())
    query = _service.list_for_user(actor, status=request.args.get("status"))
    items, meta = paginate(query, params)
    return success_response(data=[n.to_dict() for n in items], meta=meta)


@bp.get("/unread-count")
@jwt_required()
def unread_count():
    """Return the current user's unread notification count."""
    actor = uuid.UUID(get_jwt_identity())
    return success_response(data={"unread": _service.unread_count(actor)})


@bp.post("/<notification_id>/read")
@jwt_required()
def mark_read(notification_id: str):
    """Mark a single notification as read."""
    actor = uuid.UUID(get_jwt_identity())
    n = _service.mark_read(notification_id=uuid.UUID(notification_id), user_id=actor)
    return success_response(data=n.to_dict(), message="Notification read.")


@bp.post("/read-all")
@jwt_required()
def mark_all_read():
    """Mark all of the current user's notifications as read."""
    actor = uuid.UUID(get_jwt_identity())
    count = _service.mark_all_read(actor)
    return success_response(data={"updated": count}, message="All notifications read.")


@bp.post("/broadcast")
@jwt_required()
@require_permission("notifications.send")
def broadcast():
    """Send a notification to one or more users."""
    payload = BroadcastRequest(**_body())
    created = _service.broadcast(
        user_ids=[uuid.UUID(u) for u in payload.user_ids],
        title=payload.title,
        body=payload.body,
        category=payload.category,
    )
    return success_response(
        data={"sent": len(created)}, message="Notifications sent.", status_code=201
    )


@bp.get("/templates/all")
@jwt_required()
@require_permission("notifications.send")
def list_templates():
    """List all notification templates."""
    return success_response(data=[t.to_dict() for t in _service.list_templates()])


@bp.post("/templates")
@jwt_required()
@require_permission("notifications.send")
def create_template():
    """Create a notification template."""
    payload = TemplateCreateRequest(**_body())
    template = _service.create_template(
        code=payload.code, title=payload.title, body=payload.body, channel=payload.channel
    )
    return success_response(data=template.to_dict(), message="Template created.", status_code=201)
