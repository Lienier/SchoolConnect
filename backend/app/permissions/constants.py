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
        "announcements.approve",
    ],
    "events": [
        "events.view",
        "events.create",
        "events.update",
        "events.delete",
        "events.approve",
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
        # Announcements: create/update/delete own + approve (includes others' drafts)
        "announcements.view",
        "announcements.create",
        "announcements.update",
        "announcements.delete",
        "announcements.approve",
        # Events: full management of assigned + approve proposed
        "events.view",
        "events.create",
        "events.update",
        "events.delete",
        "events.approve",
        # Registrations: approve/manage/view
        "registrations.view",
        "registrations.approve",
        "registrations.manage",
        # Attendance: full
        "attendance.view",
        "attendance.manage",
        "attendance.scan",
        # Reports: view + generate
        "reports.view",
        "reports.generate",
        "notifications.view",
        # Read-only school structure visibility
        "departments.view",
        "courses.view",
        "sections.view",
        "organizations.view",
        "academic_years.view",
        "semesters.view",
    ],
    "student_council": [
        # Announcements: draft only, submit for approval, no publish/approve/delete of others
        "announcements.view",
        "announcements.create",
        "announcements.update",
        # Events: proposal only, no approve/delete
        "events.view",
        "events.create",
        "events.update",
        # Registrations: view + manage assigned participants
        "registrations.view",
        "registrations.manage",
        # Attendance: view + scan assigned events
        "attendance.view",
        "attendance.scan",
        # Notifications + read-only reports/school visibility
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
        "events.create",
        "registrations.view",
        "registrations.create",
        "attendance.view",
        "notifications.view",
        "users.update",
        "departments.view",
        "courses.view",
        "sections.view",
        "organizations.view",
        "academic_years.view",
        "semesters.view",
    ],
}

SYSTEM_ROLES: list[str] = ["admin", "teacher", "student_council", "student"]
