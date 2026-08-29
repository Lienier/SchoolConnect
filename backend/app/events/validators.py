"""Request validators for the events module (Pydantic)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class EventCreateRequest(BaseModel):
    """Payload to create an event (draft or submitted for approval)."""

    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    category_id: Optional[str] = None
    start_time: str
    end_time: str
    location: Optional[str] = Field(default=None, max_length=200)
    capacity: Optional[int] = Field(default=None, ge=0)
    registration_deadline: Optional[str] = None
    is_team_event: bool = False
    max_team_size: Optional[int] = Field(default=None, ge=2)


class EventUpdateRequest(BaseModel):
    """Payload to update a draft/pending event."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    category_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = Field(default=None, max_length=200)
    capacity: Optional[int] = Field(default=None, ge=0)
    registration_deadline: Optional[str] = None
    is_team_event: Optional[bool] = None
    max_team_size: Optional[int] = Field(default=None, ge=2)


class EventStatusRequest(BaseModel):
    """Payload to transition an event lifecycle status."""

    status: str


class EventOfficerAssignmentRequest(BaseModel):
    """Replace the Student Council officers assigned to an event."""

    officer_ids: list[str] = Field(default_factory=list)


class EventResultRequest(BaseModel):
    placement: Optional[int] = Field(default=None, ge=1)
    title: str = Field(min_length=1, max_length=160)
    winner_user_id: Optional[str] = None
    team_id: Optional[str] = None
    remarks: Optional[str] = None
    attachment_file_id: Optional[str] = None


class EventCategoryCreateRequest(BaseModel):
    """Payload to create an event category."""

    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(min_length=1, max_length=80)
    description: Optional[str] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
