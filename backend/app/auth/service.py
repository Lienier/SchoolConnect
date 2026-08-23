"""Business logic for the auth module.

Handles password hashing, JWT issuance/rotation, refresh-token storage,
password reset, email verification and Google OAuth linkage. Services raise
domain exceptions; routes translate them into standardized responses.
"""

from __future__ import annotations

import uuid
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token

from app.auth.constants import OAUTH_PROVIDERS
from app.auth.model import OAuthAccount, RefreshToken, User
from app.auth.repository import (
    EmailVerificationTokenRepository,
    OAuthAccountRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    UserRepository,
)
from app.common.exceptions import AuthenticationError, ConflictError, NotFoundError, ValidationError
from app.permissions.model import Role, UserRole
from app.utils.security import generate_random_token

# Token lifetime mirrors JWT config but is enforced on the hashed refresh row.
REFRESH_TOKEN_BYTES = 48
RESET_TOKEN_TTL_HOURS = 1
VERIFY_TOKEN_TTL_HOURS = 24


class AuthService:
    """Coordinates authentication workflows across repositories."""

    def __init__(self) -> None:
        self.users = UserRepository()
        self.refresh_tokens = RefreshTokenRepository()
        self.oauth = OAuthAccountRepository()
        self.resets = PasswordResetTokenRepository()
        self.verifications = EmailVerificationTokenRepository()

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

    # --- registration -----------------------------------------------------
    def register(
        self, *, email: str, password: str, full_name: str, first_name=None,
        last_name=None, username=None,
    ) -> User:
        """Create a new user with the default ``student`` role."""
        if self.users.get_by_email(email):
            raise ConflictError("An account with this email already exists.")
        if username and self.users.get_by_username(username):
            raise ConflictError("This username is already taken.")

        user = User(
            email=email,
            password_hash=self._hash_password(password),
            full_name=full_name,
            first_name=first_name,
            last_name=last_name,
            username=username,
            status="active",
        )
        self.users.add(user)
        self.users.flush()
        self._assign_default_role(user)
        self.users.commit()
        return user

    def _assign_default_role(self, user: User) -> None:
        """Assign the default ``student`` role to a new user."""
        role = self._get_role_by_name("student")
        link = UserRole(user_id=user.id, role_id=role.id)
        from app.extensions import db

        db.session.add(link)
        db.session.flush()

    @staticmethod
    def _get_role_by_name(name: str) -> Role:
        from app.extensions import db
        from sqlalchemy import select

        role = db.session.scalar(select(Role).where(Role.name == name))
        if role is None:
            raise NotFoundError(f"Default role '{name}' not found. Run seed first.")
        return role

    # --- login ------------------------------------------------------------
    def authenticate(self, *, email: str, password: str) -> User:
        """Validate credentials and return the active user."""
        user = self.users.get_by_email(email)
        if user is None or user.password_hash is None:
            raise AuthenticationError("Invalid email or password.")
        if not self._verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid email or password.")
        if user.status not in ("active", "invited"):
            raise AuthenticationError("This account is not active.")
        return user

    # --- token issuance ---------------------------------------------------
    def issue_tokens(self, user: User, *, user_agent=None, ip_address=None) -> tuple[str, str]:
        """Create access + refresh tokens and persist the refresh hash."""
        access = create_access_token(identity=str(user.id))
        raw_refresh = generate_random_token(REFRESH_TOKEN_BYTES)
        refresh = create_refresh_token(identity=str(user.id))

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
        db.session.commit()
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
        if user is None or user.status not in ("active", "invited"):
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

    # --- password reset ---------------------------------------------------
    def create_password_reset(self, email: str) -> str | None:
        """Generate a reset token; returns raw token or None if no user."""
        from app.auth.model import PasswordResetToken

        user = self.users.get_by_email(email)
        if user is None:
            return None
        raw = generate_random_token(REFRESH_TOKEN_BYTES)
        row = PasswordResetToken(
            user_id=user.id,
            token_hash=self._sha256(raw),
            expires_at=datetime.now(timezone.utc)
            + timedelta(hours=RESET_TOKEN_TTL_HOURS),
        )
        self.resets.add(row)
        self.resets.commit()
        return raw

    def reset_password(self, token: str, new_password: str) -> None:
        """Consume a reset token and set a new password."""
        from sqlalchemy import select
        from app.auth.model import PasswordResetToken
        from app.extensions import db

        row = db.session.scalar(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == self._sha256(token)
            )
        )
        if row is None or row.consumed_at is not None:
            raise ValidationError("Invalid or expired reset token.")
        if row.expires_at < datetime.now(timezone.utc):
            raise ValidationError("Invalid or expired reset token.")
        user = self.users.get_by_id(row.user_id)
        if user is None:
            raise NotFoundError("User not found.")
        user.password_hash = self._hash_password(new_password)
        row.consumed_at = datetime.now(timezone.utc)
        self.refresh_tokens.revoke_all_for_user(user.id)
        self.users.commit()

    # --- email verification ----------------------------------------------
    def create_email_verification(self, user: User) -> str:
        """Generate an email verification token for ``user``."""
        from app.auth.model import EmailVerificationToken

        raw = generate_random_token(REFRESH_TOKEN_BYTES)
        row = EmailVerificationToken(
            user_id=user.id,
            token_hash=self._sha256(raw),
            expires_at=datetime.now(timezone.utc)
            + timedelta(hours=VERIFY_TOKEN_TTL_HOURS),
        )
        self.verifications.add(row)
        self.verifications.commit()
        return raw

    def verify_email(self, token: str) -> None:
        """Mark a user's email as verified using the token."""
        from sqlalchemy import select
        from app.auth.model import EmailVerificationToken
        from app.extensions import db

        row = db.session.scalar(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash == self._sha256(token)
            )
        )
        if row is None or row.verified_at is not None:
            raise ValidationError("Invalid verification token.")
        if row.expires_at < datetime.now(timezone.utc):
            raise ValidationError("Verification token expired.")
        user = self.users.get_by_id(row.user_id)
        if user is None:
            raise NotFoundError("User not found.")
        user.email_verified = True
        row.verified_at = datetime.now(timezone.utc)
        self.users.commit()

    # --- OAuth ------------------------------------------------------------
    def oauth_login_or_register(
        self, *, provider: str, provider_user_id: str, email: str,
        full_name: str,
    ) -> User:
        """Find or create a user from an external OAuth identity."""
        if provider not in OAUTH_PROVIDERS:
            raise ValidationError("Unsupported OAuth provider.")
        account = self.oauth.get_by_provider(provider, provider_user_id)
        if account is not None:
            return self.users.get_by_id(account.user_id)

        user = self.users.get_by_email(email)
        if user is None:
            user = User(
                email=email,
                full_name=full_name,
                status="active",
                email_verified=True,
            )
            self.users.add(user)
            self.users.flush()
            self._assign_default_role(user)
        account = OAuthAccount(
            user_id=user.id, provider=provider, provider_user_id=provider_user_id
        )
        self.oauth.add(account)
        self.users.commit()
        return user

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
