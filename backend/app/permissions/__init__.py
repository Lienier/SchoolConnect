"""Role-Based Access Control (RBAC) primitives.

Defines the system roles and reusable authorization decorators used by feature
route handlers to enforce permissions.
"""

from app.permissions.roles import Role
from app.permissions.decorators import require_roles

__all__ = ["Role", "require_roles"]
