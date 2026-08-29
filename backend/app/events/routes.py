"""HTTP routes for the events module."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.events.service import EventService
from app.events.access import can_manage_event, require_event_manager
from app.events.model import EventOfficerAssignment
from app.events.validators import (
    EventCategoryCreateRequest,
    EventCreateRequest,
    EventStatusRequest,
    EventResultRequest,
    EventUpdateRequest,
    EventOfficerAssignmentRequest,
)
from app.permissions.decorators import has_permission, has_role, require_permission
from app.permissions.model import Role, UserRole
from app.realtime.service import emit_update
from app.extensions import db
from app.audit.service import AuditService

bp = Blueprint("events", __name__, url_prefix="/events")
_service = EventService()
_audit = AuditService()


def _record_audit(action: str, entity_id: uuid.UUID, actor_id: uuid.UUID, changes=None) -> None:
    _audit.record_audit(
        action=action,
        entity_type="event",
        entity_id=entity_id,
        actor_id=actor_id,
        changes=changes,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
    )


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.get("")
@jwt_required()
@require_permission("events.view")
def list_events():
    """List events (paginated) with optional status/category/organizer filters."""
    _service.refresh_lifecycle()
    params = PaginationParams.from_request()
    actor = get_jwt_identity()
    requested_status = request.args.get("status")
    # Students receive only public, actionable events. Workflow records remain
    # available to staff who have the matching management permissions.
    if has_role(actor, "student"):
        requested_status = requested_status or "approved"
        if requested_status not in {"approved", "ongoing"}:
            requested_status = "approved"
    query = _service.list_events(
        status=requested_status,
        category_id=request.args.get("category_id"),
        organizer_id=request.args.get("organizer_id"),
    )
    items, meta = paginate(query, params)
    return success_response(data=[e.to_dict() for e in items], meta=meta)


@bp.get("/<event_id>")
@jwt_required()
@require_permission("events.view")
def get_event(event_id: str):
    """Get a single event with approval history."""
    _service.refresh_lifecycle()
    event = _service.get_event(uuid.UUID(event_id))
    if has_role(get_jwt_identity(), "student") and event.status not in {"approved", "ongoing"}:
        from app.common.exceptions import NotFoundError
        raise NotFoundError("Event not found.")
    data = event.to_dict()
    data["can_manage"] = can_manage_event(get_jwt_identity(), event)
    return success_response(data=data)


@bp.get("/<event_id>/results")
@jwt_required()
@require_permission("events.view")
def list_results(event_id: str):
    event = _service.get_event(uuid.UUID(event_id))
    require_event_manager(get_jwt_identity(), event)
    return success_response(data=[r.to_dict() for r in _service.list_results(event.id)])


@bp.post("/<event_id>/results")
@jwt_required()
@require_permission("events.update")
def create_result(event_id: str):
    payload = EventResultRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    event = _service.get_event(uuid.UUID(event_id))
    require_event_manager(actor, event)
    result = _service.create_result(event.id, actor, **payload.model_dump(exclude_none=True))
    return success_response(data=result.to_dict(), message="Event result added.", status_code=201)


@bp.delete("/results/<result_id>")
@jwt_required()
@require_permission("events.update")
def delete_result(result_id: str):
    actor = uuid.UUID(get_jwt_identity())
    _service.delete_result(uuid.UUID(result_id), actor, can_override=has_permission(str(actor), "events.manage_all"))
    return success_response(message="Event result removed.")


@bp.patch("/results/<result_id>")
@jwt_required()
@require_permission("events.update")
def update_result(result_id: str):
    payload = EventResultRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    result = _service.update_result(uuid.UUID(result_id), actor, can_override=has_permission(str(actor), "events.manage_all"), **payload.model_dump(exclude_none=True))
    return success_response(data=result.to_dict(), message="Event result updated.")


@bp.post("")
@jwt_required()
@require_permission("events.create")
def create_event():
    """Create a draft event, optionally submitting for approval."""
    payload = EventCreateRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    event = _service.create_event(
        organizer_id=actor,
        title=payload.title,
        description=payload.description,
        category_id=payload.category_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        capacity=payload.capacity,
        registration_deadline=payload.registration_deadline,
        is_team_event=payload.is_team_event,
        max_team_size=payload.max_team_size,
    )
    _record_audit("event.published", event.id, actor)
    emit_update("event", "created", entity_id=event.id, message=f"Event created: {event.title}")
    return success_response(
        data=event.to_dict(), message="Event created.", status_code=201
    )


@bp.patch("/<event_id>")
@jwt_required()
@require_permission("events.update")
def update_event(event_id: str):
    """Update a draft or pending event."""
    payload = EventUpdateRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    event = _service.update_event(
        uuid.UUID(event_id),
        actor,
        can_override=has_permission(str(actor), "events.manage_all"),
        **payload.model_dump(exclude_none=True),
    )
    _record_audit("event.updated", event.id, actor)
    emit_update("event", "updated", entity_id=event.id, message=f"Event updated: {event.title}")
    return success_response(data=event.to_dict(), message="Event updated.")


@bp.post("/<event_id>/status")
@jwt_required()
@require_permission("events.update")
def change_status(event_id: str):
    """Transition an event to a new lifecycle status."""
    payload = EventStatusRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    # Status changes are limited to organizers, assigned officers, and admins.
    event = _service.get_event(uuid.UUID(event_id))
    require_event_manager(actor, event)
    updated = _service.change_status(uuid.UUID(event_id), actor, payload.status)
    _record_audit("event.status_updated", updated.id, actor, {"status": updated.status})
    emit_update("event", updated.status, entity_id=updated.id, message=f"Event status updated: {updated.title}")
    return success_response(data=updated.to_dict(), message="Event status updated.")


@bp.delete("/<event_id>")
@jwt_required()
@require_permission("events.delete")
def delete_event(event_id: str):
    """Soft-delete an event."""
    actor = uuid.UUID(get_jwt_identity())
    target = uuid.UUID(event_id)
    _service.delete_event(
        target,
        actor,
        can_override=has_permission(str(actor), "events.manage_all"),
    )
    _record_audit("event.deleted", target, actor)
    emit_update("event", "deleted", entity_id=event_id)
    return success_response(message="Event deleted.")


@bp.get("/categories/all")
@jwt_required()
@require_permission("events.view")
def list_categories():
    """List all event categories."""
    return success_response(
        data=[
            {"id": str(c.id), "name": c.name, "slug": c.slug, "color": c.color}
            for c in _service.list_categories()
        ]
    )


@bp.post("/categories")
@jwt_required()
@require_permission("events.update")
def create_category():
    """Create an event category."""
    payload = EventCategoryCreateRequest(**_body())
    category = _service.create_category(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        color=payload.color,
    )
    return success_response(
        data={"id": str(category.id), "name": category.name, "slug": category.slug},
        message="Category created.",
        status_code=201,
    )


@bp.get("/<event_id>/officers")
@jwt_required()
@require_permission("events.update")
def list_event_officers(event_id: str):
    event = _service.get_event(uuid.UUID(event_id))
    require_event_manager(get_jwt_identity(), event)
    rows = db.session.scalars(
        db.select(EventOfficerAssignment).where(
            EventOfficerAssignment.event_id == event.id
        )
    ).all()
    return success_response(data=[str(row.officer_id) for row in rows])


@bp.put("/<event_id>/officers")
@jwt_required()
@require_permission("events.manage_all")
def assign_event_officers(event_id: str):
    payload = EventOfficerAssignmentRequest(**_body())
    event = _service.get_event(uuid.UUID(event_id))
    actor = uuid.UUID(get_jwt_identity())
    officer_ids = list(dict.fromkeys(uuid.UUID(value) for value in payload.officer_ids))
    valid = set(
        db.session.scalars(
            db.select(UserRole.user_id)
            .join(Role, Role.id == UserRole.role_id)
            .where(Role.name == "student_council", UserRole.user_id.in_(officer_ids))
        ).all()
    )
    if valid != set(officer_ids):
        raise ValidationError("Every assigned user must have the Student Council role.")
    db.session.query(EventOfficerAssignment).filter(
        EventOfficerAssignment.event_id == event.id
    ).delete(synchronize_session=False)
    for officer_id in officer_ids:
        db.session.add(
            EventOfficerAssignment(
                event_id=event.id, officer_id=officer_id, assigned_by=actor
            )
        )
    db.session.commit()
    _record_audit(
        "event.officers_updated",
        event.id,
        actor,
        {"officer_ids": [str(value) for value in officer_ids]},
    )
    return success_response(
        data=[str(value) for value in officer_ids], message="Event officers updated."
    )
