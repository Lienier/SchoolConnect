"""Request validators for the users module (Pydantic)."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Literal, Optional


class UserCreateRequest(BaseModel):
    """Admin-created user."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    username: str | None = Field(default=None, max_length=50)
    roles: list[str] = Field(default_factory=lambda: ["student"])
    status: str = "active"


class UserUpdateRequest(BaseModel):
    """Partial user update (admin)."""

    full_name: str | None = Field(default=None, max_length=150)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    username: str | None = Field(default=None, max_length=50)
    status: str | None = None
    phone: str | None = Field(default=None, max_length=30)


class AssignRolesRequest(BaseModel):
    """Assign a set of roles to a user."""

    roles: list[str] = Field(min_length=1)


class ProfileUpdateRequest(BaseModel):
    """Self-service profile update for the authenticated user."""

    phone: str | None = Field(default=None, max_length=30)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)


class AdminResetPasswordRequest(BaseModel):
    """Admin-initiated password reset for another user."""

    new_password: str = Field(min_length=8, max_length=128)


class SetAvatarRequest(BaseModel):
    """Set a user's profile picture URL (upload handled separately)."""

    avatar_url: str = Field(min_length=1, max_length=2000)

