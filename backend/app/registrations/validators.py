"""Request validators for the registration module (Pydantic)."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class RegistrationCreateRequest(BaseModel):
    """Payload to register an individual for an event."""

    event_id: str
    notes: Optional[str] = None


class TeamRegistrationRequest(BaseModel):
    """Payload to register a team for a team event."""

    event_id: str
    name: str = Field(min_length=1, max_length=120)
    member_ids: List[str] = Field(default_factory=list)


class RegistrationDecisionRequest(BaseModel):
    """Payload to approve or reject a registration."""

    decision: str
    notes: Optional[str] = None

    @field_validator("decision")
    @classmethod
    def _valid_decision(cls, value: str) -> str:
        if value not in {"approved", "rejected"}:
            raise ValueError("decision must be 'approved' or 'rejected'.")
        return value
