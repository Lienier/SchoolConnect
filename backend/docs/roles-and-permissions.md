# SchoolConnect — User Roles & Functional Specification

> **Status:** Authoritative blueprint for UI, backend permissions and data model.
> Derived from the project Role & Permission Specification. Backend
> `DEFAULT_ROLE_PERMISSIONS` in `app/permissions/constants.py` is kept in sync
> with the matrix below. Frontend `usePermissions` mirrors the same mapping.

## User Hierarchy (no implicit inheritance)

```
System Administrator
        │
        ▼
Teacher / Event Coordinator
        │
        ▼
Student Council Officer
        │
        ▼
Student
```

Each role is granted **only** the permissions explicitly listed. Lower roles
cannot reach higher-level functions.

## Permission Matrix (single source of truth)

| Feature                | Admin | Teacher | Officer        | Student |
| ---------------------- | :---: | :-----: | :------------: | :-----: |
| View Dashboard         |  ✅   |   ✅    |      ✅        |   ✅    |
| Manage Users           |  ✅   |   ❌    |      ❌        |   ❌    |
| Manage Roles           |  ✅   |   ❌    |      ❌        |   ❌    |
| Create Announcement    |  ✅   |   ✅    | ✅ (draft only)|   ❌    |
| Approve Announcement   |  ✅   |   ✅    |      ❌        |   ❌    |
| Create Event           |  ✅   |   ✅    | ✅ (proposal)  |   ❌    |
| Approve Event          |  ✅   |   ✅    |      ❌        |   ❌    |
| Register for Event     |  ❌   |   ❌    |      ❌        |   ✅    |
| Cancel Registration    |  ❌   |   ❌    |      ❌        |   ✅    |
| Approve Registration   |  ✅   |   ✅    | Assigned only  |   ❌    |
| Record Attendance      |  ✅   |   ✅    | Assigned only  |   ❌    |
| Generate Reports       |  ✅   |   ✅    | Assigned only  |   ❌    |
| View Audit Logs        |  ✅   |   ❌    |      ❌        |   ❌    |
| Manage Departments     |  ✅   |   ❌    |      ❌        |   ❌    |
| Manage Settings        |  ✅   |   ❌    |      ❌        |   ❌    |

### Ownership / assignment scoping (enforced in services)
- **Teacher** may manage events they organize; `events.approve` lets them act
  on any event (approve/override). Implemented via
  `app/common/ownership.py`.
- **Officer** may create event proposals and draft announcements but **cannot
  publish/approve** (no `*.approve`). After assignment, officer may manage
  participants / record attendance for **assigned** events only.
- **Student** can register/cancel only for themselves; register once; not after
  deadline; not when ineligible.

## Account creation required fields (data model target)
- **Student:** student number, names, birth date, gender, department, course,
  year level, section, academic year, school email, contact, emergency contact,
  username/password. (Profiles in `app/users/model.py` cover most; middle
  name/gender/suffix are future additions.)
- **Teacher:** employee number, full name, department, position, school email,
  contact, username/password.
- **Officer:** student/teacher fields + organization, position, adviser, term.
- **Admin:** employee number, full name, office, position, school email,
  username/password.

## Four separate dashboards (DECISION: future phase)
The spec recommends **role-specific dashboards** rather than one dashboard with
hidden buttons:

```
/public   Login, Forgot Password
/admin     Administrator dashboard
/teacher   Teacher dashboard
/officer   Student Council dashboard
/student   Student dashboard
```

Each gets its own sidebar, role-specific widgets, quick actions and
notifications. This improves usability and simplifies permission enforcement.

**Applied now:** a single permission-aware Dashboard exists (`DashboardPage`)
with role-gated admin links. The split into `/admin` `/teacher` `/officer`
`/student` route trees is **deferred to a later phase** (see "Future work").

## Future work (not yet implemented)
1. **Separate dashboards** under `/admin`, `/teacher`, `/officer`, `/student`
   with dedicated layouts and widgets (admin: audit logs, system health;
   teacher: assigned events, attendance today; officer: proposals, pending
   approvals; student: calendar, certificates, QR code).
2. **Ownership scoping** extended to registrations, attendance and reports
   (currently events update/delete/status are scoped; registrations/attendance
   approve-by-assignment is next).
3. **Profile completion** fields (middle name, gender, suffix, term dates) on
   registration and profile forms.
4. **CSV/Excel user import** and **export** of user/participant/attendance lists.
5. **Audit log UI** (login history, activities, approval history) for admin.
6. **Settings UI** for categories, templates, school structure management
   (backend CRUD already exists; UI screens are per-dashboard).
7. **Pin / archive / schedule** announcement workflow states.
