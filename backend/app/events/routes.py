"""HTTP routes for the events module."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.events.service import EventService
from app.events.validators import (
    EventApprovalRequest,
    EventCategoryCreateRequest,
    EventCreateRequest,
    EventStatusRequest,
    EventResultRequest,
    EventUpdateRequest,
)
from app.permissions.decorators import has_permission, has_role, require_permission

bp = Blueprint("events", __name__, url_prefix="/events")
_service = EventService()


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
    event = _service.get_event(uuid.UUID(event_id))
    if has_role(get_jwt_identity(), "student") and event.status not in {"approved", "ongoing"}:
        from app.common.exceptions import NotFoundError
        raise NotFoundError("Event not found.")
    return success_response(data=event.to_dict(include_approvals=not has_role(get_jwt_identity(), "student")))


@bp.get("/<event_id>/results")
@jwt_required()
@require_permission("events.view")
def list_results(event_id: str):
    return success_response(data=[r.to_dict() for r in _service.list_results(uuid.UUID(event_id))])


@bp.post("/<event_id>/results")
@jwt_required()
@require_permission("events.update")
def create_result(event_id: str):
    payload = EventResultRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    result = _service.create_result(uuid.UUID(event_id), actor, **payload.model_dump(exclude_none=True))
    return success_response(data=result.to_dict(), message="Event result added.", status_code=201)


@bp.delete("/results/<result_id>")
@jwt_required()
@require_permission("events.update")
def delete_result(result_id: str):
    actor = uuid.UUID(get_jwt_identity())
    _service.delete_result(uuid.UUID(result_id), actor, can_override=has_permission(str(actor), "events.approve"))
    return success_response(message="Event result removed.")


@bp.patch("/results/<result_id>")
@jwt_required()
@require_permission("events.update")
def update_result(result_id: str):
    payload = EventResultRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    result = _service.update_result(uuid.UUID(result_id), actor, can_override=has_permission(str(actor), "events.approve"), **payload.model_dump(exclude_none=True))
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
        submit_for_approval=payload.submit_for_approval,
    )
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
        can_override=has_permission(str(actor), "events.approve"),
        **payload.model_dump(exclude_none=True),
    )
    return success_response(data=event.to_dict(), message="Event updated.")


@bp.post("/<event_id>/submit")
@jwt_required()
@require_permission("events.update")
def submit_event(event_id: str):
    """Submit a draft event for approval."""
    actor = uuid.UUID(get_jwt_identity())
    event = _service.submit_for_approval(uuid.UUID(event_id), actor)
    return success_response(data=event.to_dict(), message="Event submitted for approval.")


@bp.post("/<event_id>/approve")
@jwt_required()
@require_permission("events.approve")
def approve_event(event_id: str):
    """Approve or reject a pending event."""
    payload = EventApprovalRequest(**_body())
    reviewer = uuid.UUID(get_jwt_identity())
    event = _service.decide(
        event_id=uuid.UUID(event_id),
        reviewer_id=reviewer,
        decision=payload.decision,
        comment=payload.comment,
    )
    return success_response(data=event.to_dict(), message=f"Event {event.status}.")


@bp.post("/<event_id>/status")
@jwt_required()
@require_permission("events.update")
def change_status(event_id: str):
    """Transition an event to a new lifecycle status."""
    payload = EventStatusRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    # Publishing/status changes are owner-only unless the actor can approve.
    event = _service.get_event(uuid.UUID(event_id))
    from app.common.ownership import enforce_owner_or_permission

    enforce_owner_or_permission(
        record_owner_id=event.organizer_id,
        user_id=actor,
        has_permission=has_permission(str(actor), "events.approve"),
        message="You can only change the status of events you organize.",
    )
    updated = _service.change_status(uuid.UUID(event_id), actor, payload.status)
    return success_response(data=updated.to_dict(), message="Event status updated.")


@bp.delete("/<event_id>")
@jwt_required()
@require_permission("events.delete")
def delete_event(event_id: str):
    """Soft-delete an event."""
    actor = uuid.UUID(get_jwt_identity())
    _service.delete_event(
        uuid.UUID(event_id),
        actor,
        can_override=has_permission(str(actor), "events.approve"),
    )
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
