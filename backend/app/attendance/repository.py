"""Data-access layer for the attendance module."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.attendance.model import Attendance, AttendanceLog, QrToken
from app.extensions import db
from app.registrations.model import Registration


class AttendanceRepository:
    """Persistence operations for ``Attendance``."""

    def get_by_id(self, entity_id: uuid.UUID) -> Attendance | None:
        return db.session.scalar(select(Attendance).where(Attendance.id == entity_id))

    def get_for_user_event(self, user_id: uuid.UUID, event_id: uuid.UUID) -> Attendance | None:
        return db.session.scalar(
            select(Attendance).where(
                Attendance.user_id == user_id, Attendance.event_id == event_id
            )
        )

    def list_for_event(self, event_id: uuid.UUID):
        return select(Attendance).where(Attendance.event_id == event_id).order_by(
            Attendance.created_at.desc()
        )

    def list_for_user(self, user_id: uuid.UUID):
        return select(Attendance).where(Attendance.user_id == user_id).order_by(
            Attendance.created_at.desc()
        )

    def summary(self, event_id: uuid.UUID) -> dict:
        rows = db.session.execute(
            select(Attendance.status, func.count(Attendance.id))
            .where(Attendance.event_id == event_id)
            .group_by(Attendance.status)
        ).all()
        return {status: count for status, count in rows}

    def registered_count(self, event_id: uuid.UUID) -> int:
        return db.session.scalar(
            select(func.count(Registration.id)).where(
                Registration.event_id == event_id,
                Registration.status.in_(("approved", "attended", "absent")),
                Registration.deleted_at.is_(None),
            )
        ) or 0

    def sheet_for_event(self, event_id: uuid.UUID):
        return db.session.execute(
            select(Registration, Attendance)
            .outerjoin(
                Attendance,
                (Attendance.event_id == Registration.event_id)
                & (Attendance.user_id == Registration.user_id),
            )
            .where(
                Registration.event_id == event_id,
                Registration.status.in_(("approved", "attended", "absent")),
                Registration.deleted_at.is_(None),
            )
            .order_by(Registration.created_at.asc())
        ).all()

    def add(self, entity: Attendance) -> Attendance:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class AttendanceLogRepository:
    """Persistence operations for ``AttendanceLog``."""

    def add(self, entity: AttendanceLog) -> AttendanceLog:
        db.session.add(entity)
        return entity


class QrTokenRepository:
    """Persistence operations for ``QrToken``."""

    def get_by_token(self, token: str) -> QrToken | None:
        return db.session.scalar(select(QrToken).where(QrToken.token == token))

    def add(self, entity: QrToken) -> QrToken:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()
