"""Business logic for the announcements module.

Handles creation (draft or submitted for approval), updates, listing (public
feed vs. management views), the approval workflow, and soft deletion.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.announcements.model import (
    Announcement,
    AnnouncementApproval,
    AnnouncementCategory,
)
from app.announcements.repository import (
    AnnouncementApprovalRepository,
    AnnouncementCategoryRepository,
    AnnouncementRepository,
)
from app.common.exceptions import AuthorizationError, NotFoundError, ValidationError


class AnnouncementService:
    """Coordinates announcement workflows across repositories."""

    def __init__(self) -> None:
        self.announcements = AnnouncementRepository()
        self.categories = AnnouncementCategoryRepository()
        self.approvals = AnnouncementApprovalRepository()

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
        submit_for_approval: bool = False,
    ) -> Announcement:
        """Create an announcement as draft or submitted for approval."""
        category_uuid = None
        if category_id:
            category_uuid = uuid.UUID(category_id)
            if self.categories.get_by_id(category_uuid) is None:
                raise NotFoundError("Category not found.")

        status = "pending_approval" if submit_for_approval else "draft"
        announcement = Announcement(
            title=title,
            body=body,
            summary=summary,
            category_id=category_uuid,
            author_id=author_id,
            priority=priority,
            status=status,
            target_audience=target_audience,
            expires_at=self._parse_dt(expires_at),
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
        if announcement.status in ("published", "archived"):
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
                    value = self._parse_dt(value)
                setattr(announcement, key, value)
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

    # --- approval ----------------------------------------------------------
    def decide(
        self, *, announcement_id: uuid.UUID, reviewer_id: uuid.UUID,
        decision: str, comment=None,
    ) -> Announcement:
        """Record an approval decision and transition announcement status."""
        if decision not in ("approved", "rejected", "returned"):
            raise ValidationError("Decision must be 'approved', 'rejected', or 'returned'.")
        announcement = self.get_announcement(announcement_id)
        if announcement.status != "pending_approval":
            raise ValidationError("Announcement is not pending approval.")

        record = AnnouncementApproval(
            announcement_id=announcement.id,
            reviewer_id=reviewer_id,
            decision=decision,
            comment=comment,
            decided_at=datetime.now(timezone.utc),
        )
        self.approvals.add(record)
        if decision == "approved":
            announcement.status = "published"
            announcement.published_at = datetime.now(timezone.utc)
        else:
            announcement.status = "draft"
        self.announcements.commit()
        try:
            from app.notifications.service import NotificationService
            NotificationService().notify(user_id=announcement.author_id, title=f"Announcement {announcement.status}", body=f"Your announcement '{announcement.title}' was {announcement.status}.", category="announcement_workflow", entity_type="announcement", entity_id=announcement.id)
        except Exception:
            pass
        return announcement

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
