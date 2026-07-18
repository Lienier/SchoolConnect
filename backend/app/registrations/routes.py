"""HTTP routes for the registration module."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.permissions.decorators import require_permission
from app.registrations.service import RegistrationService
from app.registrations.validators import (
    RegistrationCreateRequest,
    RegistrationDecisionRequest,
    TeamRegistrationRequest,
)

bp = Blueprint("registrations", __name__, url_prefix="/registrations")
_service = RegistrationService()


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.get("")
@jwt_required()
@require_permission("registrations.view")
def list_registrations():
    """List registrations (paginated) filtered by event/user/status."""
    params = PaginationParams.from_request()
    query = _service.list_registrations(
        event_id=request.args.get("event_id"),
        user_id=request.args.get("user_id"),
        status=request.args.get("status"),
    )
    items, meta = paginate(query, params)
    return success_response(data=[r.to_dict() for r in items], meta=meta)


@bp.get("/mine")
@jwt_required()
def my_registrations():
    """List the current user's registrations."""
    params = PaginationParams.from_request()
    actor = get_jwt_identity()
    query = _service.list_registrations(user_id=actor)
    items, meta = paginate(query, params)
    return success_response(data=[r.to_dict() for r in items], meta=meta)


@bp.post("")
@jwt_required()
@require_permission("registrations.create")
def register():
    """Register the current user for an event."""
    payload = RegistrationCreateRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    reg = _service.register(
        event_id=uuid.UUID(payload.event_id), user_id=actor, notes=payload.notes
    )
    return success_response(
        data=reg.to_dict(), message=f"Registration {reg.status}.", status_code=201
    )


@bp.post("/team")
@jwt_required()
@require_permission("registrations.create")
def register_team():
    """Register a team for a team event."""
    payload = TeamRegistrationRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    team = _service.register_team(
        event_id=uuid.UUID(payload.event_id),
        leader_id=actor,
        name=payload.name,
        member_ids=[uuid.UUID(m) for m in payload.member_ids],
    )
    return success_response(
        data=team.to_dict(), message="Team registered.", status_code=201
    )


@bp.post("/<registration_id>/decide")
@jwt_required()
@require_permission("registrations.approve")
def decide(registration_id: str):
    """Approve or reject a pending registration."""
    payload = RegistrationDecisionRequest(**_body())
    reviewer = uuid.UUID(get_jwt_identity())
    reg = _service.decide(
        registration_id=uuid.UUID(registration_id),
        reviewer_id=reviewer,
        decision=payload.decision,
        notes=payload.notes,
    )
    return success_response(data=reg.to_dict(), message=f"Registration {reg.status}.")


@bp.post("/<registration_id>/cancel")
@jwt_required()
def cancel(registration_id: str):
    """Cancel a registration (owner or manager)."""
    actor = uuid.UUID(get_jwt_identity())
    reg = _service.cancel(registration_id=uuid.UUID(registration_id), actor_id=actor)
    return success_response(data=reg.to_dict(), message="Registration cancelled.")
