"""Idempotent seed script for RBAC and an optional first administrator.

Run with:
    python -m seed

This intentionally does not create demo school data, announcements, events,
registrations, attendance records, notifications, or audit logs. Those records
are meant to be created manually by the team.
"""

from __future__ import annotations

import os

from app.app import create_app
from app.extensions import db
from app.permissions.constants import DEFAULT_ROLE_PERMISSIONS, PERMISSIONS
from app.permissions.model import Permission, Role, RolePermission, UserRole


def _env_flag(key: str) -> bool:
    return os.getenv(key, "").strip().lower() in {"1", "true", "yes", "on"}


def seed_rbac() -> None:
    """Create permissions and system roles if they do not already exist."""
    all_perms = {perm for perms in PERMISSIONS.values() for perm in perms}
    perm_map: dict[str, Permission] = {}

    for name in sorted(all_perms):
        existing = db.session.scalar(db.select(Permission).where(Permission.name == name))
        if existing is None:
            resource = name.split(".")[0] if "." in name else None
            action = name.split(".")[1] if "." in name else None
            existing = Permission(name=name, resource=resource, action=action)
            db.session.add(existing)
            db.session.flush()
        perm_map[name] = existing

    for role_name, perm_names in DEFAULT_ROLE_PERMISSIONS.items():
        role = db.session.scalar(db.select(Role).where(Role.name == role_name))
        if role is None:
            role = Role(
                name=role_name,
                display_name=role_name.replace("_", " ").title(),
                is_system=True,
            )
            db.session.add(role)
            db.session.flush()

        desired = set(perm_names)
        for existing_permission in list(role.permissions):
            if existing_permission.name not in desired:
                role.permissions.remove(existing_permission)

        assigned = {permission.name for permission in role.permissions}
        for perm_name in perm_names:
            perm = perm_map.get(perm_name)
            if perm is None or perm_name in assigned:
                continue
            db.session.add(RolePermission(role_id=role.id, permission_id=perm.id))

    db.session.commit()
    print("RBAC seed complete.")


def seed_initial_admin() -> None:
    """Create the first administrator only when explicit credentials are supplied."""
    from app.auth.model import User
    from app.auth.service import AuthService
    from app.users.model import AdministratorProfile

    email = os.getenv("SEED_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("SEED_ADMIN_PASSWORD", "")
    reset_existing = _env_flag("SEED_ADMIN_RESET_EXISTING")
    if not email or not password:
        print("Initial administrator seed skipped; explicit credentials were not supplied.")
        return
    if len(password) < 12:
        raise RuntimeError("SEED_ADMIN_PASSWORD must contain at least 12 characters.")

    existing = db.session.scalar(db.select(User).where(User.email == email))
    if existing is not None:
        if not reset_existing:
            print(f"Initial administrator already exists: {email}")
            return

        service = AuthService()
        existing.password_hash = service._hash_password(password)
        existing.status = "active"
        existing.email_verified = True
        _set_user_roles(existing, ["admin"])
        if db.session.get(AdministratorProfile, existing.id) is None:
            db.session.add(AdministratorProfile(id=existing.id))
            db.session.commit()
        print(f"Initial administrator password reset: {email}")
        return

    service = AuthService()
    user = service.register(
        email=email,
        password=password,
        full_name="College Administrator",
        username=email.split("@", 1)[0],
    )
    user.email_verified = True
    _set_user_roles(user, ["admin"])
    if db.session.get(AdministratorProfile, user.id) is None:
        db.session.add(AdministratorProfile(id=user.id))
        db.session.commit()
    print(f"Initial administrator created: {email}")


def _set_user_roles(user, role_names: list[str]) -> None:
    """Replace a user's role links with the supplied role names."""
    roles = list(db.session.scalars(db.select(Role).where(Role.name.in_(role_names))).all())
    if len(roles) != len(set(role_names)):
        missing = sorted(set(role_names) - {role.name for role in roles})
        raise RuntimeError(f"Missing roles: {', '.join(missing)}")

    db.session.query(UserRole).filter(UserRole.user_id == user.id).delete(
        synchronize_session=False
    )
    db.session.flush()
    for role in roles:
        db.session.add(UserRole(user_id=user.id, role_id=role.id))
    db.session.commit()


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_rbac()
        seed_initial_admin()
