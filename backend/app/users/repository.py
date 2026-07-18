"""Data-access layer for the users module."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.auth.model import User
from app.auth.repository import UserRepository
from app.extensions import db
from app.permissions.model import Role, UserRole


class RoleRepository:
    """Persistence operations for ``Role``."""

    def get_by_name(self, name: str) -> Role | None:
        """Return a role by name."""
        return db.session.scalar(select(Role).where(Role.name == name))

    def list_all(self) -> list[Role]:
        """Return all roles."""
        return list(db.session.scalars(select(Role).order_by(Role.name)).all())


class UserRoleRepository:
    """Manages the user-role assignment join rows."""

    def replace_roles(self, user_id: uuid.UUID, role_ids: list[uuid.UUID]) -> None:
        """Remove existing role links and assign the given roles."""
        existing = db.session.scalars(
            select(UserRole).where(UserRole.user_id == user_id)
        ).all()
        for link in existing:
            db.session.delete(link)
        for role_id in role_ids:
            db.session.add(UserRole(user_id=user_id, role_id=role_id))
        db.session.flush()
