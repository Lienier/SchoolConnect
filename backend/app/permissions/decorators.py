"""Authorization decorators enforcing the permission-based RBAC system.

A user is authorized by checking whether they hold a required permission,
aggregated across all of their assigned roles. This is more flexible than
role checks: new roles can be minted without changing authorization logic.
"""

from __future__ import annotations

from functools import wraps
from typing import Callable
import uuid

from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.common.exceptions import AuthorizationError
from app.extensions import db
from app.permissions.model import Permission, Role, RolePermission, UserRole


def _coerce_user_id(user_id: str | uuid.UUID) -> uuid.UUID:
    return user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))


def _load_user_permissions(user_id: str) -> set[str]:
    """Return the set of permission names granted to a user across roles."""
    stmt = (
        db.select(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == _coerce_user_id(user_id))
    )
    rows = db.session.execute(stmt).scalars().all()
    return set(rows)


def has_permission(user_id: str, permission: str) -> bool:
    """Return whether a user holds ``permission`` (admin wildcard included)."""
    perms = _load_user_permissions(user_id)
    return "*" in perms or permission in perms


def user_roles(user_id: str) -> set[str]:
    """Return role names assigned to a user for resource-level filtering."""
    stmt = (
        db.select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == _coerce_user_id(user_id))
    )
    return set(db.session.execute(stmt).scalars().all())


def has_role(user_id: str, role: str) -> bool:
    return role in user_roles(user_id)


def require_permission(permission: str) -> Callable:
    """Restrict a route to users holding ``permission``.

    Raises :class:`AuthorizationError` when the user lacks the permission.
    """

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            if permission not in _load_user_permissions(user_id):
                raise AuthorizationError(
                    "You do not have permission to perform this action."
                )
            return view(*args, **kwargs)

        return wrapper

    return decorator


def require_any_permission(*permissions: str) -> Callable:
    """Restrict a route to users holding at least one of ``permissions``."""

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            granted = _load_user_permissions(user_id)
            if not set(permissions).intersection(granted):
                raise AuthorizationError(
                    "You do not have permission to perform this action."
                )
            return view(*args, **kwargs)

        return wrapper

    return decorator


def require_roles(*allowed_roles: str) -> Callable:
    """Restrict a route to users holding one of the named roles.

    Provided for convenience; prefer :func:`require_permission` for granular
    control. The user's roles are resolved from the RBAC join tables.
    """

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            stmt = (
                db.select(Role.name)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(UserRole.user_id == _coerce_user_id(user_id))
            )
            roles = set(db.session.execute(stmt).scalars().all())
            if not set(allowed_roles).intersection(roles):
                raise AuthorizationError(
                    "You do not have permission to perform this action."
                )
            return view(*args, **kwargs)

        return wrapper

    return decorator
