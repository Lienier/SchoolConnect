"""Generic soft-delete-aware repository base class.

Repositories are the only layer permitted to touch the database session for
their aggregate. Services depend on repositories (dependency inversion),
keeping persistence concerns isolated and testable.
"""

from __future__ import annotations

import uuid
from typing import Generic, Sequence, TypeVar

from sqlalchemy import select

from app.extensions import db
from app.models.base import BaseModel

ModelT = TypeVar("ModelT", bound=BaseModel)


class BaseRepository(Generic[ModelT]):
    """Reusable CRUD operations honouring soft deletion.

    Args:
        model: The SQLAlchemy model class this repository manages.
    """

    def __init__(self, model: type[ModelT]) -> None:
        self.model = model

    def _base_query(self, include_deleted: bool = False):
        """Return a base select excluding soft-deleted rows by default."""
        stmt = select(self.model)
        if not include_deleted:
            stmt = stmt.where(self.model.deleted_at.is_(None))
        return stmt

    def get_by_id(
        self, entity_id: uuid.UUID, include_deleted: bool = False
    ) -> ModelT | None:
        """Return an entity by primary key or ``None`` if not found."""
        stmt = self._base_query(include_deleted).where(self.model.id == entity_id)
        return db.session.scalar(stmt)

    def list_all(self, include_deleted: bool = False) -> Sequence[ModelT]:
        """Return all (non-deleted) entities."""
        return db.session.scalars(self._base_query(include_deleted)).all()

    def add(self, entity: ModelT) -> ModelT:
        """Stage a new entity for persistence."""
        db.session.add(entity)
        return entity

    def soft_delete(self, entity: ModelT) -> None:
        """Soft-delete an entity."""
        entity.soft_delete()

    def commit(self) -> None:
        """Commit the current unit of work."""
        db.session.commit()

    def flush(self) -> None:
        """Flush pending changes without committing."""
        db.session.flush()
