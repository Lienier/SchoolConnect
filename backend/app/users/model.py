"""SQLAlchemy models for the users module.

Includes user profile sub-types (student, teacher, administrator, officer)
sharing the primary key with ``users`` (strict 1:1), plus college-structure
entities: departments, courses, sections, organizations, academic years and
semesters.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Date,
    ForeignKey,
    String,
    Boolean,
    Integer,
    SmallInteger,
    Text,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db
from app.utils.datetime import utcnow as _utcnow


# --------------------------------------------------------------------------
# Profiles (1:1 with users, id == users.id)
# --------------------------------------------------------------------------
class StudentProfile(db.Model):
    """Profile for student users."""

    __tablename__ = "student_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    student_number: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True, index=True
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True, index=True
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("sections.id"), nullable=True
    )
    year_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    birth_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        CheckConstraint("year_level IS NULL OR year_level > 0", name="ck_student_year_level"),
    )


class TeacherProfile(db.Model):
    """Profile for teacher users."""

    __tablename__ = "teacher_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    employee_number: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True, index=True
    )
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hire_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)


class AdministratorProfile(db.Model):
    """Profile for administrator users."""

    __tablename__ = "administrator_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    employee_number: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)


class OfficerProfile(db.Model):
    """Profile for student council officer users."""

    __tablename__ = "officer_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True
    )
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    term_start: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    term_end: Mapped[datetime | None] = mapped_column(Date, nullable=True)


# --------------------------------------------------------------------------
# College structure
# --------------------------------------------------------------------------
class Department(db.Model):
    """Academic department."""

    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    head_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow,
        server_default=func.now(), nullable=False
    )


class Course(db.Model):
    """Course offered by a department."""

    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("department_id", "code", name="uq_courses_department_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )


class Section(db.Model):
    """Section of a course within a semester."""

    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint(
            "course_id", "semester_id", "name", name="uq_sections_course_semester_name"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False, index=True
    )
    semester_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("semesters.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )


class Organization(db.Model):
    """Club, committee or team."""

    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    adviser_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow,
        server_default=func.now(), nullable=False
    )


class AcademicYear(db.Model):
    """Academic year (e.g. 2025-2026)."""

    __tablename__ = "academic_years"
    __table_args__ = (UniqueConstraint("name", name="uq_academic_years_name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(20), nullable=False)
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", name="uq_academic_years_name"),
        CheckConstraint("end_date > start_date", name="ck_academic_year_dates"),
    )


class Semester(db.Model):
    """Semester within an academic year."""

    __tablename__ = "semesters"
    __table_args__ = (
        UniqueConstraint("academic_year_id", "name", name="uq_semesters_year_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )


__all__ = [
    "StudentProfile",
    "TeacherProfile",
    "AdministratorProfile",
    "OfficerProfile",
    "Department",
    "Course",
    "Section",
    "Organization",
    "AcademicYear",
    "Semester",
]
