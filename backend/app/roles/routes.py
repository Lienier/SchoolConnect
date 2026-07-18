"""HTTP routes for role and permission management.

Routes are thin: they parse and validate the request, delegate to
:class:`RoleService`, and return the standardized response envelope. All
endpoints are permission-guarded via the RBAC decorators.
"""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.query import apply_search, apply_sort
from app.common.responses import success_response
from app.permissions.decorators import require_permission
from app.permissions.model import Role
from app.roles.schema import permission_to_dict, role_to_dict
from app.roles.service import RoleService
from app.roles.validators import (
    AssignPermissionsRequest,
    CloneRoleRequest,
    RoleCreateRequest,
    RoleUpdateRequest,
)

bp = Blueprint("roles", __name__, url_prefix="/roles")
_service = RoleService()

_SORTABLE = {
    "name": Role.name,
    "display_name": Role.display_name,
    "priority": Role.priority,
    "created_at": Role.created_at,
}


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.get("")
@jwt_required()
@require_permission("roles.view")
def list_roles():
    """List roles with pagination, search and sorting."""
    params = PaginationParams.from_request()
    stmt = _service.list_roles_query()
    stmt = apply_search(stmt, request.args.get("search"), [Role.name, Role.display_name])
    stmt = apply_sort(stmt, request.args.get("sort"), _SORTABLE, default=Role.name, default_desc=False)
    items, meta = paginate(stmt, params)
    return success_response(
        data=[role_to_dict(r, include_permissions=True) for r in items], meta=meta
    )


@bp.get("/permissions")
@jwt_required()
@require_permission("roles.view")
def list_permissions():
    """Return the catalog of assignable permissions."""
    perms = _service.list_permissions()
    return success_response(data=[permission_to_dict(p) for p in perms])


@bp.get("/<role_id>")
@jwt_required()
@require_permission("roles.view")
def get_role(role_id: str):
    """Return a single role with its permissions."""
    role = _service.get_role(uuid.UUID(role_id))
    return success_response(data=role_to_dict(role, include_permissions=True))


@bp.post("")
@jwt_required()
@require_permission("roles.create")
def create_role():
    """Create a new custom role."""
    payload = RoleCreateRequest(**_body())
    role = _service.create_role(
        name=payload.name,
        display_name=payload.display_name,
        description=payload.description,
        priority=payload.priority,
        permissions=payload.permissions,
    )
    return success_response(
        data=role_to_dict(role, include_permissions=True),
        message="Role created.",
        status_code=201,
    )


@bp.patch("/<role_id>")
@jwt_required()
@require_permission("roles.update")
def update_role(role_id: str):
    """Update a role's descriptive fields."""
    payload = RoleUpdateRequest(**_body())
    role = _service.update_role(
        uuid.UUID(role_id),
        display_name=payload.display_name,
        description=payload.description,
        priority=payload.priority,
    )
    return success_response(
        data=role_to_dict(role, include_permissions=True), message="Role updated."
    )


@bp.delete("/<role_id>")
@jwt_required()
@require_permission("roles.delete")
def delete_role(role_id: str):
    """Delete a custom role."""
    _service.delete_role(uuid.UUID(role_id))
    return success_response(message="Role deleted.")


@bp.put("/<role_id>/permissions")
@jwt_required()
@require_permission("roles.assign_permissions")
def assign_permissions(role_id: str):
    """Replace a role's permission set."""
    payload = AssignPermissionsRequest(**_body())
    role = _service.assign_permissions(uuid.UUID(role_id), payload.permissions)
    return success_response(
        data=role_to_dict(role, include_permissions=True),
        message="Permissions updated.",
    )


@bp.post("/<role_id>/clone")
@jwt_required()
@require_permission("roles.create")
def clone_role(role_id: str):
    """Clone an existing role, copying its permissions."""
    payload = CloneRoleRequest(**_body())
    role = _service.clone_role(
        uuid.UUID(role_id),
        name=payload.name,
        display_name=payload.display_name,
        description=payload.description,
    )
    return success_response(
        data=role_to_dict(role, include_permissions=True),
        message="Role cloned.",
        status_code=201,
    )
