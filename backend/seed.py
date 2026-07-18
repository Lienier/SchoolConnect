"""Idempotent seed script for RBAC roles and permissions.

Run with:  flask shell  ->  from seed import seed_rbac; seed_rbac()
or:        python -m seed   (within the activated venv, FLASK_APP set)

It creates every permission and the four default system roles, assigning the
permissions defined in ``app.permissions.constants``. Existing rows are left
untouched, so the script is safe to run repeatedly.
"""

from __future__ import annotations

from app.app import create_app
from app.extensions import db
from app.permissions.constants import DEFAULT_ROLE_PERMISSIONS, PERMISSIONS
from app.permissions.model import Permission, Role, RolePermission


def seed_rbac() -> None:
    """Create permissions and default roles if they do not already exist."""
    # Flatten all known permissions.
    all_perms = {perm for perms in PERMISSIONS.values() for perm in perms}
    perm_map: dict[str, Permission] = {}

    for name in sorted(all_perms):
        existing = db.session.scalar(
            db.select(Permission).where(Permission.name == name)
        )
        if existing is None:
            resource = name.split(".")[0] if "." in name else None
            action = name.split(".")[1] if "." in name else None
            perm = Permission(name=name, resource=resource, action=action)
            db.session.add(perm)
            db.session.flush()
            perm_map[name] = perm
        else:
            perm_map[name] = existing

    for role_name, perm_names in DEFAULT_ROLE_PERMISSIONS.items():
        role = db.session.scalar(
            db.select(Role).where(Role.name == role_name)
        )
        if role is None:
            role = Role(
                name=role_name,
                display_name=role_name.replace("_", " ").title(),
                is_system=True,
            )
            db.session.add(role)
            db.session.flush()

        assigned = {p.name for p in role.permissions}
        for perm_name in perm_names:
            perm = perm_map.get(perm_name)
            if perm is None or perm_name in assigned:
                continue
            db.session.add(RolePermission(role_id=role.id, permission_id=perm.id))

    db.session.commit()
    print("RBAC seed complete.")


def seed_categories() -> None:
    """Create default announcement categories if missing."""
    from app.announcements.model import AnnouncementCategory

    defaults = [
        ("General", "general", "#3a5a9e"),
        ("Academics", "academics", "#2c477d"),
        ("Events", "events", "#5678b8"),
        ("Sports", "sports", "#1b2d4f"),
        ("Emergency", "emergency", "#b91c1c"),
    ]
    for name, slug, color in defaults:
        exists = db.session.scalar(
            db.select(AnnouncementCategory).where(AnnouncementCategory.slug == slug)
        )
        if exists is None:
            db.session.add(
                AnnouncementCategory(name=name, slug=slug, color=color)
            )
    db.session.commit()
    print("Announcement categories seeded.")


def seed_event_categories() -> None:
    """Create default event categories if missing."""
    from app.events.model import EventCategory

    defaults = [
        ("Academic", "academic", "#2c477d"),
        ("Sports", "sports", "#1b2d4f"),
        ("Cultural", "cultural", "#7c3aed"),
        ("Community Service", "community-service", "#059669"),
        ("Workshop", "workshop", "#d97706"),
        ("Competition", "competition", "#b91c1c"),
    ]
    for name, slug, color in defaults:
        exists = db.session.scalar(
            db.select(EventCategory).where(EventCategory.slug == slug)
        )
        if exists is None:
            db.session.add(EventCategory(name=name, slug=slug, color=color))
    db.session.commit()
    print("Event categories seeded.")


def seed_notification_templates() -> None:
    """Create default notification templates if missing."""
    from app.notifications.model import NotificationTemplate

    defaults = [
        (
            "registration_approved",
            "Registration approved",
            "Your registration for {event_title} has been approved.",
        ),
        (
            "registration_rejected",
            "Registration rejected",
            "Your registration for {event_title} was not approved.",
        ),
        (
            "event_approved",
            "Event approved",
            "Your event {event_title} has been approved and published.",
        ),
        (
            "waitlist_promoted",
            "You're off the waitlist",
            "A spot opened up for {event_title}. You are now registered.",
        ),
    ]
    for code, title, body in defaults:
        exists = db.session.scalar(
            db.select(NotificationTemplate).where(NotificationTemplate.code == code)
        )
        if exists is None:
            db.session.add(
                NotificationTemplate(code=code, title=title, body=body, channel="in_app")
            )
    db.session.commit()
    print("Notification templates seeded.")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_rbac()
        seed_categories()
        seed_event_categories()
        seed_notification_templates()
