"""Shared event ownership and assignment authorization helpers."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.common.exceptions import AuthorizationError
from app.events.model import Event, EventOfficerAssignment
from app.extensions import db
from app.permissions.decorators import has_role


def can_manage_event(user_id: uuid.UUID | str, event: Event) -> bool:
    actor = uuid.UUID(str(user_id))
    if has_role(str(actor), "admin") or event.organizer_id == actor:
        return True
    assignment = db.session.scalar(
        select(EventOfficerAssignment.id).where(
            EventOfficerAssignment.event_id == event.id,
            EventOfficerAssignment.officer_id == actor,
        )
    )
    return assignment is not None


def require_event_manager(user_id: uuid.UUID | str, event: Event) -> None:
    if not can_manage_event(user_id, event):
        raise AuthorizationError("You can only manage events you organize or are assigned to.")


def managed_event_ids(user_id: uuid.UUID | str) -> list[uuid.UUID] | None:
    actor = uuid.UUID(str(user_id))
    if has_role(str(actor), "admin"):
        return None
    owned = db.session.scalars(
        select(Event.id).where(Event.organizer_id == actor, Event.deleted_at.is_(None))
    ).all()
    assigned = db.session.scalars(
        select(EventOfficerAssignment.event_id).where(
            EventOfficerAssignment.officer_id == actor
        )
    ).all()
    return list(dict.fromkeys([*owned, *assigned]))


__all__ = ["can_manage_event", "managed_event_ids", "require_event_manager"]
