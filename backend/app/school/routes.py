"""HTTP routes for the school-structure module.

Exposes CRUD for departments, courses, sections, organizations, academic years
and semesters. Read endpoints require the corresponding ``*.view`` permission;
mutations require ``*.manage``. All list endpoints support pagination, search,
filtering and sorting via the reusable query helpers.
"""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.query import apply_filters, apply_search, apply_sort
from app.common.responses import success_response
from app.permissions.decorators import require_permission
from app.school.schema import (
    academic_year_to_dict,
    course_to_dict,
    department_to_dict,
    organization_to_dict,
    section_to_dict,
    semester_to_dict,
)
from app.school.service import SchoolStructureService
from app.school.validators import (
    AcademicYearCreateRequest,
    AcademicYearUpdateRequest,
    CourseCreateRequest,
    CourseUpdateRequest,
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
    SectionCreateRequest,
    SectionUpdateRequest,
    SemesterCreateRequest,
    SemesterUpdateRequest,
)
from app.users.model import (
    AcademicYear,
    Course,
    Department,
    Organization,
    Section,
    Semester,
)

bp = Blueprint("school", __name__, url_prefix="/school")
_service = SchoolStructureService()


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


# --------------------------------------------------------------------------
# Departments
# --------------------------------------------------------------------------
@bp.get("/departments")
@jwt_required()
@require_permission("departments.view")
def list_departments():
    """List departments with pagination, search and sorting."""
    params = PaginationParams.from_request()
    stmt = _service.list_departments_query()
    stmt = apply_search(stmt, request.args.get("search"), [Department.name, Department.code])
    stmt = apply_sort(
        stmt, request.args.get("sort"),
        {"name": Department.name, "code": Department.code, "created_at": Department.created_at},
        default=Department.name, default_desc=False,
    )
    items, meta = paginate(stmt, params)
    return success_response(data=[department_to_dict(d) for d in items], meta=meta)


@bp.get("/departments/<dept_id>")
@jwt_required()
@require_permission("departments.view")
def get_department(dept_id: str):
    """Return a single department."""
    return success_response(data=department_to_dict(_service.get_department(uuid.UUID(dept_id))))


@bp.post("/departments")
@jwt_required()
@require_permission("departments.manage")
def create_department():
    """Create a department."""
    p = DepartmentCreateRequest(**_body())
    dept = _service.create_department(name=p.name, code=p.code, description=p.description, head_id=p.head_id)
    return success_response(data=department_to_dict(dept), message="Department created.", status_code=201)


@bp.patch("/departments/<dept_id>")
@jwt_required()
@require_permission("departments.manage")
def update_department(dept_id: str):
    """Update a department."""
    body = request.get_json(silent=True) or {}
    p = DepartmentUpdateRequest(**_body())
    dept = _service.update_department(
        uuid.UUID(dept_id), name=p.name, code=p.code, description=p.description,
        head_id=p.head_id if "head_id" in body else ...,
    )
    return success_response(data=department_to_dict(dept), message="Department updated.")


@bp.delete("/departments/<dept_id>")
@jwt_required()
@require_permission("departments.manage")
def delete_department(dept_id: str):
    """Delete a department."""
    _service.delete_department(uuid.UUID(dept_id))
    return success_response(message="Department deleted.")


# --------------------------------------------------------------------------
# Courses
# --------------------------------------------------------------------------
@bp.get("/courses")
@jwt_required()
@require_permission("courses.view")
def list_courses():
    """List courses with pagination, search, filter and sorting."""
    params = PaginationParams.from_request()
    stmt = _service.list_courses_query()
    stmt = apply_search(stmt, request.args.get("search"), [Course.name, Course.code])
    stmt = apply_filters(stmt, {"department_id": Course.department_id}, request.args)
    stmt = apply_sort(
        stmt, request.args.get("sort"),
        {"name": Course.name, "code": Course.code, "created_at": Course.created_at},
        default=Course.name, default_desc=False,
    )
    items, meta = paginate(stmt, params)
    return success_response(data=[course_to_dict(c) for c in items], meta=meta)


@bp.get("/courses/<course_id>")
@jwt_required()
@require_permission("courses.view")
def get_course(course_id: str):
    """Return a single course."""
    return success_response(data=course_to_dict(_service.get_course(uuid.UUID(course_id))))


@bp.post("/courses")
@jwt_required()
@require_permission("courses.manage")
def create_course():
    """Create a course."""
    p = CourseCreateRequest(**_body())
    course = _service.create_course(department_id=p.department_id, name=p.name, code=p.code)
    return success_response(data=course_to_dict(course), message="Course created.", status_code=201)


@bp.patch("/courses/<course_id>")
@jwt_required()
@require_permission("courses.manage")
def update_course(course_id: str):
    """Update a course."""
    p = CourseUpdateRequest(**_body())
    course = _service.update_course(uuid.UUID(course_id), department_id=p.department_id, name=p.name, code=p.code)
    return success_response(data=course_to_dict(course), message="Course updated.")


@bp.delete("/courses/<course_id>")
@jwt_required()
@require_permission("courses.manage")
def delete_course(course_id: str):
    """Delete a course."""
    _service.delete_course(uuid.UUID(course_id))
    return success_response(message="Course deleted.")


# --------------------------------------------------------------------------
# Sections
# --------------------------------------------------------------------------
@bp.get("/sections")
@jwt_required()
@require_permission("sections.view")
def list_sections():
    """List sections with pagination, filter and sorting."""
    params = PaginationParams.from_request()
    stmt = _service.list_sections_query()
    stmt = apply_search(stmt, request.args.get("search"), [Section.name])
    stmt = apply_filters(
        stmt, {"course_id": Section.course_id, "semester_id": Section.semester_id}, request.args
    )
    stmt = apply_sort(
        stmt, request.args.get("sort"),
        {"name": Section.name, "created_at": Section.created_at},
        default=Section.name, default_desc=False,
    )
    items, meta = paginate(stmt, params)
    return success_response(data=[section_to_dict(s) for s in items], meta=meta)


@bp.get("/sections/<section_id>")
@jwt_required()
@require_permission("sections.view")
def get_section(section_id: str):
    """Return a single section."""
    return success_response(data=section_to_dict(_service.get_section(uuid.UUID(section_id))))


@bp.post("/sections")
@jwt_required()
@require_permission("sections.manage")
def create_section():
    """Create a section."""
    p = SectionCreateRequest(**_body())
    section = _service.create_section(course_id=p.course_id, semester_id=p.semester_id, name=p.name)
    return success_response(data=section_to_dict(section), message="Section created.", status_code=201)


@bp.patch("/sections/<section_id>")
@jwt_required()
@require_permission("sections.manage")
def update_section(section_id: str):
    """Update a section."""
    p = SectionUpdateRequest(**_body())
    section = _service.update_section(uuid.UUID(section_id), course_id=p.course_id, semester_id=p.semester_id, name=p.name)
    return success_response(data=section_to_dict(section), message="Section updated.")


@bp.delete("/sections/<section_id>")
@jwt_required()
@require_permission("sections.manage")
def delete_section(section_id: str):
    """Delete a section."""
    _service.delete_section(uuid.UUID(section_id))
    return success_response(message="Section deleted.")


# --------------------------------------------------------------------------
# Organizations
# --------------------------------------------------------------------------
@bp.get("/organizations")
@jwt_required()
@require_permission("organizations.view")
def list_organizations():
    """List organizations with pagination, search, filter and sorting."""
    params = PaginationParams.from_request()
    stmt = _service.list_organizations_query()
    stmt = apply_search(stmt, request.args.get("search"), [Organization.name, Organization.category])
    stmt = apply_filters(stmt, {"category": Organization.category}, request.args)
    stmt = apply_sort(
        stmt, request.args.get("sort"),
        {"name": Organization.name, "created_at": Organization.created_at},
        default=Organization.name, default_desc=False,
    )
    items, meta = paginate(stmt, params)
    return success_response(data=[organization_to_dict(o) for o in items], meta=meta)


@bp.get("/organizations/<org_id>")
@jwt_required()
@require_permission("organizations.view")
def get_organization(org_id: str):
    """Return a single organization."""
    return success_response(data=organization_to_dict(_service.get_organization(uuid.UUID(org_id))))


@bp.post("/organizations")
@jwt_required()
@require_permission("organizations.manage")
def create_organization():
    """Create an organization."""
    p = OrganizationCreateRequest(**_body())
    org = _service.create_organization(name=p.name, description=p.description, category=p.category, adviser_id=p.adviser_id)
    return success_response(data=organization_to_dict(org), message="Organization created.", status_code=201)


@bp.patch("/organizations/<org_id>")
@jwt_required()
@require_permission("organizations.manage")
def update_organization(org_id: str):
    """Update an organization."""
    body = request.get_json(silent=True) or {}
    p = OrganizationUpdateRequest(**_body())
    org = _service.update_organization(
        uuid.UUID(org_id), name=p.name, description=p.description, category=p.category,
        adviser_id=p.adviser_id if "adviser_id" in body else ...,
    )
    return success_response(data=organization_to_dict(org), message="Organization updated.")


@bp.delete("/organizations/<org_id>")
@jwt_required()
@require_permission("organizations.manage")
def delete_organization(org_id: str):
    """Delete an organization."""
    _service.delete_organization(uuid.UUID(org_id))
    return success_response(message="Organization deleted.")


# --------------------------------------------------------------------------
# Academic Years
# --------------------------------------------------------------------------
@bp.get("/academic-years")
@jwt_required()
@require_permission("academic_years.view")
def list_academic_years():
    """List academic years with pagination, search and sorting."""
    params = PaginationParams.from_request()
    stmt = _service.list_academic_years_query()
    stmt = apply_search(stmt, request.args.get("search"), [AcademicYear.name])
    stmt = apply_sort(
        stmt, request.args.get("sort"),
        {"name": AcademicYear.name, "start_date": AcademicYear.start_date, "created_at": AcademicYear.created_at},
        default=AcademicYear.start_date,
    )
    items, meta = paginate(stmt, params)
    return success_response(data=[academic_year_to_dict(y) for y in items], meta=meta)


@bp.get("/academic-years/<year_id>")
@jwt_required()
@require_permission("academic_years.view")
def get_academic_year(year_id: str):
    """Return a single academic year."""
    return success_response(data=academic_year_to_dict(_service.get_academic_year(uuid.UUID(year_id))))


@bp.post("/academic-years")
@jwt_required()
@require_permission("academic_years.manage")
def create_academic_year():
    """Create an academic year."""
    p = AcademicYearCreateRequest(**_body())
    year = _service.create_academic_year(name=p.name, start_date=p.start_date, end_date=p.end_date, is_current=p.is_current)
    return success_response(data=academic_year_to_dict(year), message="Academic year created.", status_code=201)


@bp.patch("/academic-years/<year_id>")
@jwt_required()
@require_permission("academic_years.manage")
def update_academic_year(year_id: str):
    """Update an academic year."""
    p = AcademicYearUpdateRequest(**_body())
    year = _service.update_academic_year(
        uuid.UUID(year_id), name=p.name, start_date=p.start_date, end_date=p.end_date, is_current=p.is_current
    )
    return success_response(data=academic_year_to_dict(year), message="Academic year updated.")


@bp.delete("/academic-years/<year_id>")
@jwt_required()
@require_permission("academic_years.manage")
def delete_academic_year(year_id: str):
    """Delete an academic year."""
    _service.delete_academic_year(uuid.UUID(year_id))
    return success_response(message="Academic year deleted.")


# --------------------------------------------------------------------------
# Semesters
# --------------------------------------------------------------------------
@bp.get("/semesters")
@jwt_required()
@require_permission("semesters.view")
def list_semesters():
    """List semesters with pagination, filter and sorting."""
    params = PaginationParams.from_request()
    stmt = _service.list_semesters_query()
    stmt = apply_search(stmt, request.args.get("search"), [Semester.name])
    stmt = apply_filters(stmt, {"academic_year_id": Semester.academic_year_id}, request.args)
    stmt = apply_sort(
        stmt, request.args.get("sort"),
        {"name": Semester.name, "start_date": Semester.start_date, "created_at": Semester.created_at},
        default=Semester.start_date,
    )
    items, meta = paginate(stmt, params)
    return success_response(data=[semester_to_dict(s) for s in items], meta=meta)


@bp.get("/semesters/<semester_id>")
@jwt_required()
@require_permission("semesters.view")
def get_semester(semester_id: str):
    """Return a single semester."""
    return success_response(data=semester_to_dict(_service.get_semester(uuid.UUID(semester_id))))


@bp.post("/semesters")
@jwt_required()
@require_permission("semesters.manage")
def create_semester():
    """Create a semester."""
    p = SemesterCreateRequest(**_body())
    semester = _service.create_semester(academic_year_id=p.academic_year_id, name=p.name, start_date=p.start_date, end_date=p.end_date)
    return success_response(data=semester_to_dict(semester), message="Semester created.", status_code=201)


@bp.patch("/semesters/<semester_id>")
@jwt_required()
@require_permission("semesters.manage")
def update_semester(semester_id: str):
    """Update a semester."""
    p = SemesterUpdateRequest(**_body())
    semester = _service.update_semester(
        uuid.UUID(semester_id), academic_year_id=p.academic_year_id, name=p.name,
        start_date=p.start_date, end_date=p.end_date,
    )
    return success_response(data=semester_to_dict(semester), message="Semester updated.")


@bp.delete("/semesters/<semester_id>")
@jwt_required()
@require_permission("semesters.manage")
def delete_semester(semester_id: str):
    """Delete a semester."""
    _service.delete_semester(uuid.UUID(semester_id))
    return success_response(message="Semester deleted.")
