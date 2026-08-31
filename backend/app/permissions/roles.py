"""System role definitions for RBAC.

These are the default seed roles. The permission-based design means new
roles can be created at runtime; this enum documents the canonical seed names
used throughout the application and seed data.
"""

from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    """The default seed roles supported by SchoolConnect."""

    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT_COUNCIL = "student_council"
    DEPARTMENT_STUDENT_LEADER = "department_student_leader"
    STUDENT = "student"

    @classmethod
    def values(cls) -> list[str]:
        """Return all role string values."""
        return [role.value for role in cls]
