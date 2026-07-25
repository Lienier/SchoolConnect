"""Business logic for the notifications module.

Creates in-app notifications (optionally rendered from a template), records a
delivery log entry per notification, and manages read/unread state. Email
delivery is logged but performed by the email worker (out of scope here).
"""

from __future__ import annotations

import uuid
from datetime import datetime

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
                status="sent" if channel == "in_app" else "queued",
                sent_at=utcnow() if channel == "in_app" else None,
            )
        )
        self.logs.commit()
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

    def schedule_event_reminders(self, event_id: uuid.UUID, event_title: str, event_start: datetime) -> list:
        """Create reminder notifications for all approved registrants.
        
        Schedules 3-day, 1-day, and event-day reminders as in-app notifications.
        Called by a background cron job that scans upcoming events.
        """
        from datetime import timedelta
        from app.registrations.repository import RegistrationRepository
        from app.extensions import db
        
        reg_repo = RegistrationRepository()
        now = utcnow()
        reminders = []
        
        # Define reminder intervals: (days_before, message_prefix)
        intervals = [
            (3, "Reminder: 3 days until"),
            (1, "Reminder: Tomorrow is"),
            (0, "Today's Event:"),
        ]
        
        for days_before, prefix in intervals:
            reminder_date = event_start - timedelta(days=days_before)
            # Only send if the reminder date matches today (within the same calendar day)
            if reminder_date.date() != now.date():
                continue
            
            # Get all approved/attended registrants
            from sqlalchemy import select
            from app.registrations.model import Registration
            
            registrant_ids = list(db.session.scalars(
                select(Registration.user_id).where(
                    Registration.event_id == event_id,
                    Registration.deleted_at.is_(None),
                    Registration.status.in_(("approved", "attended")),
                )
            ).all())
            
            for uid in registrant_ids:
                notification = self.notify(
                    user_id=uid,
                    title=f"{prefix} {event_title}",
                    body=f"Your registered event '{event_title}' is {'today' if days_before == 0 else f'in {days_before} day(s)'}. Don't forget to attend!",
                    category="event_reminder",
                    entity_type="event",
                    entity_id=event_id,
                )
                reminders.append(notification)
        
        return reminders


__all__ = ["NotificationService"]
