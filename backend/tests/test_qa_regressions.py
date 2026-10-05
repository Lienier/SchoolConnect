"""Regressions for the October UI assessment and security findings."""
import io
import uuid
from datetime import timedelta

import pytest

from test_admin_mvp_workflows import app_ctx, _role, _user
from app.auth.model import RefreshToken
from app.auth.service import AuthService
from app.extensions import db
from app.announcements.model import Announcement
from app.events.model import Event
from app.attendance.service import AttendanceService
from app.registrations.model import Registration
from app.reports.service import ReportService
from app.users.model import Department, StudentProfile
from app.utils.datetime import utcnow


def headers(user):
    access, refresh = AuthService().issue_tokens(user)
    return {"Authorization": f"Bearer {access}"}, refresh


@pytest.mark.parametrize("action", ["logout", "password", "refresh", "expired"])
def test_access_session_revocation_and_refresh(app_ctx, action):
    user = _user("session@example.com", _role("student", []))
    db.session.commit()
    client = app_ctx.test_client()
    auth, refresh = headers(user)
    assert client.get("/api/auth/me", headers=auth).status_code == 200
    if action == "logout":
        assert client.post("/api/auth/logout", json={}, headers=auth).status_code == 200
    elif action == "password":
        assert client.post("/api/auth/change-password", headers=auth, json={"current_password": "Password123!", "new_password": "NewPassword456!"}).status_code == 200
    elif action == "expired":
        row = db.session.scalar(db.select(RefreshToken).where(RefreshToken.token_hash == AuthService._sha256(refresh)))
        row.expires_at = utcnow() - timedelta(seconds=1)
        db.session.commit()
    else:
        result = client.post("/api/auth/refresh", json={"refresh_token": refresh})
        assert result.status_code == 200
        new_auth = {"Authorization": "Bearer " + result.json["data"]["access_token"]}
        assert client.get("/api/auth/me", headers=new_auth).status_code == 200
        assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401
    assert client.get("/api/auth/me", headers=auth).status_code == 401
    if action != "refresh":
        assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401


@pytest.mark.parametrize("storage", ["local", "cloudinary"])
def test_announcement_attachments_enforce_parent_visibility(app_ctx, tmp_path, storage, monkeypatch):
    teacher = _user("teacher@example.com", _role("teacher", ["announcements.create", "announcements.view"]))
    student = _user("student@example.com", _role("student", ["announcements.view"]))
    officer = _user("officer@example.com", _role("student_council", ["announcements.view"]))
    notice = Announcement(title="Restricted", body="Students only", status="published", author_id=teacher.id, target_audience=["student"])
    db.session.add(notice); db.session.commit()
    app_ctx.config["UPLOAD_FOLDER"] = str(tmp_path)
    client = app_ctx.test_client()
    teacher_auth, _ = headers(teacher)
    upload = client.post("/api/uploads", headers=teacher_auth, data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\nsynthetic"), "fixture.png"), "entity_type": "announcement", "entity_id": str(notice.id)})
    assert upload.status_code == 201
    path = upload.json["data"]["url"]
    if storage == "cloudinary":
        from app.announcements.model import UploadedFile
        from app.uploads.service import UploadService
        record = db.session.get(UploadedFile, uuid.UUID(upload.json["data"]["id"]))
        record.storage_backend = "cloudinary"
        record.storage_path = '{"public_id":"qa/private","format":"png","resource_type":"image"}'
        db.session.commit()
        monkeypatch.setattr(UploadService, "cloudinary_download_url", staticmethod(lambda record: "https://example.invalid/signed"))
    officer_auth, _ = headers(officer)
    student_auth, _ = headers(student)
    assert client.get(path, headers=officer_auth).status_code == 404
    assert client.get(path, headers=student_auth).status_code == (302 if storage == "cloudinary" else 200)
    assert client.get(path).status_code == 401
    notice.soft_delete(); db.session.commit()
    assert client.get(path, headers=student_auth).status_code == 404


def test_feed_filters_before_limit_and_caps_merged_results(app_ctx):
    teacher = _user("feed@example.com", _role("teacher", []))
    db.session.flush()
    public = Announcement(title="Visible older notice", body="Public", status="published", author_id=teacher.id, target_audience=["all"], created_at=utcnow() - timedelta(days=1))
    db.session.add(public)
    for index in range(15):
        db.session.add(Announcement(title=f"Hidden {index}", body="Private", status="published", author_id=teacher.id, target_audience=["student"]))
    for index in range(4):
        db.session.add(Event(title=f"Public event {index}", organizer_id=teacher.id, start_time=utcnow()+timedelta(days=2), end_time=utcnow()+timedelta(days=2, hours=1), status="approved"))
    db.session.commit()
    client = app_ctx.test_client()
    assert [row["title"] for row in client.get("/api/feed?kind=announcements&limit=3").json["data"]] == [public.title]
    assert len(client.get("/api/feed?kind=all&limit=3").json["data"]) == 3


def test_reports_follow_checkins_and_corrections(app_ctx):
    teacher = _user("reports.teacher@example.com", _role("teacher", []))
    student = _user("reports.student@example.com", _role("student", []))
    department = Department(name="QA Department", code="QA")
    db.session.add(department); db.session.flush()
    db.session.add(StudentProfile(id=student.id, student_number="QA-1", department_id=department.id))
    event = Event(title="Live", organizer_id=teacher.id, start_time=utcnow(), end_time=utcnow()+timedelta(hours=2), status="ongoing")
    future = Event(title="Upcoming", organizer_id=teacher.id, start_time=utcnow()+timedelta(days=1), end_time=utcnow()+timedelta(days=1,hours=2), status="approved")
    db.session.add_all([event, future]); db.session.flush()
    db.session.add_all([Registration(event_id=event.id, user_id=student.id, status="approved"), Registration(event_id=future.id, user_id=student.id, status="approved")]); db.session.commit()
    service = AttendanceService()
    for status, percent in [("present", 100), ("absent", 0), ("late", 100), ("excused", 0)]:
        service.mark(event_id=event.id, user_id=student.id, status=status, actor_id=teacher.id)
        report = ReportService()
        assert report.attendance_percentage(event.id)["attendance_percentage"] == percent
        department_report = report.department_attendance_summary()[0]
        assert department_report["total"] == 1
        assert department_report["percentage"] == percent


def test_event_settings_timezone_updates_and_management_scope(app_ctx):
    teacher = _user("events.teacher@example.com", _role("teacher", ["events.create", "events.view", "events.update"]))
    officer = _user("events.officer@example.com", _role("student_council", ["events.view"]))
    db.session.commit()
    auth, _ = headers(teacher)
    client = app_ctx.test_client()
    start = utcnow() + timedelta(days=5)
    response = client.post("/api/events", headers=auth, json={"title": "Settings", "start_time": start.isoformat(), "end_time": (start+timedelta(hours=2)).isoformat(), "registration_deadline": (start-timedelta(hours=1)).isoformat(), "approval_required": False})
    assert response.status_code == 201
    event = response.json["data"]
    assert event["approval_required"] is False
    assert event["start_time"].endswith("+00:00")
    assert client.patch(f"/api/events/{event['id']}", headers=auth, json={"title": "Updated", "registration_deadline": None}).status_code == 200
    officer_auth, _ = headers(officer)
    assert client.get("/api/events?managed=true", headers=officer_auth).json["data"] == []
    assert len(client.get("/api/events?managed=true", headers=auth).json["data"]) == 1


def test_registration_status_filter_includes_later_records(app_ctx):
    student = _user("pagination@example.com", _role("student", []))
    for index in range(25):
        event = Event(title=f"Event {index}", organizer_id=student.id, start_time=utcnow()+timedelta(days=2), end_time=utcnow()+timedelta(days=2,hours=1), status="approved")
        db.session.add(event); db.session.flush()
        db.session.add(Registration(event_id=event.id, user_id=student.id, status="pending" if index == 0 else "approved"))
    db.session.commit()
    auth, _ = headers(student)
    result = app_ctx.test_client().get("/api/registrations/mine?status=pending", headers=auth)
    assert result.status_code == 200
    assert len(result.json["data"]) == 1
    assert result.json["data"][0]["event_title"] == "Event 0"


@pytest.mark.parametrize("action", ["logout", "refresh", "password"])
def test_revoked_session_disconnects_realtime(app_ctx, action):
    from app.extensions import socketio
    user = _user("socket@example.com", _role("student", []))
    db.session.commit()
    auth, refresh = headers(user)
    token = auth["Authorization"].split(" ", 1)[1]
    live = socketio.test_client(app_ctx, auth={"token": token})
    assert live.is_connected()
    client = app_ctx.test_client()
    if action == "logout":
        result = client.post("/api/auth/logout", headers=auth, json={})
    elif action == "refresh":
        result = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    else:
        result = client.post("/api/auth/change-password", headers=auth, json={"current_password": "Password123!", "new_password": "NewPassword456!"})
    assert result.status_code == 200
    assert not live.is_connected()
    assert not socketio.test_client(app_ctx, auth={"token": token}).is_connected()


def test_cloudinary_uploads_are_authenticated_and_urls_are_local(app_ctx, monkeypatch):
    import json
    import cloudinary.uploader
    from werkzeug.datastructures import FileStorage
    from app.uploads.service import UploadService
    from app.announcements.model import UploadedFile
    app_ctx.config.update(CLOUDINARY_CLOUD_NAME="qa", CLOUDINARY_API_KEY="qa", CLOUDINARY_API_SECRET="qa")
    calls = []
    def fake_upload(file, **options):
        calls.append(options)
        return {"secure_url": "https://example.invalid/private.png", "public_id": "qa/private", "resource_type": "image", "format": "png"}
    monkeypatch.setattr(cloudinary.uploader, "upload", fake_upload)
    path, url, size = UploadService._store_cloudinary(FileStorage(stream=io.BytesIO(b"synthetic"), filename="fixture.png"), "fixture.png")
    assert calls[0]["type"] == "authenticated"
    assert json.loads(path)["public_id"] == "qa/private"
    assert url == "/api/uploads/fixture.png"
    assert size > 0
    record = UploadedFile(filename="fixture.png", storage_path="https://example.invalid/public.png", url="https://example.invalid/public.png")
    assert UploadService.to_dict(record)["url"] == "/api/uploads/fixture.png"
