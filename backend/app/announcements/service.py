"""Business logic for the announcements module.

Handles direct publishing, visibility, moderation, and soft deletion.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.announcements.model import (
    Announcement,
    AnnouncementCategory,
)
from app.announcements.repository import (
    AnnouncementCategoryRepository,
    AnnouncementRepository,
)
from app.common.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.utils.datetime import date_in_app_timezone, today_in_app_timezone, utcnow


class AnnouncementService:
    """Coordinates announcement workflows across repositories."""

    def __init__(self) -> None:
        self.announcements = AnnouncementRepository()
        self.categories = AnnouncementCategoryRepository()

    # --- categories -------------------------------------------------------
    def create_category(
        self, *, name: str, slug: str, description=None, color=None
    ) -> AnnouncementCategory:
        """Create a new announcement category."""
        if self.categories.get_by_id is not None:
            existing = self._category_by_slug(slug)
            if existing is not None:
                raise ValidationError("A category with this slug already exists.")
        category = AnnouncementCategory(
            name=name, slug=slug, description=description, color=color
        )
        self.categories.add(category)
        self.categories.commit()
        return category

    def list_categories(self) -> list[AnnouncementCategory]:
        """Return all categories."""
        return self.categories.list_all()

    # --- create -----------------------------------------------------------
    def create_announcement(
        self,
        *,
        author_id: uuid.UUID,
        title: str,
        body: str,
        summary=None,
        category_id=None,
        priority: str = "normal",
        target_audience=None,
        expires_at=None,
    ) -> Announcement:
        """Create and immediately publish an announcement."""
        category_uuid = None
        if category_id:
            category_uuid = uuid.UUID(category_id)
            if self.categories.get_by_id(category_uuid) is None:
                raise NotFoundError("Category not found.")

        announcement = Announcement(
            title=title,
            body=body,
            summary=summary,
            category_id=category_uuid,
            author_id=author_id,
            priority=priority,
            status="published",
            published_at=datetime.now(timezone.utc),
            target_audience=target_audience,
            expires_at=self._parse_future_date(expires_at, "expires_at"),
            created_by=author_id,
            updated_by=author_id,
        )
        self.announcements.add(announcement)
        self.announcements.commit()
        return announcement

    # --- update -----------------------------------------------------------
    def update_announcement(self, announcement_id: uuid.UUID, *, actor_id: uuid.UUID | None = None, can_override: bool = False, **fields) -> Announcement:
        """Update a draft/modifiable announcement."""
        announcement = self.announcements.get_by_id(announcement_id)
        if announcement is None:
            raise NotFoundError("Announcement not found.")
        if announcement.status in ("published", "archived") and not can_override:
            raise ValidationError("Published announcements cannot be edited.")
        if actor_id is not None and not can_override and announcement.author_id != actor_id:
            raise AuthorizationError("You can only edit your own announcements.")
        for key in ("title", "body", "summary", "category_id", "priority",
                    "target_audience", "expires_at"):
            if key in fields and fields[key] is not None:
                value = fields[key]
                if key == "category_id":
                    value = uuid.UUID(value) if value else None
                    if value and self.categories.get_by_id(value) is None:
                        raise NotFoundError("Category not found.")
                if key == "expires_at":
                    value = self._parse_future_date(value, "expires_at")
                setattr(announcement, key, value)
        announcement.updated_at = datetime.now(timezone.utc)
        self.announcements.commit()
        return announcement

    def archive_announcement(
        self,
        announcement_id: uuid.UUID,
        *,
        actor_id: uuid.UUID | None = None,
        can_override: bool = False,
    ) -> Announcement:
        """Hide an announcement from public feeds by archiving it."""
        announcement = self.get_announcement(announcement_id)
        if actor_id is not None and not can_override and announcement.author_id != actor_id:
            raise AuthorizationError("You can only archive your own announcements.")
        announcement.status = "archived"
        announcement.updated_at = datetime.now(timezone.utc)
        self.announcements.commit()
        return announcement

    # --- list --------------------------------------------------------------
    def list_announcements(self, status=None, category_id=None, priority=None):
        """Return a query for listing announcements (caller paginates)."""
        return self.announcements.list_query(
            status=status, category_id=category_id, priority=priority
        )

    def get_announcement(self, announcement_id: uuid.UUID) -> Announcement:
        """Return an announcement or raise NotFound."""
        announcement = self.announcements.get_by_id(announcement_id)
        if announcement is None:
            raise NotFoundError("Announcement not found.")
        return announcement

    @staticmethod
    def visible_to(announcement: Announcement, role_names: set[str]) -> bool:
        """Return whether a published announcement is active for these roles."""
        if announcement.status != "published":
            return False
        if announcement.expires_at is not None:
            expires = announcement.expires_at
            now = utcnow()
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=now.tzinfo)
            if expires < now:
                return False
        audience = set(announcement.target_audience or [])
        return not audience or "all" in audience or bool(audience & role_names)

    # --- delete ------------------------------------------------------------
    def delete_announcement(self, announcement_id: uuid.UUID, *, actor_id: uuid.UUID | None = None, can_override: bool = False) -> None:
        """Soft-delete an announcement."""
        announcement = self.get_announcement(announcement_id)
        if actor_id is not None and not can_override and announcement.author_id != actor_id:
            raise AuthorizationError("You can only delete your own announcements.")
        announcement.soft_delete()
        self.announcements.commit()

    # --- helpers -----------------------------------------------------------
    @staticmethod
    def _parse_dt(value: str | None):
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    def _parse_future_date(self, value: str | None, field: str):
        parsed = self._parse_dt(value)
        if parsed is not None and date_in_app_timezone(parsed) < today_in_app_timezone():
            raise ValidationError(f"{field} cannot be in the past.")
        return parsed
