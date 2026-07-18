"""Data-access layer for the audit module."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.audit.model import ActivityLog, AuditLog, LoginHistory
from app.extensions import db


class AuditLogRepository:
    """Persistence operations for ``AuditLog``."""

    def list_query(self, *, actor_id=None, entity_type=None, action=None):
        stmt = select(AuditLog)
        if actor_id:
            stmt = stmt.where(AuditLog.actor_id == actor_id)
        if entity_type:
            stmt = stmt.where(AuditLog.entity_type == entity_type)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        return stmt.order_by(AuditLog.created_at.desc())

    def add(self, entity: AuditLog) -> AuditLog:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class LoginHistoryRepository:
    """Persistence operations for ``LoginHistory``."""

    def list_query(self, *, user_id=None):
        stmt = select(LoginHistory)
        if user_id:
            stmt = stmt.where(LoginHistory.user_id == user_id)
        return stmt.order_by(LoginHistory.created_at.desc())

    def add(self, entity: LoginHistory) -> LoginHistory:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class ActivityLogRepository:
    """Persistence operations for ``ActivityLog``."""

    def list_query(self, *, user_id=None):
        stmt = select(ActivityLog)
        if user_id:
            stmt = stmt.where(ActivityLog.user_id == user_id)
        return stmt.order_by(ActivityLog.created_at.desc())

    def add(self, entity: ActivityLog) -> ActivityLog:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()
