"""Preserve users while replacing demo/workflow data with a simple dataset.

Run locally with:
    python -m reseed_simple

For production, set:
    CONFIRM_PRESERVE_USER_RESEED=I_UNDERSTAND_THIS_RESETS_CONTENT

This does not delete users, roles, permissions, role assignments, or auth
identity rows. It clears school/content/workflow records and reseeds a small,
realistic set of departments, announcements, events, registrations, attendance,
notifications, and audit entries.
"""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select, update

from app.announcements.model import (
    Announcement,
    AnnouncementApproval,
    AnnouncementAttachment,
    AnnouncementCategory,
    UploadedFile,
)
from app.app import create_app
from app.attendance.model import Attendance, AttendanceLog, QrToken
from app.audit.model import ActivityLog, AuditLog
from app.auth.model import User
from app.events.model import (
    CalendarEvent,
    Event,
    EventApproval,
    EventAttachment,
    EventCategory,
    EventResult,
)
from app.extensions import db
from app.notifications.model import Notification, NotificationLog, NotificationTemplate
from app.permissions.model import Role, UserRole
from app.registrations.model import Registration, Team, TeamMember, Waitlist
from app.users.model import (
    AcademicYear,
    AdministratorProfile,
    Course,
    Department,
    OfficerProfile,
    Organization,
    OrganizationPosition,
    Section,
    Semester,
    StudentProfile,
    TeacherProfile,
)
from app.utils.datetime import utcnow
from seed import seed_rbac

PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_RESETS_CONTENT"


def _require_confirmation() -> None:
    if os.getenv("FLASK_ENV", "development").lower() != "production":
        return
    if os.getenv("CONFIRM_PRESERVE_USER_RESEED") != PRODUCTION_CONFIRMATION:
        raise RuntimeError(
            "Production reseed is blocked. Set "
            f"CONFIRM_PRESERVE_USER_RESEED={PRODUCTION_CONFIRMATION} to continue."
        )


def _user_with_role(role_name: str) -> User | None:
    stmt = (
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == role_name, User.deleted_at.is_(None))
        .order_by(User.created_at.asc())
    )
    return db.session.scalar(stmt)


def _users_with_role(role_name: str, limit: int = 3) -> list[User]:
    stmt = (
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == role_name, User.deleted_at.is_(None))
        .order_by(User.created_at.asc())
        .limit(limit)
    )
    return list(db.session.scalars(stmt).all())


def _clear_content_preserving_users() -> None:
    """Delete dependent content in FK-safe order, keeping all accounts."""
    db.session.execute(update(StudentProfile).values(department_id=None, section_id=None))
    db.session.execute(update(TeacherProfile).values(department_id=None))
    db.session.execute(update(OfficerProfile).values(organization_id=None))
    db.session.execute(update(Department).values(head_id=None))
    db.session.execute(update(Organization).values(adviser_id=None))
    db.session.flush()

    for model in (
        NotificationLog,
        Notification,
        AttendanceLog,
        Attendance,
        QrToken,
        Waitlist,
        TeamMember,
        Registration,
        Team,
        EventResult,
        CalendarEvent,
        EventApproval,
        EventAttachment,
        AnnouncementApproval,
        AnnouncementAttachment,
        UploadedFile,
        Event,
        Announcement,
        EventCategory,
        AnnouncementCategory,
        ActivityLog,
        AuditLog,
        NotificationTemplate,
        Section,
        Course,
        Semester,
        AcademicYear,
        Organization,
        Department,
    ):
        db.session.query(model).delete(synchronize_session=False)

    db.session.commit()


def _ensure_profile_rows(
    *,
    admin: User | None,
    professor: User | None,
    officer: User | None,
    students: list[User],
    department: Department,
    section: Section,
    organization: Organization,
) -> None:
    if admin:
        profile = db.session.get(AdministratorProfile, admin.id)
        if profile is None:
            profile = AdministratorProfile(id=admin.id)
            db.session.add(profile)
        profile.employee_number = profile.employee_number or "ADM-2026-001"
        profile.position = profile.position or "Campus Administrator"

    if professor:
        profile = db.session.get(TeacherProfile, professor.id)
        if profile is None:
            profile = TeacherProfile(id=professor.id)
            db.session.add(profile)
        profile.employee_number = profile.employee_number or "FAC-2026-001"
        profile.department_id = department.id
        profile.position = profile.position or "Program Coordinator"

    if officer:
        profile = db.session.get(OfficerProfile, officer.id)
        if profile is None:
            profile = OfficerProfile(id=officer.id)
            db.session.add(profile)
        profile.organization_id = organization.id
        profile.position = profile.position or "Representative"
        profile.term_start = date(2026, 8, 1)
        profile.term_end = date(2027, 5, 31)

    for index, student in enumerate(students, start=1):
        profile = db.session.get(StudentProfile, student.id)
        if profile is None:
            profile = StudentProfile(id=student.id)
            db.session.add(profile)
        profile.student_number = profile.student_number or f"2026-000{index}"
        profile.department_id = department.id
        profile.section_id = section.id
        profile.year_level = profile.year_level or 3


def _seed_school_structure(admin: User | None, professor: User | None) -> tuple[
    Department,
    Course,
    Section,
    Organization,
    AcademicYear,
    Semester,
]:
    ay = AcademicYear(
        name="2026-2027",
        start_date=date(2026, 8, 1),
        end_date=date(2027, 5, 31),
        is_current=True,
    )
    db.session.add(ay)
    db.session.flush()

    semester = Semester(
        academic_year_id=ay.id,
        name="First Semester",
        start_date=date(2026, 8, 1),
        end_date=date(2026, 12, 18),
    )
    department = Department(
        name="College of Information Technology",
        code="CIT",
        description="Academic department for computing and digital systems programs.",
        head_id=admin.id if admin else None,
    )
    db.session.add_all([semester, department])
    db.session.flush()

    course = Course(
        department_id=department.id,
        name="Bachelor of Science in Information Technology",
        code="BSIT",
    )
    organization = Organization(
        name="Student Council",
        description="Official student representative organization.",
        category="student_government",
        organization_type="student_council",
        adviser_id=professor.id if professor else None,
    )
    db.session.add_all([course, organization])
    db.session.flush()
    organization.positions.extend(
        [
            OrganizationPosition(name="President", sort_order=0),
            OrganizationPosition(name="Vice President", sort_order=1),
            OrganizationPosition(name="Secretary", sort_order=2),
            OrganizationPosition(name="Treasurer", sort_order=3),
            OrganizationPosition(name="Auditor", sort_order=4),
            OrganizationPosition(name="PIO", sort_order=5),
            OrganizationPosition(name="Representative", sort_order=6),
        ]
    )

    section = Section(course_id=course.id, semester_id=semester.id, name="3A")
    db.session.add(section)
    db.session.flush()
    return department, course, section, organization, ay, semester


def _seed_categories() -> tuple[
    AnnouncementCategory,
    AnnouncementCategory,
    EventCategory,
    EventCategory,
]:
    general = AnnouncementCategory(
        name="General Updates",
        slug="general-updates",
        description="Campus-wide reminders and notices.",
        color="#1d4ed8",
    )
    academic = AnnouncementCategory(
        name="Academic Advising",
        slug="academic-advising",
        description="Enrollment, advising, and academic schedule notices.",
        color="#0369a1",
    )
    workshop = EventCategory(
        name="Workshops",
        slug="workshops",
        description="Learning and career preparation activities.",
        color="#1d4ed8",
    )
    campus = EventCategory(
        name="Campus Activities",
        slug="campus-activities",
        description="Student life and organization-led activities.",
        color="#0f766e",
    )
    db.session.add_all([general, academic, workshop, campus])
    db.session.flush()
    return general, academic, workshop, campus


def _seed_announcements(
    *,
    admin: User | None,
    professor: User | None,
    general: AnnouncementCategory,
    academic: AnnouncementCategory,
) -> list[Announcement]:
    now = utcnow()
    author = admin or professor
    if author is None:
        return []

    posts = [
        Announcement(
            title="Enrollment Advising Week Opens",
            summary="Students may meet their program adviser before finalizing class schedules.",
            body=(
                "Enrollment advising will be available from September 1 to September 5. "
                "Students are encouraged to review their checklist before visiting the office."
            ),
            category_id=academic.id,
            author_id=author.id,
            priority="important",
            status="published",
            published_at=now - timedelta(days=2),
            target_audience=["all"],
            is_pinned=True,
            created_by=author.id,
            updated_by=author.id,
        ),
        Announcement(
            title="Library Study Hall Hours Extended",
            summary="The library will stay open later during the first exam preparation week.",
            body=(
                "The campus library will be open until 7:00 PM from Monday to Friday. "
                "Students should bring their school ID for entry after regular hours."
            ),
            category_id=general.id,
            author_id=(professor or author).id,
            priority="normal",
            status="published",
            published_at=now - timedelta(hours=18),
            target_audience=["all"],
            created_by=(professor or author).id,
            updated_by=(professor or author).id,
        ),
    ]
    db.session.add_all(posts)
    db.session.flush()
    return posts


def _seed_events(
    *,
    organizer: User | None,
    workshop: EventCategory,
    campus: EventCategory,
) -> list[Event]:
    if organizer is None:
        return []

    now = datetime.now(timezone.utc)
    events = [
        Event(
            title="Career Readiness Workshop",
            description="A practical session on resume preparation, interview basics, and internship readiness.",
            category_id=workshop.id,
            organizer_id=organizer.id,
            status="approved",
            start_time=now + timedelta(days=7, hours=1),
            end_time=now + timedelta(days=7, hours=3),
            location="Computer Laboratory 2",
            capacity=30,
            registration_deadline=now + timedelta(days=5),
            is_team_event=False,
            approval_required=True,
            created_by=organizer.id,
            updated_by=organizer.id,
        ),
        Event(
            title="Campus Innovation Challenge",
            description="Student teams propose a small technology solution for a real campus process.",
            category_id=campus.id,
            organizer_id=organizer.id,
            status="approved",
            start_time=now + timedelta(days=14, hours=2),
            end_time=now + timedelta(days=14, hours=5),
            location="Multipurpose Hall",
            capacity=40,
            registration_deadline=now + timedelta(days=10),
            is_team_event=True,
            max_team_size=4,
            approval_required=True,
            created_by=organizer.id,
            updated_by=organizer.id,
        ),
        Event(
            title="First Semester Orientation",
            description="Orientation for academic policies, student services, and campus participation guidelines.",
            category_id=campus.id,
            organizer_id=organizer.id,
            status="completed",
            start_time=now - timedelta(days=5, hours=3),
            end_time=now - timedelta(days=5, hours=1),
            location="Auditorium",
            capacity=120,
            registration_deadline=now - timedelta(days=7),
            is_team_event=False,
            approval_required=True,
            created_by=organizer.id,
            updated_by=organizer.id,
        ),
    ]
    db.session.add_all(events)
    db.session.flush()

    for event in events:
        if event.status in {"approved", "ongoing", "completed"}:
            db.session.add(
                CalendarEvent(
                    event_id=event.id,
                    title=event.title,
                    start_time=event.start_time,
                    end_time=event.end_time,
                    color=event.category.color if event.category else None,
                    is_public=True,
                )
            )
    db.session.flush()
    return events


def _seed_participation(
    *,
    students: list[User],
    events: list[Event],
    professor: User | None,
) -> None:
    if not students or len(events) < 3:
        return

    career, challenge, orientation = events[0], events[1], events[2]
    first_student = students[0]
    second_student = students[1] if len(students) > 1 else None

    career_registration = Registration(
        event_id=career.id,
        user_id=first_student.id,
        status="approved",
        notes="Interested in internship preparation.",
    )
    orientation_registration = Registration(
        event_id=orientation.id,
        user_id=first_student.id,
        status="attended",
    )
    db.session.add_all([career_registration, orientation_registration])
    db.session.flush()

    team = Team(
        event_id=challenge.id,
        name="CIT Solutions",
        team_code="CIT2026",
        leader_id=first_student.id,
    )
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamMember(team_id=team.id, user_id=first_student.id, role="leader"))
    db.session.add(
        Registration(
            event_id=challenge.id,
            user_id=first_student.id,
            team_id=team.id,
            status="pending",
            notes="Initial team proposal.",
        )
    )

    if second_student:
        db.session.add(TeamMember(team_id=team.id, user_id=second_student.id, role="member"))
        db.session.add(
            Registration(
                event_id=challenge.id,
                user_id=second_student.id,
                team_id=team.id,
                status="pending",
            )
        )

    attendance = Attendance(
        event_id=orientation.id,
        user_id=first_student.id,
        registration_id=orientation_registration.id,
        status="present",
        check_in_at=orientation.start_time + timedelta(minutes=12),
        method="qr",
        recorded_by=professor.id if professor else None,
    )
    db.session.add(attendance)
    db.session.flush()
    db.session.add(
        AttendanceLog(
            attendance_id=attendance.id,
            event_id=orientation.id,
            user_id=first_student.id,
            action="check_in",
            method="qr",
            actor_id=first_student.id,
        )
    )


def _seed_notifications_and_audit(
    *,
    admin: User | None,
    professor: User | None,
    officer: User | None,
    students: list[User],
    events: list[Event],
) -> None:
    now = utcnow()
    recipients = [user for user in [admin, professor, officer, *students[:2]] if user is not None]
    for user in recipients:
        db.session.add(
            Notification(
                user_id=user.id,
                title="SchoolConnect data refreshed",
                body="A simple realistic starter dataset is now available for review.",
                category="system",
                status="unread",
            )
        )

    actor = admin or professor
    if actor:
        db.session.add(
            AuditLog(
                actor_id=actor.id,
                action="reseed_content",
                entity_type="database",
                changes={"mode": "preserve_users", "dataset": "simple_realistic"},
                created_at=now,
            )
        )
        db.session.add(
            ActivityLog(
                user_id=actor.id,
                action="reseed_content",
                description="Replaced non-user demo records with a simple realistic dataset.",
                entity_type="database",
                created_at=now,
            )
        )

    if professor and events:
        db.session.add(
            Notification(
                user_id=professor.id,
                title="Roster ready for review",
                body=f"Registrations are available for {events[1].title}.",
                category="registrations",
                entity_type="event",
                entity_id=events[1].id,
            )
        )


def reseed_simple_data() -> None:
    _require_confirmation()
    seed_rbac()

    admin = _user_with_role("admin")
    professor = _user_with_role("teacher")
    officer = _user_with_role("student_council")
    students = _users_with_role("student", limit=3)

    _clear_content_preserving_users()

    department, _course, section, organization, _ay, _semester = _seed_school_structure(
        admin, professor
    )
    _ensure_profile_rows(
        admin=admin,
        professor=professor,
        officer=officer,
        students=students,
        department=department,
        section=section,
        organization=organization,
    )
    general, academic, workshop, campus = _seed_categories()
    _seed_announcements(
        admin=admin,
        professor=professor,
        general=general,
        academic=academic,
    )
    events = _seed_events(organizer=professor or admin, workshop=workshop, campus=campus)
    _seed_participation(students=students, events=events, professor=professor)
    _seed_notifications_and_audit(
        admin=admin,
        professor=professor,
        officer=officer,
        students=students,
        events=events,
    )
    db.session.commit()

    print("Preserved users and reseeded simple realistic data.")
    print(f"Users kept: {db.session.scalar(select(func.count(User.id)))}")
    print("Seeded: 1 department, 1 course, 1 section, 1 organization.")
    print("Seeded: 2 announcements, 3 events, registrations, attendance, notifications.")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        reseed_simple_data()
