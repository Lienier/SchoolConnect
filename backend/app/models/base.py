"""Declarative base model and reusable mixins.

Every persistent entity in SchoolConnect inherits from :class:`BaseModel`,
guaranteeing a UUID primary key, created/updated timestamps, audit columns and
soft-delete support as mandated by the project's database rules.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db
from app.utils.datetime import utcnow as _utcnow


class UUIDMixin:
    """Adds a UUID primary key column."""

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )


class TimestampMixin:
    """Adds ``created_at`` and ``updated_at`` columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        server_default=func.now(),
        nullable=False,
    )


class AuditMixin:
    """Adds ``created_by`` and ``updated_by`` audit columns.

    Values reference the acting user's UUID. They are nullable to support
    system-generated records where no user is responsible.
    """

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )


class SoftDeleteMixin:
    """Adds a ``deleted_at`` column enabling non-destructive deletion."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    @property
    def is_deleted(self) -> bool:
        """Return whether the record has been soft-deleted."""
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        """Mark the record as deleted without removing it from the database."""
        self.deleted_at = _utcnow()

    def restore(self) -> None:
        """Reverse a previous soft delete."""
        self.deleted_at = None


class BaseModel(UUIDMixin, TimestampMixin, AuditMixin, SoftDeleteMixin, db.Model):
    """Abstract base for all application models."""

    __abstract__ = True

    def to_dict(self) -> dict:
        """Return a plain dict of column values (UUIDs/datetimes stringified)."""
        result: dict = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, (uuid.UUID, datetime)):
                value = str(value)
            result[column.name] = value
        return result
