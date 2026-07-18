"""Request validators for the auth module (Pydantic)."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.auth.constants import USER_STATUS


class RegisterRequest(BaseModel):
    """Payload for public self-registration."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=150)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    username: str | None = Field(default=None, max_length=50)

    @field_validator("password")
    @classmethod
    def _strong_password(cls, value: str) -> str:
        if not any(c.isdigit() for c in value) or not any(
            c.isalpha() for c in value
        ):
            raise ValueError("Password must contain letters and numbers.")
        return value


class LoginRequest(BaseModel):
    """Payload for credential login."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    """Payload for refreshing access tokens."""

    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    """Payload to request a password reset."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload to set a new password."""

    token: str = Field(min_length=1)
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    """Payload to change password for an authenticated user."""

    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class OAuthLoginRequest(BaseModel):
    """Payload for Google OAuth login (id-token exchange)."""

    id_token: str = Field(min_length=1)
    user_agent: str | None = None
