"""Idempotent seed script for RBAC roles and permissions.

Run with:  flask shell  ->  from seed import seed_rbac; seed_rbac()
or:        python -m seed   (within the activated venv, FLASK_APP set)

It creates every permission and the four default system roles, assigning the
permissions defined in ``app.permissions.constants``. Existing rows are left
untouched, so the script is safe to run repeatedly.
"""

from __future__ import annotations

from datetime import date, timedelta
import os

from app.app import create_app
from app.extensions import db
from app.permissions.constants import DEFAULT_ROLE_PERMISSIONS, PERMISSIONS
from app.permissions.model import Permission, Role, RolePermission, UserRole
from app.utils.datetime import utcnow


def seed_rbac() -> None:
    """Create permissions and default roles if they do not already exist."""
    # Flatten all known permissions.
    all_perms = {perm for perms in PERMISSIONS.values() for perm in perms}
    perm_map: dict[str, Permission] = {}

    for name in sorted(all_perms):
        existing = db.session.scalar(
            db.select(Permission).where(Permission.name == name)
        )
        if existing is None:
            resource = name.split(".")[0] if "." in name else None
            action = name.split(".")[1] if "." in name else None
            perm = Permission(name=name, resource=resource, action=action)
            db.session.add(perm)
            db.session.flush()
            perm_map[name] = perm
        else:
            perm_map[name] = existing

    for role_name, perm_names in DEFAULT_ROLE_PERMISSIONS.items():
        role = db.session.scalar(
            db.select(Role).where(Role.name == role_name)
        )
        if role is None:
            role = Role(
                name=role_name,
                display_name=role_name.replace("_", " ").title(),
                is_system=True,
            )
            db.session.add(role)
            db.session.flush()

        # Keep system roles synchronized with the canonical matrix. This is
        # intentionally subtractive so a permission removed from policy (for
        # example, student event creation) is also removed from the database.
        desired = set(perm_names)
        for existing_permission in list(role.permissions):
            if existing_permission.name not in desired:
                role.permissions.remove(existing_permission)

        assigned = {p.name for p in role.permissions}
        for perm_name in perm_names:
            perm = perm_map.get(perm_name)
            if perm is None or perm_name in assigned:
                continue
            db.session.add(RolePermission(role_id=role.id, permission_id=perm.id))

    db.session.commit()
    print("RBAC seed complete.")


def seed_categories() -> None:
    """Create default announcement categories if missing."""
    from app.announcements.model import AnnouncementCategory

    defaults = [
        ("General", "general", "#3a5a9e"),
        ("Academics", "academics", "#2c477d"),
        ("Events", "events", "#5678b8"),
        ("Sports", "sports", "#1b2d4f"),
        ("Emergency", "emergency", "#b91c1c"),
    ]
    for name, slug, color in defaults:
        exists = db.session.scalar(
            db.select(AnnouncementCategory).where(AnnouncementCategory.slug == slug)
        )
        if exists is None:
            db.session.add(
                AnnouncementCategory(name=name, slug=slug, color=color)
            )
    db.session.commit()
    print("Announcement categories seeded.")


def seed_event_categories() -> None:
    """Create default event categories if missing."""
    from app.events.model import EventCategory

    defaults = [
        ("Academic", "academic", "#2c477d"),
        ("Sports", "sports", "#1b2d4f"),
        ("Cultural", "cultural", "#7c3aed"),
        ("Community Service", "community-service", "#059669"),
        ("Workshop", "workshop", "#d97706"),
        ("Competition", "competition", "#b91c1c"),
    ]
    for name, slug, color in defaults:
        exists = db.session.scalar(
            db.select(EventCategory).where(EventCategory.slug == slug)
        )
        if exists is None:
            db.session.add(EventCategory(name=name, slug=slug, color=color))
    db.session.commit()
    print("Event categories seeded.")


def seed_notification_templates() -> None:
    """Create default notification templates if missing."""
    from app.notifications.model import NotificationTemplate

    defaults = [
        (
            "registration_approved",
            "Registration approved",
            "Your registration for {event_title} has been approved.",
        ),
        (
            "registration_rejected",
            "Registration rejected",
            "Your registration for {event_title} was not approved.",
        ),
        (
            "event_approved",
            "Event approved",
            "Your event {event_title} has been approved and published.",
        ),
        (
            "waitlist_promoted",
            "You're off the waitlist",
            "A spot opened up for {event_title}. You are now registered.",
        ),
    ]
    for code, title, body in defaults:
        exists = db.session.scalar(
            db.select(NotificationTemplate).where(NotificationTemplate.code == code)
        )
        if exists is None:
            db.session.add(
                NotificationTemplate(code=code, title=title, body=body, channel="in_app")
            )
    db.session.commit()
    print("Notification templates seeded.")


def seed_admin_user() -> None:
    """Create default admin user if not exists."""
    from app.auth.service import AuthService
    from app.auth.model import User

    admin_email = os.getenv("SEED_ADMIN_EMAIL")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        print("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set; skipping configured admin seed.")
        return
    existing = db.session.scalar(
        db.select(User).where((User.email == admin_email) | (User.username == "admin"))
    )
    if existing is None:
        service = AuthService()
        admin_user = service.register(
            email=admin_email,
            password=admin_password,
            full_name="Admin User",
            username="admin",
        )
        _set_user_roles(admin_user, ["admin"])
        print(f"Seed admin user created: {admin_email}")
    else:
        existing.email = admin_email
        existing.username = "admin"
        existing.full_name = "Admin User"
        existing.password_hash = AuthService()._hash_password(admin_password)
        existing.status = "active"
        existing.email_verified = True
        _set_user_roles(existing, ["admin"])
        print("Default admin user already exists.")


def seed_demo_users() -> None:
    """Create one active demo account for each system role."""
    from app.auth.model import User
    from app.auth.service import AuthService

    demo_users = [
        ("admin.demo@example.com", "Admin123!", "Demo Administrator", "demo_admin", "admin"),
        ("teacher.demo@example.com", "Teacher123!", "Demo Professor", "demo_teacher", "teacher"),
        ("officer.demo@example.com", "Officer123!", "Demo Student Council Officer", "demo_officer", "student_council"),
        ("student.demo@example.com", "Student123!", "Demo Student", "demo_student", "student"),
    ]
    service = AuthService()
    for email, password, full_name, username, role_name in demo_users:
        user = db.session.scalar(
            db.select(User).where((User.email == email) | (User.username == username))
        )
        if user is None:
            user = service.register(
                email=email,
                password=password,
                full_name=full_name,
                username=username,
            )
        else:
            user.email = email
            user.username = username
            user.full_name = full_name
            user.password_hash = service._hash_password(password)
        user.status = "active"
        user.email_verified = True
        _set_user_roles(user, [role_name])
        print(f"Demo {role_name} account ready: {email}")


def _set_user_roles(user, role_names: list[str]) -> None:
    """Replace a user's role links with the supplied role names."""
    roles = list(db.session.scalars(db.select(Role).where(Role.name.in_(role_names))).all())
    if len(roles) != len(set(role_names)):
        missing = sorted(set(role_names) - {role.name for role in roles})
        raise RuntimeError(f"Missing roles: {', '.join(missing)}")
    db.session.query(UserRole).filter(UserRole.user_id == user.id).delete(
        synchronize_session=False
    )
    db.session.flush()
    for role in roles:
        db.session.add(UserRole(user_id=user.id, role_id=role.id))
    db.session.commit()


def seed_mvp_demo_data() -> None:
    """Seed complete workflow data for admin-first MVP verification."""
    from app.announcements.model import Announcement
    from app.attendance.model import Attendance
    from app.audit.model import AuditLog
    from app.auth.model import User
    from app.events.model import CalendarEvent, Event, EventCategory, EventRequirement
    from app.notifications.model import Notification
    from app.registrations.model import Registration, Team, TeamMember, Waitlist
    from app.users.model import (
        AcademicYear,
        AdministratorProfile,
        Course,
        Department,
        OfficerProfile,
        Organization,
        Section,
        Semester,
        StudentProfile,
        TeacherProfile,
    )

    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@schoolconnect.local")
    admin = db.session.scalar(db.select(User).where(User.email == admin_email))
    teacher = db.session.scalar(db.select(User).where(User.email == "teacher.demo@example.com"))
    officer = db.session.scalar(db.select(User).where(User.email == "officer.demo@example.com"))
    student = db.session.scalar(db.select(User).where(User.email == "student.demo@example.com"))
    extra_student = _ensure_user(
        email="student.two@example.com",
        password="StudentTwo123!",
        full_name="Demo Student Two",
        username="demo_student_two",
        role_name="student",
    )
    if not all([admin, teacher, officer, student]):
        raise RuntimeError("Seed users must exist before MVP demo data is seeded.")

    department = _get_or_create(
        Department,
        Department.code == "CS",
        name="Computer Studies",
        code="CS",
        description="Demo department for SchoolConnect verification.",
        head_id=teacher.id,
    )
    year = _get_or_create(
        AcademicYear,
        AcademicYear.name == "2026-2027",
        name="2026-2027",
        start_date=date(2026, 6, 1),
        end_date=date(2027, 3, 31),
        is_current=True,
    )
    semester = _get_or_create(
        Semester,
        (Semester.academic_year_id == year.id) & (Semester.name == "First Semester"),
        academic_year_id=year.id,
        name="First Semester",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 10, 31),
    )
    course = _get_or_create(
        Course,
        (Course.department_id == department.id) & (Course.code == "BSIT"),
        department_id=department.id,
        name="Bachelor of Science in Information Technology",
        code="BSIT",
    )
    section = _get_or_create(
        Section,
        (Section.course_id == course.id)
        & (Section.semester_id == semester.id)
        & (Section.name == "3A"),
        course_id=course.id,
        semester_id=semester.id,
        name="3A",
    )
    organization = _get_or_create(
        Organization,
        Organization.name == "Student Council",
        name="Student Council",
        description="Demo organization for approval workflows.",
        category="council",
        adviser_id=teacher.id,
    )

    _ensure_profile(AdministratorProfile, admin.id, employee_number="ADM-0001", position="System Administrator")
    _ensure_profile(TeacherProfile, teacher.id, employee_number="TCH-0001", department_id=department.id, position="Faculty Adviser")
    _ensure_profile(OfficerProfile, officer.id, organization_id=organization.id, position="President", term_start=date(2026, 6, 1), term_end=date(2027, 3, 31))
    _ensure_profile(StudentProfile, student.id, student_number="STU-0001", department_id=department.id, section_id=section.id, year_level=3)
    _ensure_profile(StudentProfile, extra_student.id, student_number="STU-0002", department_id=department.id, section_id=section.id, year_level=3)

    event_category = db.session.scalar(db.select(EventCategory).where(EventCategory.slug == "workshop"))
    announcement_category = _announcement_category("general")
    now = utcnow()

    pending_event = _get_or_create(
        Event,
        Event.title == "MVP Approval Test Event",
        title="MVP Approval Test Event",
        description="Pending event proposal used to verify admin approve, return, and reject actions.",
        category_id=event_category.id if event_category else None,
        organizer_id=officer.id,
        organization_id=organization.id,
        status="pending_approval",
        start_time=now + timedelta(days=14),
        end_time=now + timedelta(days=14, hours=2),
        location="Innovation Lab",
        capacity=40,
        registration_deadline=now + timedelta(days=10),
        is_team_event=False,
        max_team_size=None,
        approval_required=True,
        created_by=officer.id,
        updated_by=officer.id,
    )
    approved_event = _get_or_create(
        Event,
        Event.title == "MVP Approved Individual Event",
        title="MVP Approved Individual Event",
        description="Approved individual event for registration and attendance verification.",
        category_id=event_category.id if event_category else None,
        organizer_id=teacher.id,
        organization_id=organization.id,
        status="approved",
        start_time=now + timedelta(days=7),
        end_time=now + timedelta(days=7, hours=2),
        location="Auditorium",
        capacity=2,
        registration_deadline=now + timedelta(days=5),
        is_team_event=False,
        max_team_size=None,
        approval_required=False,
        created_by=teacher.id,
        updated_by=teacher.id,
    )
    team_event = _get_or_create(
        Event,
        Event.title == "MVP Team Event",
        title="MVP Team Event",
        description="Approved team event for team-code join verification.",
        category_id=event_category.id if event_category else None,
        organizer_id=teacher.id,
        organization_id=organization.id,
        status="approved",
        start_time=now + timedelta(days=9),
        end_time=now + timedelta(days=9, hours=3),
        location="Gymnasium",
        capacity=20,
        registration_deadline=now + timedelta(days=6),
        is_team_event=True,
        max_team_size=4,
        approval_required=False,
        created_by=teacher.id,
        updated_by=teacher.id,
    )
    _get_or_create(
        EventRequirement,
        (EventRequirement.event_id == approved_event.id)
        & (EventRequirement.requirement_type == "year_level"),
        event_id=approved_event.id,
        requirement_type="year_level",
        requirement_value="3",
        description="Open to third-year students.",
        is_mandatory=True,
    )
    _ensure_calendar_event(approved_event)
    _ensure_calendar_event(team_event)

    pending_announcement = _get_or_create(
        Announcement,
        Announcement.title == "MVP Pending Announcement",
        title="MVP Pending Announcement",
        body="This pending announcement verifies the admin approval queue.",
        summary="Pending admin approval test.",
        category_id=announcement_category.id if announcement_category else None,
        author_id=officer.id,
        priority="important",
        status="pending_approval",
        target_audience=["all"],
        is_pinned=False,
        is_emergency=False,
        created_by=officer.id,
        updated_by=officer.id,
    )
    _get_or_create(
        Announcement,
        Announcement.title == "MVP Urgent Feed Announcement",
        title="MVP Urgent Feed Announcement",
        body="This urgent pinned announcement verifies the public bulletin feed.",
        summary="Urgent pinned feed test.",
        category_id=announcement_category.id if announcement_category else None,
        author_id=admin.id,
        priority="urgent",
        status="published",
        published_at=now,
        target_audience=["all"],
        is_pinned=True,
        is_emergency=True,
        created_by=admin.id,
        updated_by=admin.id,
    )

    reg_approved = _ensure_registration(approved_event.id, student.id, "approved", admin.id)
    _ensure_registration(approved_event.id, extra_student.id, "waitlisted", admin.id)
    _get_or_create(
        Waitlist,
        (Waitlist.event_id == approved_event.id) & (Waitlist.user_id == extra_student.id),
        event_id=approved_event.id,
        user_id=extra_student.id,
        position=1,
        promoted=False,
    )
    _ensure_attendance(approved_event.id, student.id, reg_approved.id, "present", admin.id)

    team = _get_or_create(
        Team,
        (Team.event_id == team_event.id) & (Team.name == "MVP Team Alpha"),
        event_id=team_event.id,
        name="MVP Team Alpha",
        team_code="SC-MVP1",
        leader_id=student.id,
    )
    _get_or_create(
        TeamMember,
        (TeamMember.team_id == team.id) & (TeamMember.user_id == student.id),
        team_id=team.id,
        user_id=student.id,
        role="leader",
    )
    _ensure_registration(team_event.id, student.id, "approved", admin.id, team_id=team.id)

    _get_or_create(
        Notification,
        (Notification.user_id == admin.id) & (Notification.title == "MVP verification ready"),
        user_id=admin.id,
        title="MVP verification ready",
        body="Seed data is ready for admin-first smoke testing.",
        category="system",
        status="unread",
        entity_type="event",
        entity_id=pending_event.id,
    )
    _get_or_create(
        AuditLog,
        (AuditLog.actor_id == admin.id) & (AuditLog.action == "seed.mvp_demo"),
        actor_id=admin.id,
        action="seed.mvp_demo",
        entity_type="system",
        entity_id=None,
        changes={"status": "ready", "pending_announcement_id": str(pending_announcement.id)},
        ip_address="127.0.0.1",
        user_agent="seed.py",
    )

    db.session.commit()
    print("MVP demo workflow data seeded.")


def _ensure_user(*, email: str, password: str, full_name: str, username: str, role_name: str):
    from app.auth.model import User
    from app.auth.service import AuthService

    service = AuthService()
    user = db.session.scalar(db.select(User).where((User.email == email) | (User.username == username)))
    if user is None:
        user = service.register(email=email, password=password, full_name=full_name, username=username)
    else:
        user.email = email
        user.username = username
        user.full_name = full_name
        user.password_hash = service._hash_password(password)
    user.status = "active"
    user.email_verified = True
    _set_user_roles(user, [role_name])
    return user


def _get_or_create(model, criterion, **values):
    instance = db.session.scalar(db.select(model).where(criterion))
    if instance is None:
        instance = model(**values)
        db.session.add(instance)
        db.session.flush()
    else:
        for key, value in values.items():
            setattr(instance, key, value)
        db.session.flush()
    return instance


def _ensure_profile(model, user_id, **values) -> None:
    profile = db.session.get(model, user_id)
    if profile is None:
        profile = model(id=user_id, **values)
        db.session.add(profile)
    else:
        for key, value in values.items():
            setattr(profile, key, value)
    db.session.flush()


def _announcement_category(slug: str):
    from app.announcements.model import AnnouncementCategory

    return db.session.scalar(db.select(AnnouncementCategory).where(AnnouncementCategory.slug == slug))


def _ensure_calendar_event(event) -> None:
    from app.events.model import CalendarEvent

    existing = db.session.scalar(db.select(CalendarEvent).where(CalendarEvent.event_id == event.id))
    values = {
        "event_id": event.id,
        "title": event.title,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "color": event.category.color if event.category else None,
        "is_public": True,
    }
    if existing is None:
        db.session.add(CalendarEvent(**values))
    else:
        for key, value in values.items():
            setattr(existing, key, value)
    db.session.flush()


def _ensure_registration(event_id, user_id, status: str, reviewer_id, team_id=None):
    from app.registrations.model import Registration

    registration = db.session.scalar(
        db.select(Registration).where(
            Registration.event_id == event_id,
            Registration.user_id == user_id,
        )
    )
    values = {
        "event_id": event_id,
        "user_id": user_id,
        "team_id": team_id,
        "status": status,
        "notes": "Seeded for MVP verification.",
        "reviewed_by": reviewer_id,
        "reviewed_at": utcnow(),
    }
    if registration is None:
        registration = Registration(**values)
        db.session.add(registration)
    else:
        for key, value in values.items():
            setattr(registration, key, value)
    db.session.flush()
    return registration


def _ensure_attendance(event_id, user_id, registration_id, status: str, actor_id) -> None:
    from app.attendance.model import Attendance

    attendance = db.session.scalar(
        db.select(Attendance).where(
            Attendance.event_id == event_id,
            Attendance.user_id == user_id,
        )
    )
    values = {
        "event_id": event_id,
        "user_id": user_id,
        "registration_id": registration_id,
        "status": status,
        "method": "manual",
        "recorded_by": actor_id,
        "check_in_at": utcnow() if status in {"present", "late"} else None,
    }
    if attendance is None:
        db.session.add(Attendance(**values))
    else:
        for key, value in values.items():
            setattr(attendance, key, value)
    db.session.flush()


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_rbac()
        seed_categories()
        seed_event_categories()
        seed_notification_templates()
        seed_admin_user()
        seed_demo_users()
        seed_mvp_demo_data()
