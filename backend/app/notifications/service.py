"""Business logic for the notifications module.

Creates in-app notifications (optionally rendered from a template), records a
delivery log entry per notification, and manages read/unread state.
"""

from __future__ import annotations

import uuid

from app.common.exceptions import NotFoundError, ValidationError
from app.notifications.model import (
    Notification,
    NotificationLog,
    NotificationTemplate,
)
from app.notifications.repository import (
    NotificationLogRepository,
    NotificationRepository,
    NotificationTemplateRepository,
)
from app.realtime.service import emit_update
from app.utils.datetime import utcnow


class NotificationService:
    """Coordinates notification creation and delivery logging."""

    def __init__(self) -> None:
        self.notifications = NotificationRepository()
        self.templates = NotificationTemplateRepository()
        self.logs = NotificationLogRepository()

    # --- create -----------------------------------------------------------
    def notify(
        self,
        *,
        user_id: uuid.UUID,
        title: str,
        body: str,
        category: str = "general",
        channel: str = "in_app",
        entity_type=None,
        entity_id=None,
        recipient=None,
    ) -> Notification:
        if channel != "in_app":
            raise ValidationError("Only in-app notification delivery is enabled.")
        notification = Notification(
            user_id=user_id,
            title=title,
            body=body,
            category=category,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        self.notifications.add(notification)
        self.notifications.commit()

        self.logs.add(
            NotificationLog(
                notification_id=notification.id,
                user_id=user_id,
                channel=channel,
                recipient=recipient,
                status="sent",
                sent_at=utcnow(),
            )
        )
        self.logs.commit()
        emit_update(
            "notification",
            "created",
            entity_id=notification.id,
            user_id=user_id,
            message=title,
            data=notification.to_dict(),
        )
        return notification

    def notify_from_template(
        self, *, user_id: uuid.UUID, code: str, context: dict | None = None, **kwargs
    ) -> Notification:
        template = self.templates.get_by_code(code)
        if template is None:
            raise NotFoundError(f"Notification template '{code}' not found.")
        context = context or {}
        title = template.title.format(**context)
        body = template.body.format(**context)
        return self.notify(
            user_id=user_id,
            title=title,
            body=body,
            channel=template.channel,
            **kwargs,
        )

    def broadcast(self, *, user_ids: list[uuid.UUID], title: str, body: str, **kwargs):
        created = []
        for uid in user_ids:
            created.append(self.notify(user_id=uid, title=title, body=body, **kwargs))
        return created

    # --- read -------------------------------------------------------------
    def list_for_user(self, user_id: uuid.UUID, *, status=None):
        return self.notifications.list_for_user(user_id, status=status)

    def unread_count(self, user_id: uuid.UUID) -> int:
        return self.notifications.count_unread(user_id)

    def mark_read(self, *, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification:
        notification = self.notifications.get_by_id(notification_id)
        if notification is None or notification.user_id != user_id:
            raise NotFoundError("Notification not found.")
        notification.status = "read"
        notification.read_at = utcnow()
        self.notifications.commit()
        emit_update(
            "notification",
            "read",
            entity_id=notification.id,
            user_id=user_id,
            data={"unread": self.unread_count(user_id)},
        )
        return notification

    def mark_all_read(self, user_id: uuid.UUID) -> int:
        query = self.notifications.list_for_user(user_id, status="unread")
        from app.extensions import db

        items = list(db.session.scalars(query).all())
        now = utcnow()
        for n in items:
            n.status = "read"
            n.read_at = now
        self.notifications.commit()
        emit_update(
            "notification",
            "read_all",
            user_id=user_id,
            data={"updated": len(items), "unread": 0},
        )
        return len(items)

    # --- templates --------------------------------------------------------
    def list_templates(self):
        return self.templates.list_all()

    def create_template(self, *, code, title, body, channel="in_app") -> NotificationTemplate:
        if self.templates.get_by_code(code):
            raise ValidationError("A template with this code already exists.")
        template = NotificationTemplate(code=code, title=title, body=body, channel=channel)
        self.templates.add(template)
        self.templates.commit()
        return template

__all__ = ["NotificationService"]
