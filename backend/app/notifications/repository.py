"""Data-access layer for the notifications module."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.extensions import db
from app.notifications.model import (
    Notification,
    NotificationLog,
    NotificationTemplate,
)


class NotificationRepository:
    """Persistence operations for ``Notification``."""

    def get_by_id(self, entity_id: uuid.UUID) -> Notification | None:
        return db.session.scalar(
            select(Notification).where(Notification.id == entity_id)
        )

    def list_for_user(self, user_id: uuid.UUID, *, status=None):
        stmt = select(Notification).where(Notification.user_id == user_id)
        if status:
            stmt = stmt.where(Notification.status == status)
        return stmt.order_by(Notification.created_at.desc())

    def count_unread(self, user_id: uuid.UUID) -> int:
        return db.session.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id, Notification.status == "unread"
            )
        ) or 0

    def add(self, entity: Notification) -> Notification:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class NotificationTemplateRepository:
    """Persistence operations for ``NotificationTemplate``."""

    def get_by_code(self, code: str) -> NotificationTemplate | None:
        return db.session.scalar(
            select(NotificationTemplate).where(NotificationTemplate.code == code)
        )

    def list_all(self):
        return list(db.session.scalars(select(NotificationTemplate)).all())

    def add(self, entity: NotificationTemplate) -> NotificationTemplate:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class NotificationLogRepository:
    """Persistence operations for ``NotificationLog``."""

    def add(self, entity: NotificationLog) -> NotificationLog:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()
