"""Request validators for the auth module (Pydantic)."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Payload for credential login."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    """Payload for refreshing access tokens."""

    refresh_token: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    """Payload to change password for an authenticated user."""

    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


__all__ = ["ChangePasswordRequest", "LoginRequest", "RefreshRequest"]
