"""Framework-agnostic datetime helpers shared across the application."""

from __future__ import annotations

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from flask import current_app


def utcnow() -> datetime:
    """Return the current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def app_timezone() -> ZoneInfo:
    """Return the configured application timezone."""
    return ZoneInfo(current_app.config.get("APP_TIMEZONE", "Asia/Manila"))


def today_in_app_timezone() -> date:
    """Return today's date in the configured application timezone."""
    return datetime.now(app_timezone()).date()


def date_in_app_timezone(value: datetime) -> date:
    """Return a datetime's calendar date in the configured application timezone."""
    if value.tzinfo is None:
        return value.date()
    return value.astimezone(app_timezone()).date()
