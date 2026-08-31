from __future__ import annotations

import io
import uuid
from datetime import timedelta

import pytest

from app.app import create_app
from app.announcements.model import Announcement
from app.attendance.model import QrToken
from app.auth.model import User
from app.auth.service import AuthService
from app.common.exceptions import ConflictError, ValidationError
from app.events.model import Event, EventRequirement
from app.events.service import EventService
from app.extensions import db
from app.permissions.model import Permission, Role, RolePermission, UserRole
from app.notifications.model import Notification
from app.registrations.model import Registration, Team, TeamMember, Waitlist
from app.registrations.service import RegistrationService
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
from app.utils.datetime import utcnow


@pytest.fixture()
def app_ctx():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def _role(name: str, permissions: list[str]) -> Role:
    role = Role(name=name, display_name=name.title(), is_system=True)
    db.session.add(role)
    db.session.flush()
    for perm_name in permissions:
        permission = db.session.scalar(db.select(Permission).where(Permission.name == perm_name))
        if permission is None:
            resource, action = perm_name.split(".", 1)
            permission = Permission(name=perm_name, resource=resource, action=action)
            db.session.add(permission)
            db.session.flush()
        db.session.add(RolePermission(role_id=role.id, permission_id=permission.id))
    db.session.flush()
    return role


def _user(email: str, role: Role) -> User:
    user = User(
        email=email,
        full_name=email.split("@", 1)[0].replace(".", " ").title(),
        password_hash=AuthService()._hash_password("Password123!"),
        status="active",
        email_verified=True,
    )
    db.session.add(user)
    db.session.flush()
    db.session.add(UserRole(user_id=user.id, role_id=role.id))
    db.session.flush()
    return user


def test_admin_create_role_specific_accounts_and_profiles(app_ctx):
    admin_role = _role("admin", ["users.create", "users.view"])
    _role("student", [])
    _role("student_council", [])
    _role("department_student_leader", [])
    _role("teacher", [])
    admin = _user("creator@example.com", admin_role)

    department = Department(name="Computer Studies", code="CCS")
    academic_year = AcademicYear(
        name="2026-2027",
        start_date=utcnow().date(),
        end_date=(utcnow() + timedelta(days=300)).date(),
        is_current=True,
    )
    db.session.add_all([department, academic_year])
    db.session.flush()
    semester = Semester(
        academic_year_id=academic_year.id,
        name="First Semester",
        start_date=academic_year.start_date,
        end_date=academic_year.end_date,
    )
    course = Course(department_id=department.id, name="BS Information Technology", code="BSIT")
    db.session.add_all([semester, course])
    db.session.flush()
    section = Section(course_id=course.id, semester_id=semester.id, name="BSIT 3A")
    student_council = Organization(
        organization_type="student_council",
        name="College Student Council",
        category="Student Council",
    )
    department_leaders = Organization(
        department_id=department.id,
        organization_type="department_student_leaders",
        name="CCS Student Leaders",
        category="Department Student Leaders",
    )
    db.session.add_all([section, student_council, department_leaders])
    db.session.commit()

    client = app_ctx.test_client()
    login = client.post("/api/auth/login", json={"email": admin.email, "password": "Password123!"})
    headers = {"Authorization": f"Bearer {login.get_json()['data']['access_token']}"}

    student_response = client.post(
        "/api/users",
        json={
            "email": "student.create@example.com",
            "first_name": "Maria",
            "middle_name": "Santos",
            "last_name": "Cruz",
            "full_name": "Maria S. Cruz",
            "password": "Password123!",
            "role": "student",
            "student_number": "2026-0001",
            "department_id": str(department.id),
            "course_id": str(course.id),
        },
        headers=headers,
    )
    assert student_response.status_code == 201
    student_data = student_response.get_json()["data"]
    student_profile = db.session.get(StudentProfile, uuid.UUID(student_data["id"]))
    assert student_data["status"] == "active"
    assert student_data["username"] == "2026-0001"
    assert student_data["full_name"] == "Maria S. Cruz"
    assert student_profile is not None
    assert student_profile.course_id == course.id
    assert student_profile.section_id is None
    assert student_profile.profile_completed is False

    officer_response = client.post(
        "/api/users",
        json={
            "email": "officer.create@example.com",
            "first_name": "Juan",
            "middle_name": "Dela Gomez",
            "last_name": "Reyes",
            "full_name": "Juan DG Reyes",
            "password": "Password123!",
            "role": "student_council",
            "student_number": "2026-0002",
            "officer_position": "President",
            "department_id": str(department.id),
            "course_id": str(course.id),
            "section_id": str(section.id),
        },
        headers=headers,
    )
    assert officer_response.status_code == 201
    officer_id = uuid.UUID(officer_response.get_json()["data"]["id"])
    assert db.session.get(StudentProfile, officer_id) is not None
    assert db.session.get(StudentProfile, officer_id).profile_completed is True
    assert db.session.get(OfficerProfile, officer_id).position == "President"
    assert db.session.get(OfficerProfile, officer_id).organization_id == student_council.id

    leader_response = client.post(
        "/api/users",
        json={
            "email": "leader.create@example.com",
            "first_name": "Lia",
            "last_name": "Santos",
            "full_name": "Lia Santos",
            "password": "Password123!",
            "role": "department_student_leader",
            "student_number": "2026-0003",
            "officer_position": "Governor",
            "department_id": str(department.id),
            "course_id": str(course.id),
            "section_id": str(section.id),
        },
        headers=headers,
    )
    assert leader_response.status_code == 201
    leader_id = uuid.UUID(leader_response.get_json()["data"]["id"])
    assert db.session.get(StudentProfile, leader_id) is not None
    assert db.session.get(OfficerProfile, leader_id).position == "Governor"
    assert db.session.get(OfficerProfile, leader_id).organization_id == department_leaders.id

    professor_response = client.post(
        "/api/users",
        json={
            "email": "professor.create@example.com",
            "first_name": "Ana",
            "last_name": "Lopez",
            "full_name": "Ana Lopez",
            "password": "Password123!",
            "role": "teacher",
            "department_id": str(department.id),
        },
        headers=headers,
    )
    assert professor_response.status_code == 201
    professor_id = uuid.UUID(professor_response.get_json()["data"]["id"])
    assert db.session.get(TeacherProfile, professor_id).department_id == department.id

    admin_response = client.post(
        "/api/users",
        json={
            "email": "admin.create@example.com",
            "first_name": "System",
            "last_name": "Owner",
            "full_name": "System Owner",
            "password": "Password123!",
            "role": "admin",
            "status": "suspended",
        },
        headers=headers,
    )
    assert admin_response.status_code == 201
    admin_id = uuid.UUID(admin_response.get_json()["data"]["id"])
    assert admin_response.get_json()["data"]["status"] == "active"
    assert db.session.get(AdministratorProfile, admin_id) is not None


def test_obsolete_content_approval_endpoints_are_removed(app_ctx):
    admin_role = _role("admin", ["announcements.moderate", "events.manage_all"])
    admin = _user("admin@example.com", admin_role)
    officer = _user("officer@example.com", admin_role)
    db.session.commit()

    login = app_ctx.test_client().post(
        "/api/auth/login",
        json={"email": admin.email, "password": "Password123!"},
    )
    assert login.status_code == 200
    token = login.get_json()["data"]["access_token"]

    announcement = Announcement(
        title="Published announcement",
        body="Posted directly",
        author_id=officer.id,
        status="published",
        priority="normal",
        created_by=officer.id,
        updated_by=officer.id,
    )
    event = Event(
        title="Published event",
        organizer_id=officer.id,
        status="approved",
        start_time=utcnow() + timedelta(days=3),
        end_time=utcnow() + timedelta(days=3, hours=2),
        is_team_event=False,
        approval_required=True,
        created_by=officer.id,
        updated_by=officer.id,
    )
    db.session.add_all([announcement, event])
    db.session.commit()

    headers = {"Authorization": f"Bearer {token}"}
    event_approval = app_ctx.test_client().post(
        f"/api/events/{event.id}/approve",
        json={"decision": "returned", "comment": "Revise schedule."},
        headers=headers,
    )
    assert event_approval.status_code == 404

    announcement_approval = app_ctx.test_client().post(
        f"/api/announcements/{announcement.id}/approve",
        json={"decision": "approved"},
        headers=headers,
    )
    assert announcement_approval.status_code == 404


def test_admin_can_manage_council_membership_separately(app_ctx):
    admin_role = _role("admin", ["organizations.view", "organizations.manage"])
    student_role = _role("student", [])
    leader_role = _role("department_student_leader", [])
    admin = _user("council.admin@example.com", admin_role)
    student = _user("leader.student@example.com", student_role)
    other_student = _user("other.student@example.com", student_role)
    department = Department(name="Engineering", code="COE")
    other_department = Department(name="Education", code="CED")
    db.session.add_all([department, other_department])
    db.session.flush()
    organization = Organization(
        name="COE Student Leaders",
        category="Department Student Leaders",
        organization_type="department_student_leaders",
        department_id=department.id,
    )
    db.session.add_all(
        [
            organization,
            StudentProfile(id=student.id, student_number="2026-1001", department_id=department.id),
            StudentProfile(id=other_student.id, student_number="2026-2001", department_id=other_department.id),
        ]
    )
    db.session.commit()

    client = app_ctx.test_client()
    login = client.post("/api/auth/login", json={"email": admin.email, "password": "Password123!"})
    headers = {"Authorization": f"Bearer {login.get_json()['data']['access_token']}"}

    candidates = client.get(f"/api/school/organizations/{organization.id}/candidates", headers=headers)
    assert candidates.status_code == 200
    candidate_ids = {item["user_id"] for item in candidates.get_json()["data"]}
    assert str(student.id) in candidate_ids
    assert str(other_student.id) not in candidate_ids

    saved = client.put(
        f"/api/school/organizations/{organization.id}/members",
        json={"members": [{"user_id": str(student.id), "position": "Governor"}]},
        headers=headers,
    )
    assert saved.status_code == 200
    assert saved.get_json()["data"][0]["position"] == "Governor"
    officer = db.session.get(OfficerProfile, student.id)
    assert officer.organization_id == organization.id
    assert officer.position == "Governor"
    assert db.session.scalar(
        db.select(UserRole)
        .join(Role, Role.id == UserRole.role_id)
        .where(UserRole.user_id == student.id, Role.name == leader_role.name)
    )

    removed = client.put(
        f"/api/school/organizations/{organization.id}/members",
        json={"members": []},
        headers=headers,
    )
    assert removed.status_code == 200
    assert db.session.get(OfficerProfile, student.id) is None
    assert db.session.scalar(
        db.select(UserRole)
        .join(Role, Role.id == UserRole.role_id)
        .where(UserRole.user_id == student.id, Role.name == leader_role.name)
    ) is None


def test_content_creation_rejects_yesterday_but_allows_today(app_ctx):
    role = _role(
        "teacher",
        ["announcements.create", "events.create", "events.view"],
    )
    professor = _user("date.guard@example.com", role)
    db.session.commit()

    client = app_ctx.test_client()
    login = client.post("/api/auth/login", json={"email": professor.email, "password": "Password123!"})
    headers = {"Authorization": f"Bearer {login.get_json()['data']['access_token']}"}

    yesterday_start = utcnow() - timedelta(days=1)
    yesterday_event = client.post(
        "/api/events",
        json={
            "title": "Yesterday event",
            "start_time": yesterday_start.isoformat(),
            "end_time": (yesterday_start + timedelta(hours=1)).isoformat(),
            "is_team_event": False,
        },
        headers=headers,
    )
    assert yesterday_event.status_code == 422

    today_start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_event = client.post(
        "/api/events",
        json={
            "title": "Today event",
            "start_time": today_start.isoformat(),
            "end_time": (today_start + timedelta(hours=1)).isoformat(),
            "is_team_event": False,
        },
        headers=headers,
    )
    assert today_event.status_code == 201
    assert today_event.get_json()["data"]["status"] == "approved"

    yesterday_expiry = client.post(
        "/api/announcements",
        json={
            "title": "Expired bulletin",
            "body": "This should not be accepted.",
            "expires_at": (utcnow() - timedelta(days=1)).isoformat(),
        },
        headers=headers,
    )
    assert yesterday_expiry.status_code == 422


def test_registration_eligibility_conflict_team_join_and_attendance(app_ctx):
    role = _role(
        "student",
        ["registrations.create", "events.view", "attendance.checkin"],
    )
    student = _user("student@example.com", role)
    teammate = _user("teammate@example.com", role)
    db.session.add_all(
        [
            StudentProfile(id=student.id, year_level=3, profile_completed=True),
            StudentProfile(id=teammate.id, year_level=3, profile_completed=True),
        ]
    )
    db.session.commit()

    service = RegistrationService()
    event = Event(
        title="Eligible event",
        organizer_id=student.id,
        status="approved",
        start_time=utcnow() + timedelta(days=4),
        end_time=utcnow() + timedelta(days=4, hours=2),
        registration_deadline=utcnow() + timedelta(days=2),
        is_team_event=False,
        approval_required=False,
        capacity=5,
        created_by=student.id,
        updated_by=student.id,
    )
    team_event = Event(
        title="Team event",
        organizer_id=student.id,
        status="approved",
        start_time=utcnow() + timedelta(days=8),
        end_time=utcnow() + timedelta(days=8, hours=2),
        registration_deadline=utcnow() + timedelta(days=6),
        is_team_event=True,
        max_team_size=3,
        approval_required=False,
        created_by=student.id,
        updated_by=student.id,
    )
    db.session.add_all([event, team_event])
    db.session.flush()
    db.session.add(
        EventRequirement(
            event_id=event.id,
            requirement_type="year_level",
            requirement_value="3",
            description="Third year only",
            is_mandatory=True,
        )
    )
    db.session.commit()

    registration = service.register(event_id=event.id, user_id=student.id)
    assert registration.status == "approved"

    conflicting = Event(
        title="Conflicting event",
        organizer_id=student.id,
        status="approved",
        start_time=event.start_time + timedelta(minutes=30),
        end_time=event.end_time + timedelta(minutes=30),
        registration_deadline=utcnow() + timedelta(days=2),
        is_team_event=False,
        approval_required=False,
        created_by=student.id,
        updated_by=student.id,
    )
    db.session.add(conflicting)
    db.session.commit()
    with pytest.raises(Exception, match="Schedule conflict"):
        service.register(event_id=conflicting.id, user_id=student.id)

    team = service.register_team(
        event_id=team_event.id,
        leader_id=student.id,
        name="Test Team",
        member_ids=[],
    )
    joined = service.join_team_by_code(team_code=team.team_code, user_id=teammate.id)
    assert joined.team_id == team.id

    from app.attendance.service import AttendanceService

    attendance = AttendanceService().mark(
        event_id=event.id,
        user_id=student.id,
        status="present",
        actor_id=student.id,
    )
    assert attendance.status == "present"


def test_student_http_profile_team_and_qr_workflows(app_ctx):
    role = _role(
        "student",
        ["registrations.create", "events.view", "attendance.checkin"],
    )
    leader = _user("leader@example.com", role)
    member = _user("member@example.com", role)
    db.session.add_all(
        [
            StudentProfile(id=leader.id, year_level=2, profile_completed=True),
            StudentProfile(id=member.id, year_level=2, profile_completed=True),
        ]
    )
    event = Event(
        title="Team showcase",
        organizer_id=leader.id,
        status="approved",
        start_time=utcnow() + timedelta(days=5),
        end_time=utcnow() + timedelta(days=5, hours=2),
        registration_deadline=utcnow() + timedelta(days=2),
        is_team_event=True,
        max_team_size=4,
        approval_required=False,
        created_by=leader.id,
        updated_by=leader.id,
    )
    db.session.add(event)
    db.session.commit()

    client = app_ctx.test_client()
    leader_login = client.post("/api/auth/login", json={"email": leader.email, "password": "Password123!"})
    member_login = client.post("/api/auth/login", json={"email": member.email, "password": "Password123!"})
    leader_headers = {"Authorization": f"Bearer {leader_login.get_json()['data']['access_token']}"}
    member_headers = {"Authorization": f"Bearer {member_login.get_json()['data']['access_token']}"}

    profile = client.get("/api/users/me/profile", headers=leader_headers)
    assert profile.status_code == 200
    assert profile.get_json()["data"]["email"] == leader.email

    team_response = client.post(
        "/api/registrations/team",
        json={"event_id": str(event.id), "name": "Code Makers", "member_ids": []},
        headers=leader_headers,
    )
    assert team_response.status_code == 201
    assert team_response.get_json()["data"]["registration_status"] == "approved"
    team_code = team_response.get_json()["data"]["team_code"]
    assert team_code.startswith("SC-")

    joined = client.post(
        "/api/registrations/team/join",
        json={"team_code": team_code},
        headers=member_headers,
    )
    assert joined.status_code == 201
    joined_data = joined.get_json()["data"]
    assert joined_data["team_code"] == team_code
    assert joined_data["team_role"] == "member"

    from app.attendance.service import AttendanceService

    qr_token = AttendanceService().generate_qr(event_id=event.id, user_id=member.id)
    checked_in = client.post(
        "/api/attendance/qr/check-in",
        json={"token": qr_token.token},
        headers=member_headers,
    )
    assert checked_in.status_code == 200
    assert checked_in.get_json()["data"]["method"] == "qr"

    repeated = client.post(
        "/api/attendance/qr/check-in",
        json={"token": qr_token.token},
        headers=member_headers,
    )
    assert repeated.status_code == 422


def test_registration_reuses_cancelled_or_rejected_records(app_ctx):
    role = _role("student", ["registrations.create", "events.view"])
    student = _user("retry.student@example.com", role)
    team_student = _user("retry.team@example.com", role)
    db.session.add_all(
        [
            StudentProfile(id=student.id, year_level=1, profile_completed=True),
            StudentProfile(id=team_student.id, year_level=1, profile_completed=True),
        ]
    )
    solo_event = Event(
        title="Retry solo event",
        organizer_id=student.id,
        status="approved",
        start_time=utcnow() + timedelta(days=7),
        end_time=utcnow() + timedelta(days=7, hours=2),
        registration_deadline=utcnow() + timedelta(days=3),
        is_team_event=False,
        approval_required=False,
        created_by=student.id,
        updated_by=student.id,
    )
    team_event = Event(
        title="Retry team event",
        organizer_id=student.id,
        status="approved",
        start_time=utcnow() + timedelta(days=10),
        end_time=utcnow() + timedelta(days=10, hours=2),
        registration_deadline=utcnow() + timedelta(days=4),
        is_team_event=True,
        max_team_size=4,
        approval_required=False,
        created_by=student.id,
        updated_by=student.id,
    )
    db.session.add_all([solo_event, team_event])
    db.session.flush()
    cancelled = Registration(event_id=solo_event.id, user_id=student.id, status="cancelled")
    rejected = Registration(event_id=team_event.id, user_id=team_student.id, status="rejected")
    db.session.add_all([cancelled, rejected])
    db.session.commit()

    service = RegistrationService()
    retried = service.register(event_id=solo_event.id, user_id=student.id, notes="Trying again")
    assert retried.id == cancelled.id
    assert retried.status == "approved"
    assert retried.notes == "Trying again"

    team = service.register_team(
        event_id=team_event.id,
        leader_id=team_student.id,
        name="Retry Team",
        member_ids=[],
    )
    db.session.refresh(rejected)
    assert rejected.team_id == team.id
    assert rejected.status == "approved"


def test_full_event_waitlist_reuses_existing_rows_and_notifies(app_ctx):
    role = _role("student", ["registrations.create", "events.view"])
    registered_student = _user("capacity.registered@example.com", role)
    waitlisted_student = _user("capacity.waitlisted@example.com", role)
    db.session.add_all(
        [
            StudentProfile(id=registered_student.id, year_level=1, profile_completed=True),
            StudentProfile(id=waitlisted_student.id, year_level=1, profile_completed=True),
        ]
    )
    event = Event(
        title="Capacity test event",
        organizer_id=registered_student.id,
        status="approved",
        start_time=utcnow() + timedelta(days=20),
        end_time=utcnow() + timedelta(days=20, hours=2),
        registration_deadline=utcnow() + timedelta(days=10),
        capacity=1,
        is_team_event=False,
        approval_required=False,
        created_by=registered_student.id,
        updated_by=registered_student.id,
    )
    db.session.add(event)
    db.session.commit()

    service = RegistrationService()
    service.register(event_id=event.id, user_id=registered_student.id)
    first_waitlist = service.register(event_id=event.id, user_id=waitlisted_student.id)
    waitlist_entry = db.session.scalar(
        db.select(Waitlist).where(
            Waitlist.event_id == event.id,
            Waitlist.user_id == waitlisted_student.id,
        )
    )
    assert first_waitlist.status == "waitlisted"
    assert waitlist_entry is not None

    first_waitlist.status = "cancelled"
    waitlist_entry.promoted = True
    db.session.commit()
    retried = service.register(event_id=event.id, user_id=waitlisted_student.id)

    assert retried.id == first_waitlist.id
    assert retried.status == "waitlisted"
    assert db.session.scalar(
        db.select(db.func.count(Waitlist.id)).where(
            Waitlist.event_id == event.id,
            Waitlist.user_id == waitlisted_student.id,
        )
    ) == 1
    assert db.session.scalar(
        db.select(db.func.count(Notification.id)).where(
            Notification.user_id == waitlisted_student.id,
            Notification.entity_id == event.id,
        )
    ) == 2


def test_team_registration_is_teams_only_capacity_aware_and_atomic(app_ctx):
    role = _role("student", ["registrations.create", "events.view"])
    leader = _user("team.capacity.leader@example.com", role)
    member = _user("team.capacity.member@example.com", role)
    other_leader = _user("team.capacity.other@example.com", role)
    db.session.add_all(
        [
            StudentProfile(id=leader.id, year_level=1, profile_completed=True),
            StudentProfile(id=member.id, year_level=1, profile_completed=True),
            StudentProfile(id=other_leader.id, year_level=1, profile_completed=True),
        ]
    )
    event = Event(
        title="Capacity team event",
        organizer_id=leader.id,
        status="approved",
        start_time=utcnow() + timedelta(days=30),
        end_time=utcnow() + timedelta(days=30, hours=2),
        registration_deadline=utcnow() + timedelta(days=15),
        capacity=1,
        is_team_event=True,
        max_team_size=3,
        approval_required=False,
        created_by=leader.id,
        updated_by=leader.id,
    )
    db.session.add(event)
    db.session.commit()
    service = RegistrationService()

    with pytest.raises(ValidationError, match="team event"):
        service.register(event_id=event.id, user_id=leader.id)

    team = service.register_team(event_id=event.id, leader_id=leader.id, name="Alpha", member_ids=[])
    joined = service.join_team_by_code(team_code=team.team_code, user_id=member.id)
    assert joined.status == "waitlisted"
    assert joined.team_id == team.id
    assert db.session.scalar(
        db.select(Waitlist).where(
            Waitlist.event_id == event.id,
            Waitlist.user_id == member.id,
        )
    ) is not None

    team_count = db.session.scalar(db.select(db.func.count(Team.id)))
    with pytest.raises(ConflictError, match="team name"):
        service.register_team(event_id=event.id, leader_id=other_leader.id, name="alpha", member_ids=[])
    assert db.session.scalar(db.select(db.func.count(Team.id))) == team_count

    joined.status = "cancelled"
    db.session.commit()
    replacement = service.register_team(
        event_id=event.id,
        leader_id=member.id,
        name="Beta",
        member_ids=[],
    )
    assert replacement.id != team.id
    assert db.session.scalar(
        db.select(db.func.count(TeamMember.id)).where(
            TeamMember.team_id == team.id,
            TeamMember.user_id == member.id,
        )
    ) == 0
    replacement_registration = service.registrations.get_for_user_event(member.id, event.id)
    assert replacement_registration is not None
    assert replacement_registration.team_id == replacement.id
    assert replacement_registration.status == "waitlisted"


def test_event_wide_qr_is_reusable_until_expiry(app_ctx):
    professor_role = _role(
        "teacher",
        ["events.view", "attendance.manage", "attendance.view"],
    )
    student_role = _role(
        "student",
        ["registrations.create", "events.view", "attendance.checkin"],
    )
    professor = _user("qr.professor@example.com", professor_role)
    student_one = _user("qr.student.one@example.com", student_role)
    student_two = _user("qr.student.two@example.com", student_role)
    outsider = _user("qr.outsider@example.com", student_role)
    db.session.add_all(
        [
            StudentProfile(id=student_one.id, year_level=1, profile_completed=True),
            StudentProfile(id=student_two.id, year_level=1, profile_completed=True),
            StudentProfile(id=outsider.id, year_level=1, profile_completed=True),
        ]
    )
    event = Event(
        title="Reusable QR event",
        organizer_id=professor.id,
        status="approved",
        start_time=utcnow() + timedelta(days=1),
        end_time=utcnow() + timedelta(days=1, hours=2),
        registration_deadline=utcnow() + timedelta(hours=12),
        is_team_event=False,
        approval_required=False,
        created_by=professor.id,
        updated_by=professor.id,
    )
    db.session.add(event)
    db.session.commit()

    service = RegistrationService()
    service.register(event_id=event.id, user_id=student_one.id)
    service.register(event_id=event.id, user_id=student_two.id)
    db.session.commit()

    client = app_ctx.test_client()
    professor_login = client.post("/api/auth/login", json={"email": professor.email, "password": "Password123!"})
    student_one_login = client.post("/api/auth/login", json={"email": student_one.email, "password": "Password123!"})
    student_two_login = client.post("/api/auth/login", json={"email": student_two.email, "password": "Password123!"})
    outsider_login = client.post("/api/auth/login", json={"email": outsider.email, "password": "Password123!"})
    professor_headers = {"Authorization": f"Bearer {professor_login.get_json()['data']['access_token']}"}
    student_one_headers = {"Authorization": f"Bearer {student_one_login.get_json()['data']['access_token']}"}
    student_two_headers = {"Authorization": f"Bearer {student_two_login.get_json()['data']['access_token']}"}
    outsider_headers = {"Authorization": f"Bearer {outsider_login.get_json()['data']['access_token']}"}

    generated = client.post(
        "/api/attendance/qr/generate",
        json={"event_id": str(event.id), "ttl_minutes": 30},
        headers=professor_headers,
    )
    assert generated.status_code == 201
    token_data = generated.get_json()["data"]
    assert token_data["user_id"] is None
    assert token_data["qr_data_url"].startswith("data:image/png;base64,")

    first_check_in = client.post(
        "/api/attendance/qr/check-in",
        json={"token": token_data["token"]},
        headers=student_one_headers,
    )
    assert first_check_in.status_code == 200
    assert first_check_in.get_json()["data"]["user_id"] == str(student_one.id)

    duplicate_check_in = client.post(
        "/api/attendance/qr/check-in",
        json={"token": token_data["token"]},
        headers=student_one_headers,
    )
    assert duplicate_check_in.status_code == 200
    assert duplicate_check_in.get_json()["data"]["id"] == first_check_in.get_json()["data"]["id"]

    second_check_in = client.post(
        "/api/attendance/qr/check-in",
        json={"token": token_data["token"]},
        headers=student_two_headers,
    )
    assert second_check_in.status_code == 200
    assert second_check_in.get_json()["data"]["user_id"] == str(student_two.id)

    unregistered = client.post(
        "/api/attendance/qr/check-in",
        json={"token": token_data["token"]},
        headers=outsider_headers,
    )
    assert unregistered.status_code == 422

    expired = QrToken(
        event_id=event.id,
        user_id=None,
        token="expired-event-wide-token",
        expires_at=utcnow() - timedelta(minutes=1),
    )
    db.session.add(expired)
    db.session.commit()
    expired_response = client.post(
        "/api/attendance/qr/check-in",
        json={"token": expired.token},
        headers=student_two_headers,
    )
    assert expired_response.status_code == 422


def test_professor_http_event_attendance_and_announcement_workflows(app_ctx):
    professor_role = _role(
        "teacher",
        [
            "announcements.view",
            "announcements.create",
            "announcements.update",
            "announcements.delete",
            "events.view",
            "events.create",
            "events.update",
            "events.delete",
            "registrations.view",
            "registrations.approve",
            "registrations.manage",
            "attendance.view",
            "attendance.manage",
            "attendance.scan",
            "attendance.checkin",
            "reports.view",
        ],
    )
    student_role = _role(
        "student",
        ["registrations.create", "events.view", "attendance.checkin"],
    )
    professor = _user("professor@example.com", professor_role)
    student = _user("professor.student@example.com", student_role)
    db.session.add(StudentProfile(id=student.id, year_level=1, profile_completed=True))
    db.session.commit()

    client = app_ctx.test_client()
    login = client.post("/api/auth/login", json={"email": professor.email, "password": "Password123!"})
    student_login = client.post("/api/auth/login", json={"email": student.email, "password": "Password123!"})
    professor_headers = {"Authorization": f"Bearer {login.get_json()['data']['access_token']}"}
    student_headers = {"Authorization": f"Bearer {student_login.get_json()['data']['access_token']}"}

    created = client.post(
        "/api/events",
        json={
            "title": "Professor proposal",
            "description": "Submitted for admin review",
            "start_time": (utcnow() + timedelta(days=10)).isoformat(),
            "end_time": (utcnow() + timedelta(days=10, hours=2)).isoformat(),
            "location": "Auditorium",
            "is_team_event": False,
        },
        headers=professor_headers,
    )
    assert created.status_code == 201
    assert created.get_json()["data"]["status"] == "approved"
    created_event_id = created.get_json()["data"]["id"]

    archived_event = client.post(
        f"/api/events/{created_event_id}/status",
        json={"status": "archived"},
        headers=professor_headers,
    )
    assert archived_event.status_code == 200
    assert archived_event.get_json()["data"]["status"] == "archived"

    event = Event(
        title="Professor approved event",
        organizer_id=professor.id,
        status="approved",
        start_time=utcnow() + timedelta(days=3),
        end_time=utcnow() + timedelta(days=3, hours=2),
        registration_deadline=utcnow() + timedelta(days=2),
        is_team_event=False,
        approval_required=True,
        capacity=20,
        created_by=professor.id,
        updated_by=professor.id,
    )
    db.session.add(event)
    db.session.commit()

    own_events = client.get(f"/api/events?organizer_id={professor.id}", headers=professor_headers)
    assert own_events.status_code == 200
    assert any(item["id"] == str(event.id) for item in own_events.get_json()["data"])

    registration = client.post(
        "/api/registrations",
        json={"event_id": str(event.id)},
        headers=student_headers,
    )
    assert registration.status_code == 201
    registration_id = registration.get_json()["data"]["id"]

    decided = client.post(
        f"/api/registrations/{registration_id}/decide",
        json={"decision": "approved"},
        headers=professor_headers,
    )
    assert decided.status_code == 200
    assert decided.get_json()["data"]["status"] == "approved"

    qr = client.post(
        "/api/attendance/qr/generate",
        json={"event_id": str(event.id)},
        headers=professor_headers,
    )
    assert qr.status_code == 201
    assert qr.get_json()["data"]["token"]

    marked = client.post(
        "/api/attendance/mark",
        json={"event_id": str(event.id), "user_id": str(student.id), "status": "present"},
        headers=professor_headers,
    )
    assert marked.status_code == 200
    assert marked.get_json()["data"]["status"] == "present"

    announcement = client.post(
        "/api/announcements",
        json={
            "title": "Professor bulletin",
            "body": "Please attend the review session.",
            "priority": "normal",
        },
        headers=professor_headers,
    )
    assert announcement.status_code == 201
    assert announcement.get_json()["data"]["status"] == "published"
    created_announcement_id = announcement.get_json()["data"]["id"]

    archived_announcement = client.post(
        f"/api/announcements/{created_announcement_id}/archive",
        headers=professor_headers,
    )
    assert archived_announcement.status_code == 403
    assert db.session.get(Announcement, uuid.UUID(created_announcement_id)).status == "published"


def test_admin_created_announcement_is_published_immediately(app_ctx):
    admin_role = _role(
        "admin",
        ["announcements.create", "announcements.view", "announcements.update"],
    )
    admin = _user("announcement.admin@example.com", admin_role)
    client = app_ctx.test_client()
    login = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {login.get_json()['data']['access_token']}"}

    response = client.post(
        "/api/announcements",
        json={
            "title": "Campus reminder",
            "body": "Bring your school ID for campus services.",
            "priority": "normal",
        },
        headers=headers,
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["status"] == "published"
    assert data["published_at"] is not None
    stored = db.session.get(Announcement, uuid.UUID(data["id"]))
    assert stored is not None
    assert stored.status == "published"


def test_social_feed_includes_events_and_announcement_attachments(app_ctx):
    role = _role(
        "admin",
        ["announcements.create", "announcements.update", "announcements.view", "events.view"],
    )
    admin = _user("feed.admin@example.com", role)
    announcement = Announcement(
        title="Social post",
        body="This post has files.",
        author_id=admin.id,
        status="published",
        priority="normal",
        created_by=admin.id,
        updated_by=admin.id,
    )
    event = Event(
        title="Feed event",
        organizer_id=admin.id,
        status="approved",
        start_time=utcnow() + timedelta(days=2),
        end_time=utcnow() + timedelta(days=2, hours=2),
        is_team_event=False,
        approval_required=False,
        created_by=admin.id,
        updated_by=admin.id,
    )
    db.session.add_all([announcement, event])
    db.session.commit()

    client = app_ctx.test_client()
    login = client.post("/api/auth/login", json={"email": admin.email, "password": "Password123!"})
    headers = {"Authorization": f"Bearer {login.get_json()['data']['access_token']}"}

    uploaded = client.post(
        "/api/uploads",
        data={
            "entity_type": "announcement",
            "entity_id": str(announcement.id),
            "file": (io.BytesIO(b"\x89PNG\r\n\x1a\nimage bytes"), "post.png"),
        },
        content_type="multipart/form-data",
        headers=headers,
    )
    assert uploaded.status_code == 201

    feed = client.get("/api/feed", headers=headers)
    assert feed.status_code == 200
    feed_items = feed.get_json()["data"]
    post = next(item for item in feed_items if item["id"] == str(announcement.id))
    assert post["type"] == "announcement"
    assert post["attachments"][0]["original_name"] == "post.png"
    assert post["banner_url"].endswith(".png")
    assert any(item["type"] == "event" and item["id"] == str(event.id) for item in feed_items)

    announcement_response = client.get(f"/api/announcements/{announcement.id}", headers=headers)
    assert announcement_response.status_code == 200
    assert announcement_response.get_json()["data"]["attachments"][0]["original_name"] == "post.png"

    denied = client.post(
        "/api/uploads",
        data={
            "entity_type": "announcement",
            "entity_id": str(announcement.id),
            "file": (io.BytesIO(b"bad"), "script.exe"),
        },
        content_type="multipart/form-data",
        headers=headers,
    )
    assert denied.status_code == 422

    filename = uploaded.get_json()["data"]["filename"]
    unauthenticated_download = client.get(f"/api/uploads/{filename}")
    assert unauthenticated_download.status_code == 401


def test_student_cannot_manage_accounts_and_suspension_invalidates_sessions(app_ctx):
    from app.permissions.constants import DEFAULT_ROLE_PERMISSIONS

    assert "users.update" not in DEFAULT_ROLE_PERMISSIONS["student"]
    admin_role = _role("admin", ["users.update", "users.view"])
    student_role = _role("student", ["users.view"])
    admin = _user("security.admin@example.com", admin_role)
    student = _user("security.student@example.com", student_role)
    target = _user("security.target@example.com", student_role)
    db.session.commit()

    client = app_ctx.test_client()
    student_login = client.post(
        "/api/auth/login",
        json={"email": student.email, "password": "Password123!"},
    ).get_json()["data"]
    student_headers = {"Authorization": f"Bearer {student_login['access_token']}"}
    tamper = client.patch(
        f"/api/users/{target.id}",
        json={"first_name": "Changed"},
        headers=student_headers,
    )
    assert tamper.status_code == 403

    admin_login = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": "Password123!"},
    ).get_json()["data"]
    suspended = client.post(
        f"/api/users/{student.id}/suspend",
        headers={"Authorization": f"Bearer {admin_login['access_token']}"},
    )
    assert suspended.status_code == 200
    assert client.get("/api/auth/me", headers=student_headers).status_code == 401
    assert client.post(
        "/api/auth/refresh", json={"refresh_token": student_login["refresh_token"]}
    ).status_code == 401


def test_officer_cannot_manage_an_unassigned_event(app_ctx):
    organizer_role = _role("teacher", [])
    officer_role = _role(
        "student_council",
        ["events.view", "registrations.view", "registrations.manage", "attendance.view", "attendance.manage"],
    )
    student_role = _role("student", [])
    organizer = _user("scope.organizer@example.com", organizer_role)
    officer = _user("scope.officer@example.com", officer_role)
    student = _user("scope.student@example.com", student_role)
    event = Event(
        title="Organizer-only event",
        organizer_id=organizer.id,
        status="approved",
        start_time=utcnow() + timedelta(days=2),
        end_time=utcnow() + timedelta(days=2, hours=1),
        is_team_event=False,
        created_by=organizer.id,
        updated_by=organizer.id,
    )
    db.session.add(event)
    db.session.flush()
    registration = Registration(event_id=event.id, user_id=student.id, status="pending")
    db.session.add(registration)
    db.session.commit()

    client = app_ctx.test_client()
    login = client.post(
        "/api/auth/login",
        json={"email": officer.email, "password": "Password123!"},
    ).get_json()["data"]
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    decision = client.post(
        f"/api/registrations/{registration.id}/decide",
        json={"decision": "approved"},
        headers=headers,
    )
    attendance = client.get(f"/api/attendance/event/{event.id}", headers=headers)
    assert decision.status_code == 403
    assert attendance.status_code == 403


def test_removed_auth_workflows_and_invalid_uuid_are_client_errors(app_ctx):
    role = _role("admin", ["users.view"])
    admin = _user("validation.admin@example.com", role)
    db.session.commit()
    client = app_ctx.test_client()

    assert client.post("/api/auth/register", json={}).status_code == 403
    assert client.post("/api/auth/forgot-password", json={}).status_code == 404
    assert client.post("/api/auth/reset-password", json={}).status_code == 404
    assert client.post("/api/auth/verify-email", json={}).status_code == 404
    assert client.post("/api/auth/oauth/google", json={}).status_code == 404

    login = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": "Password123!"},
    ).get_json()["data"]
    invalid = client.get(
        "/api/users/not-a-uuid",
        headers={"Authorization": f"Bearer {login['access_token']}"},
    )
    assert invalid.status_code == 422
    assert invalid.get_json()["error_code"] == "validation_error"
