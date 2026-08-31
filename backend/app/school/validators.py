"""Pydantic request validators for college-structure entities."""

from __future__ import annotations

import datetime as _dt

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _Base(BaseModel):
    """Shared config for structure payloads."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


# --------------------------------------------------------------------------
# Departments
# --------------------------------------------------------------------------
class DepartmentCreateRequest(_Base):
    """Payload for creating a department."""

    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=1, max_length=20)
    description: str | None = Field(default=None, max_length=4000)
    head_id: str | None = None


class DepartmentUpdateRequest(_Base):
    """Payload for updating a department."""

    name: str | None = Field(default=None, min_length=2, max_length=120)
    code: str | None = Field(default=None, min_length=1, max_length=20)
    description: str | None = Field(default=None, max_length=4000)
    head_id: str | None = None


# --------------------------------------------------------------------------
# Courses
# --------------------------------------------------------------------------
class CourseCreateRequest(_Base):
    """Payload for creating a course."""

    department_id: str
    name: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=1, max_length=20)


class CourseUpdateRequest(_Base):
    """Payload for updating a course."""

    department_id: str | None = None
    name: str | None = Field(default=None, min_length=2, max_length=150)
    code: str | None = Field(default=None, min_length=1, max_length=20)


# --------------------------------------------------------------------------
# Sections
# --------------------------------------------------------------------------
class SectionCreateRequest(_Base):
    """Payload for creating a section."""

    course_id: str
    semester_id: str
    name: str = Field(min_length=1, max_length=20)


class SectionUpdateRequest(_Base):
    """Payload for updating a section."""

    course_id: str | None = None
    semester_id: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=20)


# --------------------------------------------------------------------------
# Organizations
# --------------------------------------------------------------------------
class OrganizationCreateRequest(_Base):
    """Payload for creating an organization."""

    name: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=4000)
    category: str | None = Field(default=None, max_length=50)
    organization_type: str = Field(default="college_wide", max_length=40)
    department_id: str | None = None
    adviser_id: str | None = None
    positions: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_positions(self):
        if self.organization_type in {"student_council", "department_student_leaders"}:
            if not [position for position in self.positions if position.strip()]:
                raise ValueError("Council roles or positions are required.")
        return self


class OrganizationUpdateRequest(_Base):
    """Payload for updating an organization."""

    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=4000)
    category: str | None = Field(default=None, max_length=50)
    organization_type: str | None = Field(default=None, max_length=40)
    department_id: str | None = None
    adviser_id: str | None = None
    positions: list[str] | None = None


class CouncilMemberRequest(_Base):
    """One council membership row."""

    user_id: str
    position: str = Field(min_length=1, max_length=100)


class CouncilMembersUpdateRequest(_Base):
    """Replace council members for an organization."""

    members: list[CouncilMemberRequest] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Academic Years
# --------------------------------------------------------------------------
class AcademicYearCreateRequest(_Base):
    """Payload for creating an academic year."""

    name: str = Field(min_length=4, max_length=20)
    start_date: _dt.date
    end_date: _dt.date
    is_current: bool = False

    @model_validator(mode="after")
    def _check_dates(self) -> "AcademicYearCreateRequest":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date.")
        return self


class AcademicYearUpdateRequest(_Base):
    """Payload for updating an academic year."""

    name: str | None = Field(default=None, min_length=4, max_length=20)
    start_date: _dt.date | None = None
    end_date: _dt.date | None = None
    is_current: bool | None = None

    @model_validator(mode="after")
    def _check_dates(self) -> "AcademicYearUpdateRequest":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date <= self.start_date
        ):
            raise ValueError("end_date must be after start_date.")
        return self


# --------------------------------------------------------------------------
# Semesters
# --------------------------------------------------------------------------
class SemesterCreateRequest(_Base):
    """Payload for creating a semester."""

    academic_year_id: str
    name: str = Field(min_length=1, max_length=40)
    start_date: _dt.date
    end_date: _dt.date

    @model_validator(mode="after")
    def _check_dates(self) -> "SemesterCreateRequest":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date.")
        return self


class SemesterUpdateRequest(_Base):
    """Payload for updating a semester."""

    academic_year_id: str | None = None
    name: str | None = Field(default=None, min_length=1, max_length=40)
    start_date: _dt.date | None = None
    end_date: _dt.date | None = None

    @model_validator(mode="after")
    def _check_dates(self) -> "SemesterUpdateRequest":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date <= self.start_date
        ):
            raise ValueError("end_date must be after start_date.")
        return self
