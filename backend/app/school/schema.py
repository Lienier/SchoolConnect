"""Serialization helpers for college-structure entities."""

from __future__ import annotations

from app.users.model import (
    AcademicYear,
    Course,
    Department,
    Organization,
    Section,
    Semester,
)


def _iso(value) -> str | None:
    """Return an ISO-formatted date/datetime string or ``None``."""
    return value.isoformat() if value is not None else None


def department_to_dict(d: Department) -> dict:
    """Serialize a department."""
    return {
        "id": str(d.id),
        "name": d.name,
        "code": d.code,
        "description": d.description,
        "head_id": str(d.head_id) if d.head_id else None,
        "created_at": _iso(d.created_at),
        "updated_at": _iso(d.updated_at),
    }


def course_to_dict(c: Course) -> dict:
    """Serialize a course."""
    return {
        "id": str(c.id),
        "department_id": str(c.department_id),
        "name": c.name,
        "code": c.code,
        "created_at": _iso(c.created_at),
    }


def section_to_dict(s: Section) -> dict:
    """Serialize a section."""
    return {
        "id": str(s.id),
        "course_id": str(s.course_id),
        "semester_id": str(s.semester_id),
        "name": s.name,
        "created_at": _iso(s.created_at),
    }


def organization_to_dict(o: Organization) -> dict:
    """Serialize an organization."""
    return {
        "id": str(o.id),
        "name": o.name,
        "description": o.description,
        "category": o.category,
        "organization_type": o.organization_type,
        "positions": [position.name for position in getattr(o, "positions", [])],
        "department_id": str(o.department_id) if o.department_id else None,
        "adviser_id": str(o.adviser_id) if o.adviser_id else None,
        "created_at": _iso(o.created_at),
        "updated_at": _iso(o.updated_at),
    }


def academic_year_to_dict(y: AcademicYear) -> dict:
    """Serialize an academic year."""
    return {
        "id": str(y.id),
        "name": y.name,
        "start_date": _iso(y.start_date),
        "end_date": _iso(y.end_date),
        "is_current": y.is_current,
        "created_at": _iso(y.created_at),
    }


def semester_to_dict(s: Semester) -> dict:
    """Serialize a semester."""
    return {
        "id": str(s.id),
        "academic_year_id": str(s.academic_year_id),
        "name": s.name,
        "start_date": _iso(s.start_date),
        "end_date": _iso(s.end_date),
        "created_at": _iso(s.created_at),
    }
