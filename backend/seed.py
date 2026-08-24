"""Minimal idempotent seed script for roles, permissions, and baseline users.

Run with:
    python -m seed

This intentionally does not create demo school data, announcements, events,
registrations, attendance records, notifications, or audit logs. Those records
are meant to be created manually by the team.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from app.app import create_app
from app.extensions import db
from app.permissions.constants import DEFAULT_ROLE_PERMISSIONS, PERMISSIONS
from app.permissions.model import Permission, Role, RolePermission, UserRole


@dataclass(frozen=True)
class SeedAccount:
    role: str
    display_role: str
    email_env: str
    password_env: str
    default_email: str
    default_password: str
    username: str
    full_name: str


BASELINE_ACCOUNTS = [
    SeedAccount(
        role="admin",
        display_role="Administrator",
        email_env="SEED_ADMIN_EMAIL",
        password_env="SEED_ADMIN_PASSWORD",
        default_email="admin@schoolconnect.local",
        default_password="Admin123!",
        username="admin",
        full_name="School Administrator",
    ),
    SeedAccount(
        role="teacher",
        display_role="Professor",
        email_env="SEED_PROFESSOR_EMAIL",
        password_env="SEED_PROFESSOR_PASSWORD",
        default_email="professor@schoolconnect.local",
        default_password="Professor123!",
        username="professor",
        full_name="School Professor",
    ),
    SeedAccount(
        role="student_council",
        display_role="Student Council",
        email_env="SEED_OFFICER_EMAIL",
        password_env="SEED_OFFICER_PASSWORD",
        default_email="officer@schoolconnect.local",
        default_password="Officer123!",
        username="student_council",
        full_name="Student Council Officer",
    ),
    SeedAccount(
        role="student",
        display_role="Student",
        email_env="SEED_STUDENT_EMAIL",
        password_env="SEED_STUDENT_PASSWORD",
        default_email="student@schoolconnect.local",
        default_password="Student123!",
        username="student",
        full_name="School Student",
    ),
]


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


def seed_baseline_accounts() -> None:
    """Create one clean login account for each user role."""
    from app.auth.model import User
    from app.auth.service import AuthService

    service = AuthService()
    for account in BASELINE_ACCOUNTS:
        email = os.getenv(account.email_env, account.default_email).strip().lower()
        password = os.getenv(account.password_env, account.default_password)

        user = db.session.scalar(
            db.select(User).where((User.email == email) | (User.username == account.username))
        )
        if user is None:
            user = service.register(
                email=email,
                password=password,
                full_name=account.full_name,
                username=account.username,
            )
        else:
            user.email = email
            user.username = account.username
            user.full_name = account.full_name
            user.password_hash = service._hash_password(password)

        user.status = "active"
        user.email_verified = True
        _set_user_roles(user, [account.role])
        print(f"{account.display_role} account ready: {email}")


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
        seed_baseline_accounts()
