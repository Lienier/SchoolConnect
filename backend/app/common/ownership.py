"""Reusable ownership / assignment scoping for role-based access.

Many spec rules are not just "has permission X" but "has permission X **on
this record**" — e.g. a teacher may manage only events they organize, a
student-council officer only attendance for events assigned to them. This
module centralizes that logic so services stay consistent and the rules are
auditable in one place.

Convention: a service calls :func:`enforce_owner_or_permission` passing the
record's owner id, the current user id, and a required permission. Admin
(``*``) always passes; otherwise the user must either own the record **or**
hold the named permission (e.g. ``events.manage_all`` lets an admin manage any
pending event).
"""

from __future__ import annotations

import uuid

from app.common.exceptions import AuthorizationError


def is_owner(record_owner_id: uuid.UUID | None, user_id: uuid.UUID) -> bool:
    """Return whether ``user_id`` owns the record."""
    return record_owner_id is not None and record_owner_id == user_id


def enforce_owner_or_permission(
    *,
    record_owner_id: uuid.UUID | None,
    user_id: uuid.UUID,
    has_permission: bool,
    message: str = "You do not have permission to modify this record.",
) -> None:
    """Raise :class:`AuthorizationError` unless user owns the record or has perm.

    Args:
        record_owner_id: The id of the record's owner/organizer/creator.
        user_id: The acting user's id.
        has_permission: Whether the user holds the overriding permission
            (e.g. ``events.manage_all``). Admins should resolve this to ``True``.
        message: Error message when access is denied.
    """
    if is_owner(record_owner_id, user_id) or has_permission:
        return
    raise AuthorizationError(message)
