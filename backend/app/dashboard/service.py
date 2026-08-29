"""Dashboard statistics aggregation service.

A widget is a named callable returning a JSON-serializable value. Providers are
declared in :data:`WIDGET_PROVIDERS`; :meth:`DashboardService.snapshot` runs the
requested widgets (or all of them) inside a single request context. This keeps
the dashboard free of hard-coded logic while remaining trivially extensible.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable
import uuid

from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func, select, and_, or_

from app.auth.model import User
from app.announcements.model import Announcement
from app.events.model import Event
from app.registrations.model import Registration
from app.extensions import db


def _count_active_users() -> int:
    return int(
        db.session.scalar(
            select(func.count(User.id)).where(
                User.deleted_at.is_(None), User.status == "active"
            )
        )
        or 0
    )


def _count_students() -> int:
    from app.permissions.model import Role, UserRole

    return int(
        db.session.scalar(
            select(func.count(UserRole.user_id))
            .join(Role, Role.id == UserRole.role_id)
            .where(Role.name == "student")
        )
        or 0
    )


def _count_announcements() -> int:
    return int(
        db.session.scalar(
            select(func.count(Announcement.id)).where(Announcement.deleted_at.is_(None))
        )
        or 0
    )


def _count_active_events() -> int:
    return int(
        db.session.scalar(
            select(func.count(Event.id)).where(
                Event.deleted_at.is_(None), Event.status.in_(("approved", "ongoing"))
            )
        )
        or 0
    )


def _count_open_registrations() -> int:
    return int(
        db.session.scalar(
            select(func.count(Registration.id)).where(
                Registration.status.in_(("pending", "approved", "waitlisted")),
                Registration.deleted_at.is_(None),
            )
        )
        or 0
    )


def _count_upcoming_events() -> int:
    """Count upcoming approved/ongoing events that have not started yet."""
    now = datetime.now(timezone.utc)
    return int(
        db.session.scalar(
            select(func.count(Event.id)).where(
                Event.deleted_at.is_(None),
                Event.status.in_(("approved", "ongoing")),
                or_(Event.start_time.is_(None), Event.start_time > now),
            )
        )
        or 0
    )


def _count_my_registrations() -> int:
    """Count current user's active registrations."""
    user_id = get_jwt_identity()
    if not user_id:
        return 0
    user_uuid = uuid.UUID(user_id)
    return int(
        db.session.scalar(
            select(func.count(Registration.id)).where(
                Registration.user_id == user_uuid,
                Registration.deleted_at.is_(None),
                Registration.status.in_(("pending", "approved", "waitlisted")),
            )
        )
        or 0
    )


def _count_my_notifications() -> int:
    """Count current user's unread notifications."""
    user_id = get_jwt_identity()
    if not user_id:
        return 0
    user_uuid = uuid.UUID(user_id)
    from app.notifications.model import Notification
    return int(
        db.session.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_uuid,
                Notification.status == "unread",
            )
        )
        or 0
    )


def _count_officer_proposals() -> int:
    """Count event proposals created by current user (officer)."""
    user_id = get_jwt_identity()
    if not user_id:
        return 0
    user_uuid = uuid.UUID(user_id)
    return int(
        db.session.scalar(
            select(func.count(Event.id)).where(
                Event.created_by == user_uuid,
                Event.deleted_at.is_(None),
            )
        )
        or 0
    )


WIDGET_PROVIDERS: dict[str, Callable[[], int]] = {
    # Admin / general
    "total_users": _count_active_users,
    "total_students": _count_students,
    "total_announcements": _count_announcements,
    "active_events": _count_active_events,
    "open_registrations": _count_open_registrations,
    # Student
    "upcoming_events": _count_upcoming_events,
    "my_registrations": _count_my_registrations,
    "notifications": _count_my_notifications,
    # Officer
    "officer_proposals": _count_officer_proposals,
}


class DashboardService:
    """Aggregates dashboard widgets on demand."""

    def snapshot(self, widgets: list[str] | None = None) -> dict:
        """Return a dict of widget name -> value.

        Args:
            widgets: Optional list of widget names to compute. When ``None``,
                every registered widget is computed.

        Returns:
            A mapping of widget name to its computed value.

        Raises:
            ValueError: If a requested widget name is not registered.
        """
        requested = widgets or list(WIDGET_PROVIDERS)
        unknown = [name for name in requested if name not in WIDGET_PROVIDERS]
        if unknown:
            raise ValueError(f"Unknown dashboard widgets: {', '.join(unknown)}")
        return {name: WIDGET_PROVIDERS[name]() for name in requested}
