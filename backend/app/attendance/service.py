"""Business logic for the attendance module.

Supports manual marking, QR token generation and QR-based check-in. Every
action is mirrored to the append-only attendance log.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import timedelta, timezone

from app.attendance.model import Attendance, AttendanceLog, QrToken
from app.attendance.repository import (
    AttendanceLogRepository,
    AttendanceRepository,
    QrTokenRepository,
)
from app.common.exceptions import NotFoundError, ValidationError
from app.events.repository import EventRepository
from app.extensions import db
from app.registrations.model import Registration
from app.utils.datetime import utcnow

_VALID_STATUSES = {"present", "absent", "excused", "late"}


class AttendanceService:
    """Coordinates attendance recording and QR check-in."""

    def __init__(self) -> None:
        self.attendance = AttendanceRepository()
        self.logs = AttendanceLogRepository()
        self.qr = QrTokenRepository()
        self.events = EventRepository()

    def _get_event(self, event_id: uuid.UUID):
        event = self.events.get_by_id(event_id)
        if event is None:
            raise NotFoundError("Event not found.")
        return event

    def _record_log(self, *, attendance_id, event_id, user_id, action, method, actor_id):
        self.logs.add(
            AttendanceLog(
                attendance_id=attendance_id,
                event_id=event_id,
                user_id=user_id,
                action=action,
                method=method,
                actor_id=actor_id,
            )
        )

    # --- manual marking ---------------------------------------------------
    def mark(
        self,
        *,
        event_id: uuid.UUID,
        user_id: uuid.UUID,
        status: str,
        actor_id: uuid.UUID,
        method: str = "manual",
    ) -> Attendance:
        if status not in _VALID_STATUSES:
            raise ValidationError("Invalid attendance status.")
        self._get_event(event_id)

        record = self.attendance.get_for_user_event(user_id, event_id)
        registration = db.session.scalar(
            db.select(Registration).where(
                Registration.event_id == event_id,
                Registration.user_id == user_id,
                Registration.deleted_at.is_(None),
            )
        )
        if registration is None:
            raise ValidationError("Participant is not registered for this event.")
        if registration.status not in {"approved", "attended", "absent"}:
            raise ValidationError("Only approved participants can be marked for attendance.")
        now = utcnow()
        if record is None:
            record = Attendance(
                event_id=event_id,
                user_id=user_id,
                registration_id=registration.id,
                status=status,
                method=method,
                recorded_by=actor_id,
                check_in_at=now if status in {"present", "late"} else None,
            )
            self.attendance.add(record)
            self.attendance.commit()
        else:
            record.status = status
            record.method = method
            record.recorded_by = actor_id
            if status in {"present", "late"} and record.check_in_at is None:
                record.check_in_at = now
            self.attendance.commit()

        self._record_log(
            attendance_id=record.id,
            event_id=event_id,
            user_id=user_id,
            action=f"marked_{status}",
            method=method,
            actor_id=actor_id,
        )
        self.attendance.commit()
        return record

    # --- QR ---------------------------------------------------------------
    def generate_qr(
        self, *, event_id: uuid.UUID, user_id: uuid.UUID | None, ttl_minutes: int = 15
    ) -> QrToken:
        self._get_event(event_id)
        token = QrToken(
            event_id=event_id,
            user_id=user_id,
            token=secrets.token_urlsafe(32)[:64],
            expires_at=utcnow() + timedelta(minutes=ttl_minutes),
        )
        self.qr.add(token)
        self.qr.commit()
        return token

    def check_in_via_qr(self, *, token: str, actor_id: uuid.UUID) -> Attendance:
        qr = self.qr.get_by_token(token)
        if qr is None:
            raise NotFoundError("Invalid QR token.")
        if qr.user_id is not None and qr.used:
            raise ValidationError("This QR token has already been used.")
        if utcnow() > _as_aware_utc(qr.expires_at):
            raise ValidationError("This QR token has expired.")

        target_user = qr.user_id or actor_id
        record = self.mark(
            event_id=qr.event_id,
            user_id=target_user,
            status="present",
            actor_id=actor_id,
            method="qr",
        )
        if qr.user_id is not None:
            qr.used = True
            qr.used_at = utcnow()
            self.qr.commit()
        return record

    # --- read -------------------------------------------------------------
    def list_for_event(self, event_id: uuid.UUID):
        return self.attendance.list_for_event(event_id)

    def summary(self, event_id: uuid.UUID) -> dict:
        summary = self.attendance.summary(event_id)
        summary["registered"] = self.attendance.registered_count(event_id)
        return summary

    def sheet_for_event(self, event_id: uuid.UUID) -> list[dict]:
        self._get_event(event_id)
        rows = self.attendance.sheet_for_event(event_id)
        sheet: list[dict] = []
        for registration, attendance in rows:
            if attendance is not None:
                item = attendance.to_dict()
            else:
                item = {
                    "id": f"registration-{registration.id}",
                    "event_id": str(registration.event_id),
                    "user_id": str(registration.user_id),
                    "registration_id": str(registration.id),
                    "status": "absent",
                    "check_in_at": None,
                    "check_out_at": None,
                    "method": "not_marked",
                    "recorded_by": None,
                    "event_title": registration.event.title if registration.event else None,
                    "participant_name": registration.user.full_name if registration.user else None,
                    "recorded_by_name": None,
                }
            item["registration_status"] = registration.status
            sheet.append(item)
        return sheet

    def list_for_user(self, user_id: uuid.UUID):
        return self.attendance.list_for_user(user_id)


__all__ = ["AttendanceService"]


def _as_aware_utc(value):
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)
