from __future__ import annotations

import io
from datetime import timedelta

import pytest

from app.app import create_app
from app.announcements.model import Announcement
from app.attendance.model import QrToken
from app.auth.model import User
from app.auth.service import AuthService
from app.events.model import Event, EventRequirement
from app.events.service import EventService
from app.extensions import db
from app.permissions.model import Permission, Role, RolePermission, UserRole
from app.registrations.service import RegistrationService
from app.users.model import StudentProfile
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


def test_admin_login_and_approval_decisions(app_ctx):
    admin_role = _role("admin", ["announcements.approve", "events.approve"])
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
        title="Pending announcement",
        body="Needs review",
        author_id=officer.id,
        status="pending_approval",
        priority="normal",
        created_by=officer.id,
        updated_by=officer.id,
    )
    event = Event(
        title="Pending event",
        organizer_id=officer.id,
        status="pending_approval",
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
    returned = app_ctx.test_client().post(
        f"/api/events/{event.id}/approve",
        json={"decision": "returned", "comment": "Revise schedule."},
        headers=headers,
    )
    assert returned.status_code == 200
    assert returned.get_json()["data"]["status"] == "returned"

    approved = app_ctx.test_client().post(
        f"/api/announcements/{announcement.id}/approve",
        json={"decision": "approved"},
        headers=headers,
    )
    assert approved.status_code == 200
    assert approved.get_json()["data"]["status"] == "published"


def test_registration_eligibility_conflict_team_join_and_attendance(app_ctx):
    role = _role(
        "student",
        ["registrations.create", "events.view", "attendance.checkin"],
    )
    student = _user("student@example.com", role)
    teammate = _user("teammate@example.com", role)
    db.session.add_all(
        [
            StudentProfile(id=student.id, year_level=3),
            StudentProfile(id=teammate.id, year_level=3),
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
    db.session.add_all([StudentProfile(id=leader.id, year_level=2), StudentProfile(id=member.id, year_level=2)])
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
            StudentProfile(id=student_one.id, year_level=1),
            StudentProfile(id=student_two.id, year_level=1),
            StudentProfile(id=outsider.id, year_level=1),
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
    db.session.add(StudentProfile(id=student.id, year_level=1))
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
            "submit_for_approval": True,
        },
        headers=professor_headers,
    )
    assert created.status_code == 201
    assert created.get_json()["data"]["status"] == "pending_approval"

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
            "submit_for_approval": True,
        },
        headers=professor_headers,
    )
    assert announcement.status_code == 201
    assert announcement.get_json()["data"]["status"] == "pending_approval"


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
            "file": (io.BytesIO(b"fake image bytes"), "post.png"),
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
