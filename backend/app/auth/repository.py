"""Data-access layer for the auth module."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.auth.model import (
    EmailVerificationToken,
    OAuthAccount,
    PasswordResetToken,
    RefreshToken,
    User,
)
from app.extensions import db
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Persistence operations for ``User``."""

    def __init__(self) -> None:
        super().__init__(User)

    def get_by_email(self, email: str, include_deleted: bool = False) -> User | None:
        """Return a user by email (case-insensitive via CITEXT)."""
        stmt = select(User).where(User.email == email)
        if not include_deleted:
            stmt = stmt.where(User.deleted_at.is_(None))
        return db.session.scalar(stmt)

    def get_by_username(self, username: str) -> User | None:
        """Return a user by username."""
        stmt = select(User).where(User.username == username)
        return db.session.scalar(stmt)


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    """Persistence operations for ``RefreshToken``."""

    def __init__(self) -> None:
        super().__init__(RefreshToken)

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        """Return a refresh token row by its stored hash."""
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        return db.session.scalar(stmt)

    def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        """Revoke every active refresh token for a user (logout everywhere)."""
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        for token in db.session.scalars(stmt).all():
            token.revoked_at = datetime.now(timezone.utc)
        db.session.flush()


class OAuthAccountRepository(BaseRepository[OAuthAccount]):
    """Persistence operations for ``OAuthAccount``."""

    def __init__(self) -> None:
        super().__init__(OAuthAccount)

    def get_by_provider(
        self, provider: str, provider_user_id: str
    ) -> OAuthAccount | None:
        """Return a linked OAuth account by provider identity."""
        stmt = select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id,
        )
        return db.session.scalar(stmt)


class PasswordResetTokenRepository(BaseRepository[PasswordResetToken]):
    """Persistence operations for ``PasswordResetToken``."""

    def __init__(self) -> None:
        super().__init__(PasswordResetToken)


class EmailVerificationTokenRepository(BaseRepository[EmailVerificationToken]):
    """Persistence operations for ``EmailVerificationToken``."""

    def __init__(self) -> None:
        super().__init__(EmailVerificationToken)
