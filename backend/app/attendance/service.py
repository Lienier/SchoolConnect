"""Business logic for the attendance module.

Supports manual marking, QR token generation and QR-based check-in. Every
action is mirrored to the append-only attendance log.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from app.attendance.model import Attendance, AttendanceLog, QrToken
from app.attendance.repository import (
    AttendanceLogRepository,
    AttendanceRepository,
    QrTokenRepository,
)
from app.common.exceptions import NotFoundError, ValidationError
from app.events.repository import EventRepository
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
        now = utcnow()
        if record is None:
            record = Attendance(
                event_id=event_id,
                user_id=user_id,
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
        if qr.used:
            raise ValidationError("This QR token has already been used.")
        if utcnow() > qr.expires_at:
            raise ValidationError("This QR token has expired.")

        target_user = qr.user_id or actor_id
        record = self.mark(
            event_id=qr.event_id,
            user_id=target_user,
            status="present",
            actor_id=actor_id,
            method="qr",
        )
        qr.used = True
        qr.used_at = utcnow()
        self.qr.commit()
        return record

    # --- read -------------------------------------------------------------
    def list_for_event(self, event_id: uuid.UUID):
        return self.attendance.list_for_event(event_id)

    def summary(self, event_id: uuid.UUID) -> dict:
        return self.attendance.summary(event_id)


__all__ = ["AttendanceService"]
