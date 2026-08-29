"""Role and permission constants for the permission-based RBAC system.

Roles are collections of fine-grained permissions. The four seed roles defined
here can be extended at runtime with custom roles without code changes.
"""

from __future__ import annotations

# Canonical permission names grouped by resource.
PERMISSIONS: dict[str, list[str]] = {
    "users": [
        "users.view",
        "users.create",
        "users.update",
        "users.delete",
        "users.manage_roles",
    ],
    "roles": [
        "roles.view",
        "roles.create",
        "roles.update",
        "roles.delete",
        "roles.assign_permissions",
    ],
    "school_structure": [
        "departments.view",
        "departments.manage",
        "courses.view",
        "courses.manage",
        "sections.view",
        "sections.manage",
        "organizations.view",
        "organizations.manage",
        "academic_years.view",
        "academic_years.manage",
        "semesters.view",
        "semesters.manage",
    ],
    "announcements": [
        "announcements.view",
        "announcements.create",
        "announcements.update",
        "announcements.delete",
        "announcements.moderate",
    ],
    "events": [
        "events.view",
        "events.create",
        "events.update",
        "events.delete",
        "events.manage_all",
    ],
    "registrations": [
        "registrations.view",
        "registrations.create",
        "registrations.approve",
        "registrations.manage",
    ],
    "attendance": [
        "attendance.view",
        "attendance.manage",
        "attendance.scan",
        "attendance.checkin",
    ],
    "notifications": [
        "notifications.view",
        "notifications.send",
    ],
    "reports": [
        "reports.view",
        "reports.generate",
    ],
    "audit": [
        "audit.view",
    ],
}

# The four default system roles and the permissions they grant.
DEFAULT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": [
        perm
        for perms in PERMISSIONS.values()
        for perm in perms
    ],
    "teacher": [
        # Announcements are published immediately and immutable to authors.
        "announcements.view",
        "announcements.create",
        # Events: full management of events they organize.
        "events.view",
        "events.create",
        "events.update",
        "events.delete",
        # Registrations: approve/manage/view
        "registrations.view",
        "registrations.approve",
        "registrations.manage",
        # Attendance: full
        "attendance.view",
        "attendance.manage",
        "attendance.scan",
        "attendance.checkin",
        # Reports: view + generate
        "reports.view",
        "reports.generate",
        "notifications.view",
        # Read-only college structure visibility
        "departments.view",
        "courses.view",
        "sections.view",
        "organizations.view",
        "academic_years.view",
        "semesters.view",
    ],
    "student_council": [
        # Announcements are published immediately and immutable to authors.
        "announcements.view",
        "announcements.create",
        # Event management is restricted to owned or assigned events.
        "events.view",
        "events.create",
        "events.update",
        # Registrations: view + manage assigned participants
        "registrations.view",
        "registrations.manage",
        # Attendance: view + scan assigned events
        "attendance.view",
        "attendance.scan",
        # Notifications + read-only reports/college visibility
        "notifications.view",
        "reports.view",
        "departments.view",
        "courses.view",
        "sections.view",
        "organizations.view",
        "academic_years.view",
        "semesters.view",
    ],
    "student": [
        "announcements.view",
        "events.view",
        "registrations.view",
        "registrations.create",
        "attendance.view",
        "attendance.checkin",
        "notifications.view",
        "departments.view",
        "courses.view",
        "sections.view",
        "organizations.view",
        "academic_years.view",
        "semesters.view",
    ],
}

SYSTEM_ROLES: list[str] = ["admin", "teacher", "student_council", "student"]
