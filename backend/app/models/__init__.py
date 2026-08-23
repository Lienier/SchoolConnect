"""Shared model base classes and mixins.

Feature modules define their own ``model.py`` importing ``BaseModel`` from here
so that every table shares a consistent set of columns and behaviours:
UUID primary keys, timestamps, audit columns, and soft deletion.

All feature models are imported here so that SQLAlchemy registers every table
regardless of which module a given code path happens to import. This guarantees
Alembic autogenerate and ``db.create_all`` see the complete schema.
"""

from app.models.base import AuditMixin, BaseModel, SoftDeleteMixin, TimestampMixin, UUIDMixin

# Ensure every feature model is registered on the metadata.
from app.auth import model as _auth_models  # noqa: F401
from app.announcements import model as _announcements_models  # noqa: F401
from app.permissions import model as _permissions_models  # noqa: F401
from app.users import model as _users_models  # noqa: F401
from app.events import model as _events_models  # noqa: F401
from app.registrations import model as _registrations_models  # noqa: F401
from app.attendance import model as _attendance_models  # noqa: F401
from app.notifications import model as _notifications_models  # noqa: F401
from app.audit import model as _audit_models  # noqa: F401

__all__ = ["AuditMixin", "BaseModel", "SoftDeleteMixin", "TimestampMixin", "UUIDMixin"]
