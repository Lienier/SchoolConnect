"""Data-access layer for role and permission management."""

from __future__ import annotations

import uuid

from sqlalchemy import Select, select

from app.extensions import db
from app.permissions.model import Permission, Role, RolePermission


class RoleRepository:
    """Persistence operations for ``Role`` and its permission links."""

    def get_by_id(self, role_id: uuid.UUID) -> Role | None:
        """Return a role by primary key."""
        return db.session.get(Role, role_id)

    def get_by_name(self, name: str) -> Role | None:
        """Return a role by its unique name."""
        return db.session.scalar(select(Role).where(Role.name == name))

    def list_query(self) -> Select:
        """Return a ``Select`` of all roles for pagination/search."""
        return select(Role)

    def add(self, role: Role) -> Role:
        """Persist a new role and flush to obtain its id."""
        db.session.add(role)
        db.session.flush()
        return role

    def delete(self, role: Role) -> None:
        """Delete a role (cascades to its permission links)."""
        db.session.delete(role)
        db.session.flush()

    def set_permissions(self, role_id: uuid.UUID, permission_ids: list[uuid.UUID]) -> None:
        """Replace a role's permission links with the given permission ids."""
        existing = db.session.scalars(
            select(RolePermission).where(RolePermission.role_id == role_id)
        ).all()
        for link in existing:
            db.session.delete(link)
        for permission_id in permission_ids:
            db.session.add(
                RolePermission(role_id=role_id, permission_id=permission_id)
            )
        db.session.flush()


class PermissionRepository:
    """Persistence operations for ``Permission``."""

    def list_all(self) -> list[Permission]:
        """Return every permission ordered by name."""
        return list(
            db.session.scalars(select(Permission).order_by(Permission.name)).all()
        )

    def get_by_names(self, names: list[str]) -> list[Permission]:
        """Return permissions matching the given names."""
        if not names:
            return []
        return list(
            db.session.scalars(
                select(Permission).where(Permission.name.in_(names))
            ).all()
        )
