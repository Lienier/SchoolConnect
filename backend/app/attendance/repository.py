"""Data-access layer for the attendance module."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.attendance.model import Attendance, AttendanceLog, QrToken
from app.extensions import db


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

    def summary(self, event_id: uuid.UUID) -> dict:
        rows = db.session.execute(
            select(Attendance.status, func.count(Attendance.id))
            .where(Attendance.event_id == event_id)
            .group_by(Attendance.status)
        ).all()
        return {status: count for status, count in rows}

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
