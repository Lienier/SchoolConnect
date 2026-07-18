"""Request validators for the notifications module (Pydantic)."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class BroadcastRequest(BaseModel):
    """Payload to send a notification to one or more users."""

    user_ids: List[str] = Field(min_length=1)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    category: str = "general"


class TemplateCreateRequest(BaseModel):
    """Payload to create a notification template."""

    code: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    channel: str = "in_app"
