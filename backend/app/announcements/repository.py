"""Data-access layer for the announcements module."""

from __future__ import annotations

import uuid

from sqlalchemy import select, case

from app.announcements.model import (
    Announcement,
    AnnouncementApproval,
    AnnouncementCategory,
)
from app.extensions import db


class AnnouncementRepository:
    """Persistence operations for ``Announcement``."""

    def get_by_id(self, entity_id: uuid.UUID, include_deleted: bool = False) -> Announcement | None:
        """Return an announcement by id, honoring soft delete by default."""
        stmt = select(Announcement).where(Announcement.id == entity_id)
        if not include_deleted:
            stmt = stmt.where(Announcement.deleted_at.is_(None))
        return db.session.scalar(stmt)

    def list_query(self, *, status=None, category_id=None, priority=None, pinned_first: bool = True):
        """Return a base query for listing announcements with optional filters."""
        stmt = select(Announcement)
        if status:
            stmt = stmt.where(Announcement.status == status)
        if category_id:
            stmt = stmt.where(Announcement.category_id == category_id)
        if priority:
            stmt = stmt.where(Announcement.priority == priority)
        stmt = stmt.where(Announcement.deleted_at.is_(None))
        if pinned_first:
            priority_order = case(
                (Announcement.priority == "urgent", 0),
                (Announcement.priority == "important", 1),
                else_=2,
            )
            stmt = stmt.order_by(
                priority_order.asc(), Announcement.is_pinned.desc(), Announcement.created_at.desc()
            )
        return stmt

    def add(self, entity: Announcement) -> Announcement:
        """Stage a new announcement."""
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        """Commit the current unit of work."""
        db.session.commit()

    def flush(self) -> None:
        """Flush pending changes."""
        db.session.flush()


class AnnouncementCategoryRepository:
    """Persistence operations for ``AnnouncementCategory``."""

    def get_by_id(self, entity_id: uuid.UUID) -> AnnouncementCategory | None:
        """Return a category by id."""
        return db.session.scalar(
            select(AnnouncementCategory).where(AnnouncementCategory.id == entity_id)
        )

    def list_all(self) -> list[AnnouncementCategory]:
        """Return all categories."""
        return list(db.session.scalars(select(AnnouncementCategory)).all())

    def add(self, entity: AnnouncementCategory) -> AnnouncementCategory:
        """Stage a new category."""
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        """Commit the current unit of work."""
        db.session.commit()


class AnnouncementApprovalRepository:
    """Persistence operations for ``AnnouncementApproval``."""

    def add(self, entity: AnnouncementApproval) -> AnnouncementApproval:
        """Stage a new approval record."""
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        """Commit the current unit of work."""
        db.session.commit()
