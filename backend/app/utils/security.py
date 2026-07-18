"""Security-related helpers."""

from __future__ import annotations

import secrets


def generate_random_token(num_bytes: int = 32) -> str:
    """Return a URL-safe cryptographically strong random token."""
    return secrets.token_urlsafe(num_bytes)
