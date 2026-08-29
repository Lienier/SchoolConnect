"""Business logic for the auth module.

Handles password hashing, JWT issuance/rotation, refresh-token storage, and
authenticated password changes.
"""

from __future__ import annotations

import uuid
import hashlib
from datetime import datetime, timezone

import bcrypt
from flask_jwt_extended import create_access_token

from app.auth.model import RefreshToken, User
from app.auth.repository import (
    RefreshTokenRepository,
    UserRepository,
)
from app.common.exceptions import AuthenticationError, ValidationError
from app.utils.security import generate_random_token

# Token lifetime mirrors JWT config but is enforced on the hashed refresh row.
REFRESH_TOKEN_BYTES = 48


class AuthService:
    """Coordinates authentication workflows across repositories."""

    def __init__(self) -> None:
        self.users = UserRepository()
        self.refresh_tokens = RefreshTokenRepository()

    # --- password helpers -------------------------------------------------
    @staticmethod
    def _hash_password(password: str) -> str:
        """Return a bcrypt hash for ``password``."""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def _verify_password(password: str, password_hash: str) -> bool:
        """Return whether ``password`` matches ``password_hash``."""
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

    @staticmethod
    def _sha256(value: str) -> str:
        """Return the hex SHA-256 digest of a raw token (store hash only)."""
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    # --- login ------------------------------------------------------------
    def authenticate(self, *, email: str, password: str) -> User:
        """Validate credentials and return the active user."""
        user = self.users.get_by_email(email)
        if user is None or user.password_hash is None:
            raise AuthenticationError("Invalid email or password.")
        if not self._verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid email or password.")
        if user.status != "active":
            raise AuthenticationError("This account is not active.")
        return user

    # --- token issuance ---------------------------------------------------
    def issue_tokens(
        self, user: User, *, user_agent=None, ip_address=None, commit: bool = True
    ) -> tuple[str, str]:
        """Create access + refresh tokens and persist the refresh hash."""
        access = create_access_token(identity=str(user.id))
        raw_refresh = generate_random_token(REFRESH_TOKEN_BYTES)

        from app.extensions import db
        from datetime import timedelta as _td
        from flask import current_app

        expires = datetime.now(timezone.utc) + current_app.config.get(
            "JWT_REFRESH_TOKEN_EXPIRES", _td(days=7)
        )
        token_row = RefreshToken(
            user_id=user.id,
            token_hash=self._sha256(raw_refresh),
            expires_at=expires,
            user_agent=user_agent,
            ip_address=ip_address,
            revoked_at=None,
        )
        db.session.add(token_row)
        if commit:
            db.session.commit()
        else:
            db.session.flush()
        # Return the *raw* refresh token to the client (only stored as hash).
        return access, raw_refresh

    def rotate_refresh_token(self, raw_refresh: str) -> tuple[str, str, User]:
        """Validate a refresh token, revoke it, and issue a new pair."""
        from sqlalchemy import select
        from app.extensions import db

        token_hash = self._sha256(raw_refresh)
        # Serialize rotation so two concurrent requests cannot both consume
        # the same refresh token.
        row = db.session.scalar(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .with_for_update()
        )
        if row is None or row.revoked_at is not None:
            raise AuthenticationError("Invalid refresh token.")
        if row.expires_at < datetime.now(timezone.utc):
            raise AuthenticationError("Refresh token expired.")
        user = self.users.get_by_id(row.user_id)
        if user is None or user.status != "active":
            raise AuthenticationError("User is no longer active.")
        row.revoked_at = datetime.now(timezone.utc)
        self.refresh_tokens.commit()
        access, new_raw = self.issue_tokens(user)
        return access, new_raw, user

    def revoke_sessions(self, user_id: uuid.UUID) -> None:
        """Revoke all refresh sessions for a user."""
        self.refresh_tokens.revoke_all_for_user(user_id)
        self.refresh_tokens.commit()

    def logout(self, raw_refresh: str | None = None, revoke_all: bool = False) -> None:
        """Revoke refresh token(s) for logout."""
        if revoke_all and raw_refresh is None:
            return
        if raw_refresh:
            row = self.refresh_tokens.get_by_hash(self._sha256(raw_refresh))
            if row is not None:
                row.revoked_at = datetime.now(timezone.utc)
                self.refresh_tokens.commit()

    def change_password(
        self, user: User, *, current_password: str, new_password: str
    ) -> None:
        """Verify the current password and set a new one."""
        if user.password_hash is None:
            raise ValidationError("This account uses social login.")
        if not self._verify_password(current_password, user.password_hash):
            raise AuthenticationError("Current password is incorrect.")
        user.password_hash = self._hash_password(new_password)
        self.refresh_tokens.revoke_all_for_user(user.id)
        self.users.commit()
