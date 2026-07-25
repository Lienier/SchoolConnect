"""Business logic for the users module.

Handles administrative user CRUD, role assignment (RBAC) and self-service
profile updates. Services raise domain exceptions; routes translate them into
standardized responses.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.auth.model import User
from app.auth.repository import UserRepository
from app.common.exceptions import ConflictError, NotFoundError, ValidationError
from app.permissions.model import Role
from app.users.repository import RoleRepository, UserRoleRepository


class UserService:
    """Coordinates user administration workflows."""

    def __init__(self) -> None:
        self.users = UserRepository()
        self.roles = RoleRepository()
        self.user_roles = UserRoleRepository()

    # --- admin CRUD -------------------------------------------------------
    def list_users_query(self):
        """Return a ``Select`` of active (non-deleted) users for querying."""
        return select(User).where(User.deleted_at.is_(None))

    def create_user(
        self, *, email: str, full_name: str, password: str, roles: list[str],
        first_name=None, last_name=None, username=None, status: str = "active",
        actor_id: uuid.UUID | None = None,
    ) -> User:
        """Admin-created user with explicit role assignment."""
        from app.auth.service import AuthService

        if self.users.get_by_email(email):
            raise ConflictError("An account with this email already exists.")
        if username and self.users.get_by_username(username):
            raise ConflictError("This username is already taken.")
        self._validate_status(status)

        role_objs = self._resolve_roles(roles)
        user = User(
            email=email,
            full_name=full_name,
            first_name=first_name,
            last_name=last_name,
            username=username,
            password_hash=AuthService._hash_password(password),
            status=status,
            created_by=actor_id,
        )
        self.users.add(user)
        self.users.flush()
        self.user_roles.replace_roles(
            user.id, [r.id for r in role_objs]
        )
        self.users.commit()
        return user

    def list_users(self, page: int = 1, page_size: int = 20, status: str | None = None):
        """Return a paginated list of users (placeholder; paging in routes)."""
        from sqlalchemy import select

        stmt = select(User).where(User.deleted_at.is_(None))
        if status:
            stmt = stmt.where(User.status == status)
        return stmt

    def get_user(self, user_id: uuid.UUID) -> User:
        """Return a user or raise NotFound."""
        user = self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return user

    def update_user(self, user_id: uuid.UUID, **fields) -> User:
        """Update modifiable user fields."""
        user = self.get_user(user_id)
        if "status" in fields and fields["status"] is not None:
            self._validate_status(fields["status"])
        for key, value in fields.items():
            if value is not None:
                setattr(user, key, value)
        self.users.commit()
        return user

    # --- status transitions ----------------------------------------------
    def disable_user(self, user_id: uuid.UUID, *, reason: str | None = None) -> User:
        """Disable a user (sets status to ``inactive``)."""
        user = self.get_user(user_id)
        if user.status == "inactive":
            return user
        user.status = "inactive"
        self.users.commit()
        return user

    def suspend_user(self, user_id: uuid.UUID) -> User:
        """Suspend a user (sets status to ``suspended``)."""
        user = self.get_user(user_id)
        user.status = "suspended"
        self.users.commit()
        return user

    def reactivate_user(self, user_id: uuid.UUID) -> User:
        """Reactivate a disabled/suspended user (sets status to ``active``)."""
        user = self.get_user(user_id)
        user.status = "active"
        self.users.commit()
        return user

    # --- admin password reset --------------------------------------------
    def admin_reset_password(self, user_id: uuid.UUID, *, new_password: str) -> None:
        """Forcefully set a new password for a user (admin action)."""
        user = self.get_user(user_id)
        if len(new_password) < 8:
            raise ValidationError("Password must be at least 8 characters.")
        user.password_hash = self._hash_password(new_password)
        self.users.commit()

    def set_avatar(self, user_id: uuid.UUID, url: str) -> User:
        """Set a user's profile-picture URL."""
        user = self.get_user(user_id)
        user.avatar_url = url
        self.users.commit()
        return user

    def soft_delete_user(self, user_id: uuid.UUID) -> None:
        """Soft-delete a user."""
        user = self.get_user(user_id)
        user.soft_delete()
        self.users.commit()

    # --- roles ------------------------------------------------------------
    def assign_roles(self, user_id: uuid.UUID, role_names: list[str]) -> User:
        """Replace a user's roles with the given set."""
        user = self.get_user(user_id)
        role_objs = self._resolve_roles(role_names)
        self.user_roles.replace_roles(user.id, [r.id for r in role_objs])
        self.users.commit()
        return user

    def list_roles(self) -> list[Role]:
        """Return all roles."""
        return self.roles.list_all()

    # --- self profile -----------------------------------------------------
    def update_own_profile(self, user: User, *, phone=None, first_name=None,
                           last_name=None) -> User:
        """Update the authenticated user's own basic profile fields."""
        if phone is not None:
            user.phone = phone
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        self.users.commit()
        return user

    # --- helpers ----------------------------------------------------------
    @staticmethod
    def _hash_password(password: str) -> str:
        """Return a bcrypt hash for an admin-set password."""
        import bcrypt

        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def _validate_status(status: str) -> None:
        allowed = {"active", "inactive", "suspended", "invited"}
        if status not in allowed:
            raise ValidationError(f"Invalid status '{status}'.")

    def _resolve_roles(self, role_names: list[str]) -> list[Role]:
        roles: list[Role] = []
        for name in role_names:
            role = self.roles.get_by_name(name)
            if role is None:
                raise ValidationError(f"Unknown role '{name}'.")
            roles.append(role)
        if not roles:
            raise ValidationError("At least one role must be assigned.")
        return roles
