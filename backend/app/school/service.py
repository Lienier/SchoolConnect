"""Business logic for the college-structure module.

Each entity type gets create/get/update/delete operations with referential and
uniqueness validation. Delete operations guard against orphaning dependent rows
(e.g. a department with courses cannot be removed).
"""

from __future__ import annotations

import uuid

from sqlalchemy import Select, func, select

from app.common.exceptions import ConflictError, NotFoundError, ValidationError
from app.extensions import db
from app.school.repository import StructureRepository
from app.users.model import (
    AcademicYear,
    Course,
    Department,
    Organization,
    Section,
    Semester,
)


def _as_uuid(value: str | None) -> uuid.UUID | None:
    """Parse an optional UUID string, raising ``ValidationError`` on bad input."""
    if value in (None, ""):
        return None
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError) as exc:
        raise ValidationError("Invalid identifier format.") from exc


def _normalize_organization_type(value: str | None) -> str:
    organization_type = (value or "college_wide").strip()
    allowed = {
        "college_wide",
        "student_council",
        "department_organization",
        "department_student_leaders",
    }
    if organization_type not in allowed:
        raise ValidationError("Invalid organization type.")
    return organization_type


class SchoolStructureService:
    """Coordinates CRUD across the college-structure entities."""

    def __init__(self) -> None:
        self.departments = StructureRepository(Department)
        self.courses = StructureRepository(Course)
        self.sections = StructureRepository(Section)
        self.organizations = StructureRepository(Organization)
        self.academic_years = StructureRepository(AcademicYear)
        self.semesters = StructureRepository(Semester)

    # ---- generic helpers -------------------------------------------------
    @staticmethod
    def _require(entity, label: str):
        if entity is None:
            raise NotFoundError(f"{label} not found.")
        return entity

    # ---- Departments -----------------------------------------------------
    def list_departments_query(self) -> Select:
        return self.departments.list_query()

    def get_department(self, dept_id: uuid.UUID) -> Department:
        return self._require(self.departments.get_by_id(dept_id), "Department")

    def create_department(self, *, name, code, description, head_id) -> Department:
        if self.departments.exists_where(Department.code == code):
            raise ConflictError(f"A department with code '{code}' already exists.")
        dept = Department(
            name=name, code=code, description=description, head_id=_as_uuid(head_id)
        )
        self.departments.add(dept)
        db.session.commit()
        return dept

    def update_department(self, dept_id, *, name=None, code=None, description=None, head_id=...) -> Department:
        dept = self.get_department(dept_id)
        if code is not None and code != dept.code and self.departments.exists_where(Department.code == code):
            raise ConflictError(f"A department with code '{code}' already exists.")
        if name is not None:
            dept.name = name
        if code is not None:
            dept.code = code
        if description is not None:
            dept.description = description
        if head_id is not ...:
            dept.head_id = _as_uuid(head_id)
        db.session.commit()
        return dept

    def delete_department(self, dept_id) -> None:
        dept = self.get_department(dept_id)
        if self.courses.exists_where(Course.department_id == dept.id):
            raise ConflictError("Cannot delete a department that has courses.")
        self.departments.delete(dept)
        db.session.commit()

    # ---- Courses ---------------------------------------------------------
    def list_courses_query(self) -> Select:
        return self.courses.list_query()

    def get_course(self, course_id: uuid.UUID) -> Course:
        return self._require(self.courses.get_by_id(course_id), "Course")

    def create_course(self, *, department_id, name, code) -> Course:
        dept_id = _as_uuid(department_id)
        self.get_department(dept_id)
        if self.courses.exists_where(Course.department_id == dept_id, Course.code == code):
            raise ConflictError("A course with this code already exists in the department.")
        course = Course(department_id=dept_id, name=name, code=code)
        self.courses.add(course)
        db.session.commit()
        return course

    def update_course(self, course_id, *, department_id=None, name=None, code=None) -> Course:
        course = self.get_course(course_id)
        if department_id is not None:
            dept_id = _as_uuid(department_id)
            self.get_department(dept_id)
            course.department_id = dept_id
        if name is not None:
            course.name = name
        if code is not None:
            course.code = code
        if self.courses.exists_where(
            Course.department_id == course.department_id,
            Course.code == course.code,
            Course.id != course.id,
        ):
            raise ConflictError("A course with this code already exists in the department.")
        db.session.commit()
        return course

    def delete_course(self, course_id) -> None:
        course = self.get_course(course_id)
        if self.sections.exists_where(Section.course_id == course.id):
            raise ConflictError("Cannot delete a course that has sections.")
        self.courses.delete(course)
        db.session.commit()

    # ---- Sections --------------------------------------------------------
    def list_sections_query(self) -> Select:
        return self.sections.list_query()

    def get_section(self, section_id: uuid.UUID) -> Section:
        return self._require(self.sections.get_by_id(section_id), "Section")

    def create_section(self, *, course_id, semester_id, name) -> Section:
        c_id = _as_uuid(course_id)
        s_id = _as_uuid(semester_id)
        self.get_course(c_id)
        self.get_semester(s_id)
        if self.sections.exists_where(
            Section.course_id == c_id, Section.semester_id == s_id, Section.name == name
        ):
            raise ConflictError("A section with this name already exists for the course/semester.")
        section = Section(course_id=c_id, semester_id=s_id, name=name)
        self.sections.add(section)
        db.session.commit()
        return section

    def update_section(self, section_id, *, course_id=None, semester_id=None, name=None) -> Section:
        section = self.get_section(section_id)
        if course_id is not None:
            c_id = _as_uuid(course_id)
            self.get_course(c_id)
            section.course_id = c_id
        if semester_id is not None:
            s_id = _as_uuid(semester_id)
            self.get_semester(s_id)
            section.semester_id = s_id
        if name is not None:
            section.name = name
        if self.sections.exists_where(
            Section.course_id == section.course_id,
            Section.semester_id == section.semester_id,
            Section.name == section.name,
            Section.id != section.id,
        ):
            raise ConflictError("A section with this name already exists for the course/semester.")
        db.session.commit()
        return section

    def delete_section(self, section_id) -> None:
        section = self.get_section(section_id)
        self.sections.delete(section)
        db.session.commit()

    # ---- Organizations ---------------------------------------------------
    def list_organizations_query(self) -> Select:
        return self.organizations.list_query()

    def get_organization(self, org_id: uuid.UUID) -> Organization:
        return self._require(self.organizations.get_by_id(org_id), "Organization")

    def create_organization(
        self, *, name, description, category, organization_type, department_id, adviser_id
    ) -> Organization:
        org_type = _normalize_organization_type(organization_type)
        dept_id = self._validate_organization_department(org_type, department_id)
        self._ensure_department_organization_slot(dept_id, org_type)
        self._ensure_student_council_slot(org_type)
        org = Organization(
            name=name, description=description, category=category,
            organization_type=org_type, department_id=dept_id, adviser_id=_as_uuid(adviser_id),
        )
        self.organizations.add(org)
        db.session.commit()
        return org

    def update_organization(
        self, org_id, *, name=None, description=None, category=None,
        organization_type=None, department_id=..., adviser_id=...,
    ) -> Organization:
        org = self.get_organization(org_id)
        next_type = _normalize_organization_type(organization_type or org.organization_type)
        next_dept_id = org.department_id
        if department_id is not ...:
            next_dept_id = self._validate_organization_department(next_type, department_id)
        elif organization_type is not None:
            next_dept_id = self._validate_organization_department(next_type, org.department_id)
        if (
            (next_type != org.organization_type or next_dept_id != org.department_id)
            and (next_dept_id is not None or next_type == "student_council")
        ):
            self._ensure_department_organization_slot(next_dept_id, next_type, exclude_id=org.id)
            self._ensure_student_council_slot(next_type, exclude_id=org.id)
        if name is not None:
            org.name = name
        if description is not None:
            org.description = description
        if category is not None:
            org.category = category
        if organization_type is not None:
            org.organization_type = next_type
        if department_id is not ...:
            org.department_id = next_dept_id
        if adviser_id is not ...:
            org.adviser_id = _as_uuid(adviser_id)
        db.session.commit()
        return org

    def delete_organization(self, org_id) -> None:
        org = self.get_organization(org_id)
        self.organizations.delete(org)
        db.session.commit()

    def _validate_organization_department(
        self, organization_type: str, department_id
    ) -> uuid.UUID | None:
        dept_id = _as_uuid(str(department_id) if department_id is not None else None)
        if organization_type in {"college_wide", "student_council"}:
            return None
        if dept_id is None:
            raise ValidationError("Department is required for department organizations and department student leaders.")
        self.get_department(dept_id)
        return dept_id

    def _ensure_department_organization_slot(
        self, department_id: uuid.UUID | None, organization_type: str,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        if department_id is None or organization_type in {"college_wide", "student_council"}:
            return
        filters = [
            Organization.department_id == department_id,
            Organization.organization_type == organization_type,
        ]
        if exclude_id is not None:
            filters.append(Organization.id != exclude_id)
        if self.organizations.exists_where(*filters):
            label = "student leaders" if organization_type == "department_student_leaders" else "organization"
            raise ConflictError(f"This department already has department {label}.")

    def _ensure_student_council_slot(
        self, organization_type: str, exclude_id: uuid.UUID | None = None
    ) -> None:
        if organization_type != "student_council":
            return
        filters = [Organization.organization_type == "student_council"]
        if exclude_id is not None:
            filters.append(Organization.id != exclude_id)
        if self.organizations.exists_where(*filters):
            raise ConflictError("The college-wide Student Council organization already exists.")

    # ---- Academic Years --------------------------------------------------
    def list_academic_years_query(self) -> Select:
        return self.academic_years.list_query()

    def get_academic_year(self, year_id: uuid.UUID) -> AcademicYear:
        return self._require(self.academic_years.get_by_id(year_id), "Academic year")

    def create_academic_year(self, *, name, start_date, end_date, is_current) -> AcademicYear:
        if self.academic_years.exists_where(AcademicYear.name == name):
            raise ConflictError(f"Academic year '{name}' already exists.")
        year = AcademicYear(
            name=name, start_date=start_date, end_date=end_date, is_current=is_current
        )
        self.academic_years.add(year)
        if is_current:
            self._clear_current_years(year.id)
        db.session.commit()
        return year

    def update_academic_year(self, year_id, *, name=None, start_date=None, end_date=None, is_current=None) -> AcademicYear:
        year = self.get_academic_year(year_id)
        if name is not None and name != year.name and self.academic_years.exists_where(AcademicYear.name == name):
            raise ConflictError(f"Academic year '{name}' already exists.")
        if name is not None:
            year.name = name
        if start_date is not None:
            year.start_date = start_date
        if end_date is not None:
            year.end_date = end_date
        if year.end_date <= year.start_date:
            raise ValidationError("end_date must be after start_date.")
        if is_current is not None:
            year.is_current = is_current
            if is_current:
                self._clear_current_years(year.id)
        db.session.commit()
        return year

    def delete_academic_year(self, year_id) -> None:
        year = self.get_academic_year(year_id)
        if self.semesters.exists_where(Semester.academic_year_id == year.id):
            raise ConflictError("Cannot delete an academic year that has semesters.")
        self.academic_years.delete(year)
        db.session.commit()

    def _clear_current_years(self, keep_id: uuid.UUID) -> None:
        """Ensure only the given academic year is marked current."""
        others = db.session.scalars(
            select(AcademicYear).where(
                AcademicYear.is_current.is_(True), AcademicYear.id != keep_id
            )
        ).all()
        for other in others:
            other.is_current = False

    # ---- Semesters -------------------------------------------------------
    def list_semesters_query(self) -> Select:
        return self.semesters.list_query()

    def get_semester(self, semester_id: uuid.UUID) -> Semester:
        return self._require(self.semesters.get_by_id(semester_id), "Semester")

    def create_semester(self, *, academic_year_id, name, start_date, end_date) -> Semester:
        y_id = _as_uuid(academic_year_id)
        self.get_academic_year(y_id)
        if self.semesters.exists_where(
            Semester.academic_year_id == y_id, Semester.name == name
        ):
            raise ConflictError("A semester with this name already exists for the academic year.")
        semester = Semester(
            academic_year_id=y_id, name=name, start_date=start_date, end_date=end_date
        )
        self.semesters.add(semester)
        db.session.commit()
        return semester

    def update_semester(self, semester_id, *, academic_year_id=None, name=None, start_date=None, end_date=None) -> Semester:
        semester = self.get_semester(semester_id)
        if academic_year_id is not None:
            y_id = _as_uuid(academic_year_id)
            self.get_academic_year(y_id)
            semester.academic_year_id = y_id
        if name is not None:
            semester.name = name
        if start_date is not None:
            semester.start_date = start_date
        if end_date is not None:
            semester.end_date = end_date
        if semester.end_date <= semester.start_date:
            raise ValidationError("end_date must be after start_date.")
        if self.semesters.exists_where(
            Semester.academic_year_id == semester.academic_year_id,
            Semester.name == semester.name,
            Semester.id != semester.id,
        ):
            raise ConflictError("A semester with this name already exists for the academic year.")
        db.session.commit()
        return semester

    def delete_semester(self, semester_id) -> None:
        semester = self.get_semester(semester_id)
        if self.sections.exists_where(Section.semester_id == semester.id):
            raise ConflictError("Cannot delete a semester that has sections.")
        self.semesters.delete(semester)
        db.session.commit()
