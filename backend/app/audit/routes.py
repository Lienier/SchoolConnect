"""HTTP routes for the audit module (read-only)."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.audit.service import AuditService
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.permissions.decorators import require_permission

bp = Blueprint("audit", __name__, url_prefix="/audit")
_service = AuditService()


@bp.get("/logs")
@jwt_required()
@require_permission("audit.view")
def list_audit():
    """List audit-log entries (paginated) with optional filters."""
    params = PaginationParams.from_request()
    query = _service.list_audit(
        actor_id=request.args.get("actor_id"),
        entity_type=request.args.get("entity_type"),
        action=request.args.get("action"),
    )
    items, meta = paginate(query, params)
    return success_response(data=[a.to_dict() for a in items], meta=meta)


@bp.get("/logins")
@jwt_required()
@require_permission("audit.view")
def list_logins():
    """List login-history entries (paginated)."""
    params = PaginationParams.from_request()
    query = _service.list_logins(user_id=request.args.get("user_id"))
    items, meta = paginate(query, params)
    return success_response(data=[a.to_dict() for a in items], meta=meta)


@bp.get("/activity")
@jwt_required()
@require_permission("audit.view")
def list_activity():
    """List activity-log entries (paginated)."""
    params = PaginationParams.from_request()
    query = _service.list_activity(user_id=request.args.get("user_id"))
    items, meta = paginate(query, params)
    return success_response(data=[a.to_dict() for a in items], meta=meta)


@bp.get("/activity/mine")
@jwt_required()
def my_activity():
    """List the current user's activity history."""
    params = PaginationParams.from_request()
    actor = get_jwt_identity()
    query = _service.list_activity(user_id=actor)
    items, meta = paginate(query, params)
    return success_response(data=[a.to_dict() for a in items], meta=meta)
