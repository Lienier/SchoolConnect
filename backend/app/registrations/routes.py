"""HTTP routes for the registration module."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.permissions.decorators import has_permission, has_role, require_permission
from app.realtime.service import emit_update
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
    """List registrations (paginated) filtered by event/user/status.
    
    Full participant details (email, phone) should only be visible to organizers/admins.
    """
    params = PaginationParams.from_request()
    actor = get_jwt_identity()
    user_id = request.args.get("user_id")
    if has_role(actor, "student"):
        user_id = actor
    query = _service.list_registrations(
        event_id=request.args.get("event_id"),
        user_id=user_id,
        status=request.args.get("status"),
    )
    items, meta = paginate(query, params)
    
    redact = request.args.get("redact", "true").lower() == "true"
    results = []
    for r in items:
        r_dict = r.to_dict()
        if redact:
            r_dict.pop("notes", None)
            r_dict.pop("reviewed_by", None)
            r_dict.pop("participant_email", None)
        # Always redact participant contact details unless explicitly requested
        if "team" in r_dict:
            if "members" in r_dict["team"]:
                for member in r_dict["team"]["members"]:
                    if "email" in member:
                        member.pop("email", None)
                    if "phone" in member:
                        member.pop("phone", None)
        results.append(r_dict)
        
    return success_response(data=results, meta=meta)


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
    emit_update(
        "registration",
        "created",
        entity_id=reg.id,
        message=f"Registration {reg.status}.",
        data={"event_id": str(reg.event_id), "user_id": str(reg.user_id), "status": reg.status},
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
    leader_registration = _service.registrations.get_for_user_event(actor, team.event_id)
    response_data = team.to_dict()
    response_data["registration_status"] = (
        leader_registration.status if leader_registration is not None else None
    )
    emit_update(
        "registration",
        "team_created",
        entity_id=team.id,
        message=f"Team registered: {team.name}",
        data={"event_id": str(team.event_id), "team_code": team.team_code},
    )
    return success_response(
        data=response_data, message="Team registered.", status_code=201
    )


@bp.post("/team/join")
@jwt_required()
@require_permission("registrations.create")
def join_team():
    """Join an existing team using a team code."""
    data = _body()
    team_code = data.get("team_code")
    if not team_code:
        raise ValidationError("team_code is required.")
    actor = uuid.UUID(get_jwt_identity())
    reg = _service.join_team_by_code(team_code=team_code, user_id=actor)
    emit_update(
        "registration",
        "team_joined",
        entity_id=reg.id,
        message=f"Team registration {reg.status}.",
        data={"event_id": str(reg.event_id), "team_id": str(reg.team_id), "user_id": str(reg.user_id), "status": reg.status},
    )
    return success_response(data=reg.to_dict(), message="Joined team successfully.", status_code=201)


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
    emit_update(
        "registration",
        payload.decision,
        entity_id=reg.id,
        message=f"Registration {reg.status}.",
        data={"event_id": str(reg.event_id), "user_id": str(reg.user_id), "status": reg.status},
    )
    return success_response(data=reg.to_dict(), message=f"Registration {reg.status}.")


@bp.post("/<registration_id>/promote")
@jwt_required()
@require_permission("registrations.manage")
def promote(registration_id: str):
    actor = uuid.UUID(get_jwt_identity())
    reg = _service.promote(registration_id=uuid.UUID(registration_id), actor_id=actor)
    emit_update(
        "registration",
        "promoted",
        entity_id=reg.id,
        message=f"Registration {reg.status}.",
        data={"event_id": str(reg.event_id), "user_id": str(reg.user_id), "status": reg.status},
    )
    return success_response(data=reg.to_dict(), message=f"Registration {reg.status}.")


@bp.delete("/<registration_id>")
@jwt_required()
@require_permission("registrations.manage")
def remove(registration_id: str):
    _service.remove(registration_id=uuid.UUID(registration_id), actor_id=uuid.UUID(get_jwt_identity()))
    emit_update("registration", "removed", entity_id=registration_id)
    return success_response(message="Registration removed.")


@bp.post("/<registration_id>/cancel")
@jwt_required()
def cancel(registration_id: str):
    """Cancel a registration (owner or manager)."""
    actor = uuid.UUID(get_jwt_identity())
    reg = _service.cancel(registration_id=uuid.UUID(registration_id), actor_id=actor)
    emit_update(
        "registration",
        "cancelled",
        entity_id=reg.id,
        user_id=reg.user_id,
        message="Registration cancelled.",
        data={"event_id": str(reg.event_id), "status": reg.status},
    )
    return success_response(data=reg.to_dict(), message="Registration cancelled.")
