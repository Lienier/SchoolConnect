"""Request validators for the attendance module (Pydantic)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class MarkAttendanceRequest(BaseModel):
    """Payload to manually mark a participant's attendance."""

    event_id: str
    user_id: str
    status: str

    @field_validator("status")
    @classmethod
    def _valid_status(cls, value: str) -> str:
        if value not in {"present", "absent", "excused", "late"}:
            raise ValueError("status must be present, absent, excused or late.")
        return value


class GenerateQrRequest(BaseModel):
    """Payload to generate a QR check-in token."""

    event_id: str
    user_id: Optional[str] = None
    ttl_minutes: int = Field(default=15, ge=1, le=1440)


class QrCheckInRequest(BaseModel):
    """Payload to check in using a QR token."""

    token: str = Field(min_length=1, max_length=64)
