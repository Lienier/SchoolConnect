"""SQLAlchemy models for the attendance module.

Covers attendance records (one per registration), an append-only attendance
log for audit, and single-use QR tokens for check-in.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.utils.datetime import utcnow


class Attendance(db.Model):
    """Attendance record for a participant at an event."""

    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_attendance_event_user"),
        CheckConstraint(
            "status IN ('present','absent','excused','late')",
            name="ck_attendance_status",
        ),
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
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    registration_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("registrations.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="present", nullable=False, index=True
    )
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    method: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow,
        server_default=func.now(), nullable=False
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "event_id": str(self.event_id),
            "user_id": str(self.user_id),
            "registration_id": str(self.registration_id) if self.registration_id else None,
            "status": self.status,
            "check_in_at": self.check_in_at.isoformat() if self.check_in_at else None,
            "check_out_at": self.check_out_at.isoformat() if self.check_out_at else None,
            "method": self.method,
            "recorded_by": str(self.recorded_by) if self.recorded_by else None,
        }


class AttendanceLog(db.Model):
    """Append-only log of attendance actions for audit."""

    __tablename__ = "attendance_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    attendance_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("attendance.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    method: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )


class QrToken(db.Model):
    """Single-use QR token for event check-in."""

    __tablename__ = "qr_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="uq_qr_token"),
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
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "event_id": str(self.event_id),
            "user_id": str(self.user_id) if self.user_id else None,
            "token": self.token,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used": self.used,
        }


__all__ = ["Attendance", "AttendanceLog", "QrToken"]
