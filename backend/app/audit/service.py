"""Business logic for the audit module.

Provides helpers other modules call to record audit trails, login attempts and
user activity. Writes are best-effort and never raise into the caller's flow.
"""

from __future__ import annotations

import logging
import uuid

from app.audit.model import ActivityLog, AuditLog, LoginHistory
from app.audit.repository import (
    ActivityLogRepository,
    AuditLogRepository,
    LoginHistoryRepository,
)

logger = logging.getLogger(__name__)


class AuditService:
    """Records and reads audit, login and activity logs."""

    def __init__(self) -> None:
        self.audit = AuditLogRepository()
        self.logins = LoginHistoryRepository()
        self.activity = ActivityLogRepository()

    # --- writes -----------------------------------------------------------
    def record_audit(
        self,
        *,
        action: str,
        entity_type: str,
        entity_id=None,
        actor_id=None,
        changes=None,
        ip_address=None,
        user_agent=None,
    ) -> None:
        try:
            self.audit.add(
                AuditLog(
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    actor_id=actor_id,
                    changes=changes,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
            )
            self.audit.commit()
        except Exception:  # pragma: no cover - audit must not break flow
            logger.exception("Failed to write audit log")

    def record_login(
        self,
        *,
        success: bool,
        user_id=None,
        email=None,
        method: str = "password",
        ip_address=None,
        user_agent=None,
        reason=None,
        commit: bool = True,
    ) -> None:
        try:
            self.logins.add(
                LoginHistory(
                    success=success,
                    user_id=user_id,
                    email=email,
                    method=method,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    reason=reason,
                )
            )
            if commit:
                self.logins.commit()
        except Exception:  # pragma: no cover
            logger.exception("Failed to write login history")

    def record_activity(
        self, *, user_id: uuid.UUID, action: str, description=None, entity_type=None, entity_id=None
    ) -> None:
        try:
            self.activity.add(
                ActivityLog(
                    user_id=user_id,
                    action=action,
                    description=description,
                    entity_type=entity_type,
                    entity_id=entity_id,
                )
            )
            self.activity.commit()
        except Exception:  # pragma: no cover
            logger.exception("Failed to write activity log")

    # --- reads ------------------------------------------------------------
    def list_audit(self, *, actor_id=None, entity_type=None, action=None):
        return self.audit.list_query(
            actor_id=actor_id, entity_type=entity_type, action=action
        )

    def list_logins(self, *, user_id=None):
        return self.logins.list_query(user_id=user_id)

    def list_activity(self, *, user_id=None):
        return self.activity.list_query(user_id=user_id)


__all__ = ["AuditService"]
