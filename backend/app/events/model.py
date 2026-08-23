"""SQLAlchemy models for the events module.

Includes event categories, events (with draft/approval workflow, capacity and
team settings), attachments, requirements, approvals and the calendar view.
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
    Integer,
    CheckConstraint,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.utils.datetime import utcnow


class EventCategory(db.Model):
    """Category used to group and filter events."""

    __tablename__ = "event_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)


class Event(db.Model):
    """A school event organized by a staff member."""

    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','pending_approval','approved','ongoing','completed','cancelled','archived','returned')",
            name="ck_events_status",
        ),
        CheckConstraint("capacity IS NULL OR capacity >= 0", name="ck_events_capacity"),
        CheckConstraint(
            "max_team_size IS NULL OR max_team_size >= 2", name="ck_events_team_size"
        ),
        CheckConstraint("end_time > start_time", name="ck_events_time_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("event_categories.id"),
        nullable=True,
        index=True,
    )
    organizer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    registration_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_team_event: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    max_team_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    banner_file_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("uploaded_files.id"), nullable=True
    )
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

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

    category: Mapped["EventCategory | None"] = relationship("EventCategory", lazy="joined")
    organizer: Mapped["User"] = relationship(
        "User", foreign_keys=[organizer_id], lazy="joined"
    )
    approvals: Mapped[list["EventApproval"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    results: Mapped[list["EventResult"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = utcnow()

    def to_dict(self, include_approvals: bool = False) -> dict:
        data = {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "category_id": str(self.category_id) if self.category_id else None,
            "category": self.category.name if self.category else None,
            "organizer_id": str(self.organizer_id),
            "organization_id": str(self.organization_id) if self.organization_id else None,
            "status": self.status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "location": self.location,
            "capacity": self.capacity,
            "registration_deadline": self.registration_deadline.isoformat()
            if self.registration_deadline
            else None,
            "is_team_event": self.is_team_event,
            "max_team_size": self.max_team_size,
            "approval_required": self.approval_required,
            "view_count": self.view_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "organizer_name": self.organizer.full_name if self.organizer else None,
            "organizer_avatar": self.organizer.avatar_url if self.organizer else None,
            "organizer_role": (
                self.organizer.roles[0].name if self.organizer and self.organizer.roles else None
            ),
        }
        if include_approvals:
            data["approvals"] = [
                {
                    "id": str(a.id),
                    "reviewer_id": str(a.reviewer_id),
                    "reviewer_name": a.reviewer.full_name if a.reviewer else None,
                    "decision": a.decision,
                    "comment": a.comment,
                    "decided_at": a.decided_at.isoformat() if a.decided_at else None,
                }
                for a in self.approvals
            ]
            data["results"] = [r.to_dict() for r in self.results]
        return data


class EventAttachment(db.Model):
    """Links an uploaded file to an event."""

    __tablename__ = "event_attachments"
    __table_args__ = (
        UniqueConstraint("event_id", "file_id", name="uq_event_attachment"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("uploaded_files.id", ondelete="CASCADE"),
        nullable=False,
    )


class EventRequirement(db.Model):
    """A requirement participants must satisfy for an event."""

    __tablename__ = "event_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    requirement_value: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class EventApproval(db.Model):
    """Approval decision record for an event (history is append-only)."""

    __tablename__ = "event_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    decision: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )

    event: Mapped[Event] = relationship(back_populates="approvals")
    reviewer: Mapped["User"] = relationship("User", foreign_keys=[reviewer_id], lazy="joined")


class CalendarEvent(db.Model):
    """Calendar representation of a published event."""

    __tablename__ = "calendar_events"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_calendar_event"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class EventResult(db.Model):
    """Structured result or award published for a completed event."""

    __tablename__ = "event_results"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    placement: Mapped[int | None] = mapped_column(Integer, nullable=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    winner_user_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    team_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_file_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("uploaded_files.id"), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now(), nullable=False)

    event: Mapped[Event] = relationship(back_populates="results")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id), "event_id": str(self.event_id), "placement": self.placement,
            "title": self.title, "winner_user_id": str(self.winner_user_id) if self.winner_user_id else None,
            "team_id": str(self.team_id) if self.team_id else None, "remarks": self.remarks,
            "attachment_file_id": str(self.attachment_file_id) if self.attachment_file_id else None,
            "created_by": str(self.created_by), "created_at": self.created_at.isoformat(),
        }


__all__ = [
    "EventCategory",
    "Event",
    "EventAttachment",
    "EventRequirement",
    "EventApproval",
    "CalendarEvent",
    "EventResult",
]
