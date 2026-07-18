"""Generic, framework-agnostic utility helpers."""

from app.utils.datetime import utcnow
from app.utils.security import generate_random_token

__all__ = ["utcnow", "generate_random_token"]
