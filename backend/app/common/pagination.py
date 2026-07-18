"""Reusable server-side pagination utilities.

Repositories return SQLAlchemy queries; the ``paginate`` helper applies
consistent, bounded pagination and returns metadata suitable for the response
envelope's ``meta`` field.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from flask import request
from sqlalchemy import Select
from sqlalchemy.orm import Query

from app.extensions import db

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


@dataclass(frozen=True)
class PaginationParams:
    """Normalized pagination parameters parsed from the request."""

    page: int
    page_size: int

    @property
    def offset(self) -> int:
        """Zero-based row offset for the current page."""
        return (self.page - 1) * self.page_size

    @classmethod
    def from_request(cls) -> "PaginationParams":
        """Parse and clamp pagination parameters from the query string."""
        try:
            page = max(int(request.args.get("page", DEFAULT_PAGE)), 1)
        except (TypeError, ValueError):
            page = DEFAULT_PAGE
        try:
            page_size = int(request.args.get("page_size", DEFAULT_PAGE_SIZE))
        except (TypeError, ValueError):
            page_size = DEFAULT_PAGE_SIZE
        page_size = max(1, min(page_size, MAX_PAGE_SIZE))
        return cls(page=page, page_size=page_size)


def paginate(query: Select | Query, params: PaginationParams) -> tuple[list[Any], dict[str, int]]:
    """Apply pagination to a query and return items plus pagination metadata.

    Args:
        query: A SQLAlchemy 2.0 ``Select`` or legacy ``Query``.
        params: Normalized pagination parameters.

    Returns:
        A tuple of ``(items, meta)`` where ``meta`` includes total count and
        page information.
    """
    if isinstance(query, Select):
        total = db.session.scalar(
            db.select(db.func.count()).select_from(query.subquery())
        ) or 0
        items = list(
            db.session.scalars(
                query.limit(params.page_size).offset(params.offset)
            ).all()
        )
    else:  # Legacy Query API
        total = query.order_by(None).count()
        items = query.limit(params.page_size).offset(params.offset).all()

    total_pages = (total + params.page_size - 1) // params.page_size if total else 0
    meta = {
        "page": params.page,
        "page_size": params.page_size,
        "total_items": total,
        "total_pages": total_pages,
    }
    return items, meta
