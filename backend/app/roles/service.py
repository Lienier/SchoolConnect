"""Business logic for role and permission management.

System roles (``is_system=True``) are protected: they may have their display
metadata edited but cannot be renamed, deleted, or stripped of permissions
through this service, preventing accidental lockout.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Select

from app.common.exceptions import ConflictError, NotFoundError, ValidationError
from app.extensions import db
from app.permissions.model import Role
from app.roles.repository import PermissionRepository, RoleRepository


class RoleService:
    """Coordinates role lifecycle and permission assignment."""

    def __init__(self) -> None:
        self._roles = RoleRepository()
        self._permissions = PermissionRepository()

    def list_roles_query(self) -> Select:
        """Return a ``Select`` of roles for pagination/search/sort."""
        return self._roles.list_query()

    def get_role(self, role_id: uuid.UUID) -> Role:
        """Return a role or raise :class:`NotFoundError`."""
        role = self._roles.get_by_id(role_id)
        if role is None:
            raise NotFoundError("Role not found.")
        return role

    def list_permissions(self):
        """Return the catalog of assignable permissions."""
        return self._permissions.list_all()

    def create_role(
        self,
        *,
        name: str,
        display_name: str,
        description: str | None,
        priority: int | None,
        permissions: list[str],
    ) -> Role:
        """Create a custom (non-system) role with optional permissions."""
        if self._roles.get_by_name(name) is not None:
            raise ConflictError(f"A role named '{name}' already exists.")
        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            priority=priority,
            is_system=False,
        )
        self._roles.add(role)
        if permissions:
            self._apply_permissions(role.id, permissions)
        db.session.commit()
        return self.get_role(role.id)

    def update_role(
        self,
        role_id: uuid.UUID,
        *,
        display_name: str | None = None,
        description: str | None = None,
        priority: int | None = None,
    ) -> Role:
        """Update a role's descriptive fields (allowed for system roles too)."""
        role = self.get_role(role_id)
        if display_name is not None:
            role.display_name = display_name
        if description is not None:
            role.description = description
        if priority is not None:
            role.priority = priority
        db.session.commit()
        return role

    def delete_role(self, role_id: uuid.UUID) -> None:
        """Delete a custom role; system roles are protected."""
        role = self.get_role(role_id)
        if role.is_system:
            raise ValidationError("System roles cannot be deleted.")
        if role.users:
            raise ConflictError(
                "Cannot delete a role that is still assigned to users."
            )
        self._roles.delete(role)
        db.session.commit()

    def assign_permissions(self, role_id: uuid.UUID, permissions: list[str]) -> Role:
        """Replace a role's permission set."""
        role = self.get_role(role_id)
        if role.is_system:
            raise ValidationError("System role permissions cannot be modified.")
        self._apply_permissions(role.id, permissions)
        db.session.commit()
        return self.get_role(role.id)

    def clone_role(
        self,
        role_id: uuid.UUID,
        *,
        name: str,
        display_name: str,
        description: str | None,
    ) -> Role:
        """Create a new custom role copying an existing role's permissions."""
        source = self.get_role(role_id)
        if self._roles.get_by_name(name) is not None:
            raise ConflictError(f"A role named '{name}' already exists.")
        clone = Role(
            name=name,
            display_name=display_name,
            description=description,
            priority=source.priority,
            is_system=False,
        )
        self._roles.add(clone)
        source_perms = [perm.name for perm in source.permissions]
        if source_perms:
            self._apply_permissions(clone.id, source_perms)
        db.session.commit()
        return self.get_role(clone.id)

    def _apply_permissions(self, role_id: uuid.UUID, permission_names: list[str]) -> None:
        """Resolve permission names to ids and replace the role's links."""
        unique_names = list(dict.fromkeys(permission_names))
        resolved = self._permissions.get_by_names(unique_names)
        found = {perm.name for perm in resolved}
        missing = [name for name in unique_names if name not in found]
        if missing:
            raise ValidationError(f"Unknown permissions: {', '.join(missing)}.")
        self._roles.set_permissions(role_id, [perm.id for perm in resolved])
