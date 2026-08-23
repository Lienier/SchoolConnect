"""SQLAlchemy models for the audit module.

Append-only records for security and compliance: audit logs (data changes),
login history (authentication events), and activity logs (user actions).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.utils.datetime import utcnow

JSONB_TYPE = JSONB().with_variant(db.JSON(), "sqlite")


class AuditLog(db.Model):
    """A record of a create/update/delete action on a critical entity."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    changes: Mapped[dict | None] = mapped_column(JSONB_TYPE, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True
    )
    actor = relationship("User", foreign_keys=[actor_id], lazy="joined")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "actor_id": str(self.actor_id) if self.actor_id else None,
            "actor_name": getattr(self.actor, "full_name", None),
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": str(self.entity_id) if self.entity_id else None,
            "changes": self.changes,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LoginHistory(db.Model):
    """A record of an authentication attempt (success or failure)."""

    __tablename__ = "login_history"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    method: Mapped[str] = mapped_column(String(20), default="password", nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id) if self.user_id else None,
            "email": self.email,
            "success": self.success,
            "method": self.method,
            "ip_address": self.ip_address,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(db.Model):
    """A record of a user activity for the activity history feed."""

    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "action": self.action,
            "description": self.description,
            "entity_type": self.entity_type,
            "entity_id": str(self.entity_id) if self.entity_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


__all__ = ["AuditLog", "LoginHistory", "ActivityLog"]
