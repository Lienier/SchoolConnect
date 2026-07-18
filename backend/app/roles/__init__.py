"""Roles module: runtime management of RBAC roles and their permissions.

Reuses the ``Role``/``Permission``/``RolePermission`` models defined in the
``permissions`` module. This module provides the administrative CRUD surface so
new roles (e.g. Registrar, Guidance Counselor, Club Adviser) can be created and
configured at runtime without code changes.
"""
