"""HTTP routes for the users module.

Admin user management, role assignment and self-service profile update. All
mutating/admin endpoints enforce permissions via the RBAC decorators.
"""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.auth.schema import public_user
from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import error_response, success_response
from app.permissions.decorators import require_permission
from app.users.repository import RoleRepository
from app.users.service import UserService
from app.users.validators import (
    AssignRolesRequest,
    ProfileUpdateRequest,
    UserCreateRequest,
    UserUpdateRequest,
)
from app.extensions import db

bp = Blueprint("users", __name__, url_prefix="/users")
_service = UserService()
_roles = RoleRepository()


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.get("")
@jwt_required()
@require_permission("users.view")
def list_users():
    """List users with server-side pagination."""
    params = PaginationParams.from_request()
    query = _service.list_users(page=params.page, page_size=params.page_size)
    items, meta = paginate(query, params)
    return success_response(
        data=[public_user(u) for u in items], meta=meta
    )


@bp.post("")
@jwt_required()
@require_permission("users.create")
def create_user():
    """Admin-create a user with roles."""
    payload = UserCreateRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    user = _service.create_user(
        email=str(payload.email),
        full_name=payload.full_name,
        password=payload.password,
        roles=payload.roles,
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
        status=payload.status,
        actor_id=actor,
    )
    return success_response(
        data=public_user(user, include_roles=True),
        message="User created.",
        status_code=201,
    )


@bp.get("/<user_id>")
@jwt_required()
@require_permission("users.view")
def get_user(user_id: str):
    """Get a single user by id."""
    user = _service.get_user(uuid.UUID(user_id))
    return success_response(data=public_user(user, include_roles=True))


@bp.patch("/<user_id>")
@jwt_required()
@require_permission("users.update")
def update_user(user_id: str):
    """Update a user's modifiable fields."""
    payload = UserUpdateRequest(**_body())
    user = _service.update_user(
        uuid.UUID(user_id),
        full_name=payload.full_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
        status=payload.status,
        phone=payload.phone,
    )
    return success_response(
        data=public_user(user), message="User updated."
    )


@bp.delete("/<user_id>")
@jwt_required()
@require_permission("users.delete")
def delete_user(user_id: str):
    """Soft-delete a user."""
    _service.soft_delete_user(uuid.UUID(user_id))
    return success_response(message="User deleted.")


@bp.put("/<user_id>/roles")
@jwt_required()
@require_permission("users.manage_roles")
def assign_roles(user_id: str):
    """Replace a user's roles."""
    payload = AssignRolesRequest(**_body())
    user = _service.assign_roles(uuid.UUID(user_id), payload.roles)
    return success_response(
        data=public_user(user, include_roles=True),
        message="Roles updated.",
    )


@bp.get("/roles/all")
@jwt_required()
@require_permission("roles.view")
def list_roles():
    """List all roles."""
    return success_response(data=[{"name": r.name, "display_name": r.display_name,
                                   "is_system": r.is_system} for r in _service.list_roles()])


@bp.get("/me/profile")
@jwt_required()
def my_profile():
    """Return the current user's own profile."""
    from app.auth.repository import UserRepository

    user = UserRepository().get_by_id(uuid.UUID(get_jwt_identity()))
    if user is None:
        return error_response("User not found.", status_code=404)
    return success_response(data=public_user(user, include_roles=True))


@bp.patch("/me/profile")
@jwt_required()
def update_my_profile():
    """Update the current user's own basic profile fields."""
    payload = ProfileUpdateRequest(**_body())
    from app.auth.repository import UserRepository

    user = UserRepository().get_by_id(uuid.UUID(get_jwt_identity()))
    if user is None:
        return error_response("User not found.", status_code=404)
    _service.update_own_profile(
        user, phone=payload.phone, first_name=payload.first_name,
        last_name=payload.last_name,
    )
    return success_response(data=public_user(user), message="Profile updated.")
