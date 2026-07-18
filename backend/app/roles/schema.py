"""Serialization helpers for the roles module."""

from __future__ import annotations

from app.permissions.model import Permission, Role


def role_to_dict(role: Role, *, include_permissions: bool = False) -> dict:
    """Serialize a ``Role`` to a JSON-safe dict."""
    data = {
        "id": str(role.id),
        "name": role.name,
        "display_name": role.display_name,
        "description": role.description,
        "is_system": role.is_system,
        "priority": role.priority,
        "created_at": role.created_at.isoformat() if role.created_at else None,
    }
    if include_permissions:
        data["permissions"] = sorted(perm.name for perm in role.permissions)
    return data


def permission_to_dict(permission: Permission) -> dict:
    """Serialize a ``Permission`` to a JSON-safe dict."""
    return {
        "id": str(permission.id),
        "name": permission.name,
        "resource": permission.resource,
        "action": permission.action,
        "description": permission.description,
    }
