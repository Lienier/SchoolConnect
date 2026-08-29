"""HTTP routes for the users module.

Admin user management, role assignment and self-service profile update. All
mutating/admin endpoints enforce permissions via the RBAC decorators.
"""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.auth.model import User
from app.auth.schema import public_user
from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.query import apply_filters, apply_search, apply_sort
from app.common.responses import error_response, success_response
from app.permissions.decorators import require_permission
from app.permissions.model import Role
from app.users.repository import RoleRepository
from app.users.service import UserService
from app.users.validators import (
    AdminResetPasswordRequest,
    AssignRolesRequest,
    ProfileUpdateRequest,
    StudentProfileUpdateRequest,
    SetAvatarRequest,
    UserCreateRequest,
    UserUpdateRequest,
)
from app.extensions import db
from app.audit.service import AuditService

bp = Blueprint("users", __name__, url_prefix="/users")
_service = UserService()
_roles = RoleRepository()
_audit = AuditService()

_SORTABLE = {
    "name": User.full_name,
    "email": User.email,
    "status": User.status,
    "created_at": User.created_at,
    "updated_at": User.updated_at,
    "last_login_at": User.last_login_at,
}


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


def _record_user_audit(action: str, target_id: uuid.UUID, changes=None) -> None:
    _audit.record_audit(
        action=action,
        entity_type="user",
        entity_id=target_id,
        actor_id=uuid.UUID(get_jwt_identity()),
        changes=changes,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
    )


@bp.get("")
@jwt_required()
@require_permission("users.view")
def list_users():
    """List users with pagination, search, filtering and sorting."""
    from sqlalchemy import select

    params = PaginationParams.from_request()
    stmt = _service.list_users_query()
    stmt = apply_search(stmt, request.args.get("search"), [User.email, User.full_name, User.username])
    if request.args.get("role"):
        stmt = (
            stmt.join(User.roles)
            .where(Role.name == request.args.get("role"))
        )
    stmt = apply_filters(stmt, {"status": User.status}, request.args)
    stmt = apply_sort(stmt, request.args.get("sort"), _SORTABLE, default=User.created_at)
    items, meta = paginate(stmt, params)
    return success_response(
        data=[public_user(u, include_roles=True) for u in items], meta=meta
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
        roles=[payload.role] if payload.role else payload.roles,
        first_name=payload.first_name,
        middle_name=payload.middle_name,
        last_name=payload.last_name,
        username=payload.username,
        status="active",
        student_number=payload.student_number,
        department_id=payload.department_id,
        course_id=payload.course_id,
        section_id=payload.section_id,
        officer_position=payload.officer_position,
        actor_id=actor,
    )
    _record_user_audit("user.created", user.id, {"roles": [role.name for role in user.roles]})
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
        middle_name=payload.middle_name,
        last_name=payload.last_name,
        username=payload.username,
        status=payload.status,
        phone=payload.phone,
    )
    _record_user_audit("user.updated", user.id, payload.model_dump(exclude_none=True))
    return success_response(
        data=public_user(user), message="User updated."
    )


@bp.delete("/<user_id>")
@jwt_required()
@require_permission("users.delete")
def delete_user(user_id: str):
    """Soft-delete a user."""
    target = uuid.UUID(user_id)
    _service.soft_delete_user(target)
    from app.realtime.service import disconnect_user
    disconnect_user(target)
    _record_user_audit("user.deleted", target)
    return success_response(message="User deleted.")


@bp.post("/<user_id>/disable")
@jwt_required()
@require_permission("users.update")
def disable_user(user_id: str):
    """Disable a user (status -> inactive)."""
    user = _service.disable_user(uuid.UUID(user_id))
    from app.realtime.service import disconnect_user
    disconnect_user(user.id)
    _record_user_audit("user.disabled", user.id, {"status": "inactive"})
    return success_response(data=public_user(user), message="User disabled.")


@bp.post("/<user_id>/suspend")
@jwt_required()
@require_permission("users.update")
def suspend_user(user_id: str):
    """Suspend a user (status -> suspended)."""
    user = _service.suspend_user(uuid.UUID(user_id))
    from app.realtime.service import disconnect_user
    disconnect_user(user.id)
    _record_user_audit("user.suspended", user.id, {"status": "suspended"})
    return success_response(data=public_user(user), message="User suspended.")


@bp.post("/<user_id>/reactivate")
@jwt_required()
@require_permission("users.update")
def reactivate_user(user_id: str):
    """Reactivate a disabled/suspended user (status -> active)."""
    user = _service.reactivate_user(uuid.UUID(user_id))
    _record_user_audit("user.reactivated", user.id, {"status": "active"})
    return success_response(data=public_user(user), message="User reactivated.")


@bp.post("/<user_id>/reset-password")
@jwt_required()
@require_permission("users.update")
def admin_reset_password(user_id: str):
    """Admin-reset a user's password."""
    payload = AdminResetPasswordRequest(**_body())
    target = uuid.UUID(user_id)
    _service.admin_reset_password(target, new_password=payload.new_password)
    _record_user_audit("user.password_reset", target)
    return success_response(message="Password reset.")


@bp.put("/<user_id>/avatar")
@jwt_required()
@require_permission("users.update")
def set_avatar(user_id: str):
    """Set a user's profile-picture URL."""
    payload = SetAvatarRequest(**_body())
    user = _service.set_avatar(uuid.UUID(user_id), payload.avatar_url)
    _record_user_audit("user.avatar_updated", user.id)
    return success_response(data=public_user(user), message="Avatar updated.")


@bp.get("/<user_id>/activity")
@jwt_required()
@require_permission("users.view")
def user_activity(user_id: str):
    """Return a user's audit + login + activity history."""
    params = PaginationParams.from_request()
    actor = uuid.UUID(user_id)
    audit_q = _audit.list_audit(actor_id=str(actor))
    login_q = _audit.list_logins(user_id=str(actor))
    activity_q = _audit.list_activity(user_id=str(actor))
    audit_items, audit_meta = paginate(audit_q, params)
    login_items, _ = paginate(login_q, params)
    activity_items, _ = paginate(activity_q, params)
    return success_response(
        data={
            "audit_logs": [a.to_dict() for a in audit_items],
            "login_history": [a.to_dict() for a in login_items],
            "activity_logs": [a.to_dict() for a in activity_items],
        },
        meta=audit_meta,
    )


@bp.put("/<user_id>/roles")
@jwt_required()
@require_permission("users.manage_roles")
def assign_roles(user_id: str):
    """Replace a user's roles."""
    payload = AssignRolesRequest(**_body())
    user = _service.assign_roles(uuid.UUID(user_id), payload.roles)
    _record_user_audit("user.roles_updated", user.id, {"roles": payload.roles})
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
    _record_user_audit("user.profile_updated", user.id)
    return success_response(data=public_user(user), message="Profile updated.")


@bp.get("/me/student-profile")
@jwt_required()
def my_student_profile():
    """Return the current student's college profile."""
    actor = uuid.UUID(get_jwt_identity())
    return success_response(data=_service.student_profile_data(actor))


@bp.patch("/me/student-profile")
@jwt_required()
def update_my_student_profile():
    """Complete the current student's department, course, and section."""
    payload = StudentProfileUpdateRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    profile = _service.update_student_profile(
        actor,
        department_id=payload.department_id,
        course_id=payload.course_id,
        section_id=payload.section_id,
    )
    _record_user_audit(
        "user.college_profile_completed",
        profile.id,
        {
            "department_id": str(profile.department_id),
            "course_id": str(profile.course_id),
            "section_id": str(profile.section_id),
        },
    )
    return success_response(
        data=_service.student_profile_data(profile.id),
        message="College profile updated.",
    )
