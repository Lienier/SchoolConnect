"""Shared repository base classes.

Provides :class:`BaseRepository` implementing common soft-delete-aware CRUD
operations that feature repositories extend.
"""

from app.repositories.base import BaseRepository

__all__ = ["BaseRepository"]
