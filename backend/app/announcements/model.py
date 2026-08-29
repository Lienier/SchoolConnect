"""SQLAlchemy models for the announcements module.

Includes announcement categories, direct-published announcements and attachments.
Attachments reference uploaded files, keeping
the polymorphic upload strategy consistent with the rest of the system.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Boolean,
    Text,
    CheckConstraint,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.models.base import UUIDMixin
from app.utils.datetime import utcnow


class AnnouncementCategory(db.Model):
    """Category used to group and filter announcements."""

    __tablename__ = "announcement_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)


class Announcement(db.Model):
    """A college announcement authored by a staff member."""

    __tablename__ = "announcements"
    __table_args__ = (
        CheckConstraint(
            "priority IN ('normal','important','urgent')", name="ck_announcements_priority"
        ),
        CheckConstraint(
            "status IN ('published','archived')",
            name="ck_announcements_status",
        ),
        CheckConstraint(
            "expires_at IS NULL OR published_at IS NULL OR expires_at >= published_at",
            name="ck_announcements_expiry",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("announcement_categories.id"),
        nullable=True,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    priority: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    target_audience: Mapped[list[str] | None] = mapped_column(
        db.JSON, nullable=True  # stored as JSON array of role names or ["all"]
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    view_count: Mapped[int] = mapped_column(default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow,
        server_default=func.now(), nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    category: Mapped["AnnouncementCategory | None"] = relationship(
        "AnnouncementCategory", lazy="joined"
    )
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id], lazy="joined")
    attachments: Mapped[list["AnnouncementAttachment"]] = relationship(
        back_populates="announcement", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = utcnow()

    def to_dict(self) -> dict:
        """Return a plain dict representation."""
        data = {
            "id": str(self.id),
            "title": self.title,
            "body": self.body,
            "summary": self.summary,
            "category_id": str(self.category_id) if self.category_id else None,
            "category": self.category.name if self.category else None,
            "author_id": str(self.author_id),
            "priority": self.priority,
            "status": self.status,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "target_audience": self.target_audience,
            "is_pinned": self.is_pinned,
            "is_emergency": self.is_emergency,
            "view_count": self.view_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "author_name": self.author.full_name if self.author else None,
            "author_avatar": self.author.avatar_url if self.author else None,
            "author_role": (
                self.author.roles[0].name if self.author and self.author.roles else None
            ),
            "attachments": [attachment.to_dict() for attachment in self.attachments],
            "banner_url": self.banner_url,
        }
        return data

    @property
    def banner_url(self) -> str | None:
        """Return the first image attachment URL for feed/card previews."""
        for attachment in self.attachments:
            file = attachment.file
            if file and file.content_type.startswith("image/"):
                return file.url
        return None


class UploadedFile(db.Model):
    """Uploaded file metadata (polymorphic target for attachments)."""

    __tablename__ = "uploaded_files"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uploader_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)
    storage_backend: Mapped[str] = mapped_column(String(20), default="local", nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("size_bytes > 0", name="ck_uploaded_files_size"),
    )


class AnnouncementAttachment(db.Model):
    """Links an uploaded file to an announcement."""

    __tablename__ = "announcement_attachments"
    __table_args__ = (
        UniqueConstraint(
            "announcement_id", "file_id", name="uq_announcement_attachment"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    announcement_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("announcements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("uploaded_files.id", ondelete="CASCADE"),
        nullable=False,
    )
    announcement: Mapped[Announcement] = relationship(back_populates="attachments")
    file: Mapped[UploadedFile] = relationship("UploadedFile", lazy="joined")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "file_id": str(self.file_id),
            "filename": self.file.filename if self.file else None,
            "original_name": self.file.original_name if self.file else None,
            "content_type": self.file.content_type if self.file else None,
            "size_bytes": self.file.size_bytes if self.file else None,
            "url": self.file.url if self.file else None,
        }


__all__ = [
    "AnnouncementCategory",
    "Announcement",
    "AnnouncementAttachment",
    "UploadedFile",
]
