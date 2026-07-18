"""Data-access layer for the events module."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.events.model import (
    CalendarEvent,
    Event,
    EventApproval,
    EventAttachment,
    EventCategory,
    EventRequirement,
)
from app.extensions import db


class EventRepository:
    """Persistence operations for ``Event``."""

    def get_by_id(self, entity_id: uuid.UUID, include_deleted: bool = False) -> Event | None:
        stmt = select(Event).where(Event.id == entity_id)
        if not include_deleted:
            stmt = stmt.where(Event.deleted_at.is_(None))
        return db.session.scalar(stmt)

    def list_query(self, *, status=None, category_id=None, organizer_id=None):
        stmt = select(Event)
        if status:
            stmt = stmt.where(Event.status == status)
        if category_id:
            stmt = stmt.where(Event.category_id == category_id)
        if organizer_id:
            stmt = stmt.where(Event.organizer_id == organizer_id)
        stmt = stmt.where(Event.deleted_at.is_(None)).order_by(Event.start_time.desc())
        return stmt

    def add(self, entity: Event) -> Event:
        db.session.add(entity)
        return entity

    def flush(self) -> None:
        db.session.flush()

    def commit(self) -> None:
        db.session.commit()


class EventCategoryRepository:
    """Persistence operations for ``EventCategory``."""

    def get_by_id(self, entity_id: uuid.UUID) -> EventCategory | None:
        return db.session.scalar(
            select(EventCategory).where(EventCategory.id == entity_id)
        )

    def list_all(self) -> list[EventCategory]:
        return list(db.session.scalars(select(EventCategory)).all())

    def add(self, entity: EventCategory) -> EventCategory:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class EventApprovalRepository:
    """Persistence operations for ``EventApproval``."""

    def add(self, entity: EventApproval) -> EventApproval:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class CalendarEventRepository:
    """Persistence operations for ``CalendarEvent``."""

    def add(self, entity: CalendarEvent) -> CalendarEvent:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class EventAttachmentRepository:
    """Persistence operations for ``EventAttachment``."""

    def add(self, entity: EventAttachment) -> EventAttachment:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class EventRequirementRepository:
    """Persistence operations for ``EventRequirement``."""

    def add(self, entity: EventRequirement) -> EventRequirement:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()
