"""Reusable search, sorting and filtering utilities for list endpoints.

These helpers operate on SQLAlchemy 2.0 ``Select`` statements and are designed
to be composed together with :func:`app.common.pagination.paginate`. Each
module declares which columns are searchable / sortable / filterable and passes
them in; the request query string is parsed here so routes stay thin.

Typical usage inside a repository or service::

    stmt = select(Department)
    stmt = apply_search(stmt, request.args.get("search"),
                        [Department.name, Department.code])
    stmt = apply_filters(stmt, {"code": Department.code}, request.args)
    stmt = apply_sort(stmt, request.args.get("sort"),
                     {"name": Department.name, "created_at": Department.created_at},
                     default=Department.created_at)
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Mapping

from sqlalchemy import Select, or_
from sqlalchemy.orm import InstrumentedAttribute


def apply_search(
    stmt: Select,
    term: str | None,
    columns: list[InstrumentedAttribute],
) -> Select:
    """Apply a case-insensitive partial-match search across ``columns``.

    Args:
        stmt: The base ``Select`` statement.
        term: The raw search term from the request (may be ``None``/empty).
        columns: Model columns to match the term against with ``ILIKE``.

    Returns:
        The statement with an ``OR`` group of ``ILIKE`` clauses applied, or the
        original statement when ``term`` is blank or no columns are given.
    """
    if not term or not term.strip() or not columns:
        return stmt
    pattern = f"%{term.strip()}%"
    clauses = [column.ilike(pattern) for column in columns]
    return stmt.where(or_(*clauses))


def apply_filters(
    stmt: Select,
    allowed: Mapping[str, InstrumentedAttribute],
    args: Mapping[str, Any],
) -> Select:
    """Apply equality filters for any allowed field present in the request.

    Only keys listed in ``allowed`` are honoured, preventing arbitrary column
    filtering. Blank values are ignored. ``created_from`` / ``created_to`` and
    ``*_from`` / ``*_to`` conventions are handled as inclusive date ranges when
    the corresponding base field is allowed.

    Args:
        stmt: The base ``Select`` statement.
        allowed: Mapping of public filter name -> model column.
        args: The request args (``request.args`` or a plain dict).

    Returns:
        The statement with matching filters applied.
    """
    for name, column in allowed.items():
        value = args.get(name)
        if value not in (None, ""):
            stmt = stmt.where(column == value)

        start = args.get(f"{name}_from")
        if start not in (None, ""):
            parsed = _coerce_date(start)
            if parsed is not None:
                stmt = stmt.where(column >= parsed)

        end = args.get(f"{name}_to")
        if end not in (None, ""):
            parsed = _coerce_date(end)
            if parsed is not None:
                stmt = stmt.where(column <= parsed)

    return stmt


def apply_sort(
    stmt: Select,
    sort: str | None,
    allowed: Mapping[str, InstrumentedAttribute],
    default: InstrumentedAttribute,
    default_desc: bool = True,
) -> Select:
    """Apply ordering based on a ``sort`` query parameter.

    The ``sort`` parameter accepts ``field`` (ascending) or ``-field``
    (descending). Only fields present in ``allowed`` are honoured; unknown
    fields fall back to ``default``.

    Args:
        stmt: The base ``Select`` statement.
        sort: The raw sort parameter (e.g. ``"-created_at"``).
        allowed: Mapping of public sort name -> model column.
        default: Column to sort by when no valid sort is supplied.
        default_desc: Whether the default ordering is descending.

    Returns:
        The statement with an ``ORDER BY`` clause applied.
    """
    if sort and sort.strip():
        raw = sort.strip()
        descending = raw.startswith("-")
        key = raw[1:] if descending else raw
        column = allowed.get(key)
        if column is not None:
            return stmt.order_by(column.desc() if descending else column.asc())
    return stmt.order_by(default.desc() if default_desc else default.asc())


def _coerce_date(value: Any) -> date | datetime | None:
    """Best-effort parse of an ISO date/datetime string; ``None`` on failure."""
    if isinstance(value, (date, datetime)):
        return value
    if not isinstance(value, str):
        return None
    text = value.strip()
    for parser in (datetime.fromisoformat, _parse_iso_date):
        try:
            return parser(text)
        except (ValueError, TypeError):
            continue
    return None


def _parse_iso_date(text: str) -> date:
    """Parse a plain ``YYYY-MM-DD`` string into a ``date``."""
    return datetime.strptime(text, "%Y-%m-%d").date()
