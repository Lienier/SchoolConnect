"""Public bulletin feed routes used by the social-style UI."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import and_, func, select

from app.announcements.model import Announcement
from app.events.model import Event
from app.extensions import db
from app.common.responses import success_response
from app.registrations.model import Registration
from app.auth.model import User

bp = Blueprint("feed", __name__, url_prefix="/feed")

_ROLE_ORDER = ("admin", "teacher", "student_council", "department_student_leader", "student")


def _primary_role(user: User | None) -> str | None:
    if user is None or not getattr(user, "roles", None):
        return None
    role_names = [role.name for role in user.roles]
    for role in _ROLE_ORDER:
        if role in role_names:
            return role
    return role_names[0] if role_names else None


def _limit_from_request(default: int = 12) -> int:
    raw = request.args.get("limit", str(default))
    try:
        return max(1, min(50, int(raw)))
    except (TypeError, ValueError):
        return default


def _kind_from_request() -> str:
    kind = (request.args.get("kind") or "all").strip().lower()
    return kind if kind in {"all", "announcements", "events"} else "all"


def _announcement_item(announcement: Announcement) -> dict:
    attachments = [attachment.to_dict() for attachment in announcement.attachments]
    return {
        "id": str(announcement.id),
        "type": "announcement",
        "title": announcement.title,
        "body": announcement.summary or announcement.body,
        "author_id": str(announcement.author_id),
        "author_name": announcement.author.full_name if announcement.author else None,
        "author_avatar": announcement.author.avatar_url if announcement.author else None,
        "author_role": _primary_role(announcement.author),
        "category": announcement.category.name if announcement.category else None,
        "priority": announcement.priority,
        "status": announcement.status,
        "is_pinned": announcement.is_pinned,
        "is_emergency": announcement.is_emergency,
        "created_at": announcement.created_at.isoformat() if announcement.created_at else None,
        "updated_at": announcement.updated_at.isoformat() if announcement.updated_at else None,
        "tags": [announcement.category.slug] if announcement.category else [],
        "target_audience": announcement.target_audience,
        "attachments": attachments,
        "banner_url": announcement.banner_url,
    }


def _audience_allows(announcement: Announcement, role_names: set[str]) -> bool:
    """Apply announcement audience rules for both public and logged-in users."""
    if announcement.expires_at is not None:
        expiry = announcement.expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if expiry < datetime.now(timezone.utc):
            return False
    audience = announcement.target_audience or []
    if not audience or "all" in audience:
        return True
    return bool(role_names.intersection(audience))


def _event_item(event: Event, registered_count: int) -> dict:
    attachments = [attachment.to_dict() for attachment in event.attachments]
    return {
        "id": str(event.id),
        "type": "event",
        "title": event.title,
        "body": event.description or "",
        "author_id": str(event.organizer_id),
        "author_name": event.organizer.full_name if event.organizer else None,
        "author_avatar": event.organizer.avatar_url if event.organizer else None,
        "author_role": _primary_role(event.organizer),
        "category": event.category.name if event.category else None,
        "status": event.status,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "updated_at": event.updated_at.isoformat() if event.updated_at else None,
        "start_time": event.start_time.isoformat() if event.start_time else None,
        "end_time": event.end_time.isoformat() if event.end_time else None,
        "location": event.location,
        "capacity": event.capacity,
        "registered_count": registered_count,
        "registration_deadline": (
            event.registration_deadline.isoformat() if event.registration_deadline else None
        ),
        "is_team_event": event.is_team_event,
        "max_team_size": event.max_team_size,
        "approval_required": event.approval_required,
        "tags": [event.category.slug] if event.category else [],
        "attachments": attachments,
        "banner_url": event.banner_url,
    }


@bp.get("")
@jwt_required(optional=True)
def public_feed():
    """Return a merged bulletin feed for public and authenticated surfaces."""
    kind = _kind_from_request()
    limit = _limit_from_request()

    items: list[dict] = []
    role_names: set[str] = set()
    identity = get_jwt_identity()
    if identity:
        user = db.session.get(User, uuid.UUID(identity))
        if user:
            role_names = {role.name for role in user.roles}

    if kind in {"all", "announcements"}:
        announcements = db.session.scalars(
            select(Announcement)
            .where(
                Announcement.deleted_at.is_(None),
                Announcement.status == "published",
            )
            .order_by(
                Announcement.is_emergency.desc(),
                Announcement.is_pinned.desc(),
                Announcement.created_at.desc(),
            )
            .limit(limit)
        ).all()
        items.extend(
            _announcement_item(a)
            for a in announcements
            if _audience_allows(a, role_names)
        )

    if kind in {"all", "events"}:
        # Count registrations with a correlated subquery instead of grouping
        # the full Event entity. Event relationships use joined loading, so a
        # GROUP BY events.id also selects category/organizer columns and fails
        # on PostgreSQL's strict grouping rules.
        registered_count = (
            select(func.count(Registration.id))
            .where(
                Registration.event_id == Event.id,
                Registration.deleted_at.is_(None),
                Registration.status.in_(("pending", "approved", "attended")),
            )
            .correlate(Event)
            .scalar_subquery()
            .label("registered_count")
        )
        event_rows = db.session.execute(
            select(Event, registered_count)
            .where(
                Event.deleted_at.is_(None),
                Event.status.in_(("approved", "ongoing")),
            )
            .order_by(Event.created_at.desc())
            .limit(limit)
        ).all()
        items.extend(_event_item(event, int(registered_count or 0)) for event, registered_count in event_rows)

    items.sort(key=_sort_key)

    return success_response(data=items)


def _sort_key(item: dict) -> tuple[int, int, float]:
    """Sort urgent/pinned items first, then newest items first."""
    urgency = 0
    if item["type"] == "announcement":
        if item.get("is_emergency"):
            urgency = 2
        elif item.get("is_pinned"):
            urgency = 1
    created_at = _parse_dt(item.get("created_at"))
    return (-urgency, -created_at.timestamp(), 0)


def _parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)
