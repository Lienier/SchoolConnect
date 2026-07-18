"""Response schemas and serialization helpers for the auth module."""

from __future__ import annotations

from app.auth.model import User


def public_user(user: User, include_roles: bool = True) -> dict:
    """Serialize a user for API responses, excluding secrets."""
    return user.to_dict(include_roles=include_roles)


def auth_tokens(access: str, refresh: str, user: User) -> dict:
    """Build the standard auth payload returned on login/refresh."""
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "Bearer",
        "user": public_user(user),
    }
