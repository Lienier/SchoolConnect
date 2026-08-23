"""Request validators for the announcements module (Pydantic)."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class AnnouncementCreateRequest(BaseModel):
    """Payload to create a draft announcement."""

    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    summary: Optional[str] = Field(default=None, max_length=300)
    category_id: Optional[str] = None
    priority: str = "normal"
    target_audience: Optional[List[str]] = None
    expires_at: Optional[str] = None
    submit_for_approval: bool = False

    @field_validator("priority")
    @classmethod
    def _valid_priority(cls, value: str) -> str:
        allowed = {"normal", "important", "urgent"}
        if value not in allowed:
            raise ValueError("priority must be normal, important or urgent.")
        return value


class AnnouncementUpdateRequest(BaseModel):
    """Payload to update a draft announcement."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    body: Optional[str] = Field(default=None, min_length=1)
    summary: Optional[str] = Field(default=None, max_length=300)
    category_id: Optional[str] = None
    priority: Optional[str] = None
    target_audience: Optional[List[str]] = None
    expires_at: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def _valid_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        allowed = {"normal", "important", "urgent"}
        if value not in allowed:
            raise ValueError("priority must be normal, important or urgent.")
        return value


class AnnouncementApprovalRequest(BaseModel):
    """Payload to approve, reject, or return an announcement."""

    decision: str  # approved | rejected | returned
    comment: Optional[str] = None

    @field_validator("decision")
    @classmethod
    def _valid_decision(cls, value: str) -> str:
        if value not in {"approved", "rejected", "returned"}:
            raise ValueError("decision must be approved, rejected, or returned.")
        return value


class CategoryCreateRequest(BaseModel):
    """Payload to create an announcement category."""

    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(min_length=1, max_length=80)
    description: Optional[str] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
