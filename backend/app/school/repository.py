"""Data-access layer for school-structure entities.

A single generic repository handles all structural models since they share the
same simple lifecycle (create, read, update, delete by id).
"""

from __future__ import annotations

import uuid
from typing import Generic, TypeVar

from sqlalchemy import Select, select

from app.extensions import db

_T = TypeVar("_T")


class StructureRepository(Generic[_T]):
    """Generic CRUD persistence for a school-structure model."""

    def __init__(self, model: type[_T]) -> None:
        self._model = model

    def get_by_id(self, entity_id: uuid.UUID) -> _T | None:
        """Return an entity by primary key."""
        return db.session.get(self._model, entity_id)

    def list_query(self) -> Select:
        """Return a ``Select`` over all rows for pagination/search/sort."""
        return select(self._model)

    def add(self, entity: _T) -> _T:
        """Persist a new entity and flush to populate its id."""
        db.session.add(entity)
        db.session.flush()
        return entity

    def delete(self, entity: _T) -> None:
        """Delete an entity."""
        db.session.delete(entity)
        db.session.flush()

    def exists_where(self, *conditions) -> bool:
        """Return whether any row matches the given conditions."""
        stmt = select(self._model.id).where(*conditions).limit(1)  # type: ignore[attr-defined]
        return db.session.scalar(stmt) is not None
