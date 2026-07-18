"""Pydantic request validators for the roles module."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoleCreateRequest(BaseModel):
    """Payload for creating a new role."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=2, max_length=50)
    display_name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    priority: int | None = Field(default=None, ge=0, le=1000)
    permissions: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def _normalize_name(cls, value: str) -> str:
        """Normalize role names to lowercase snake-like identifiers."""
        normalized = value.strip().lower().replace(" ", "_").replace("-", "_")
        if not normalized.replace("_", "").isalnum():
            raise ValueError(
                "Role name may only contain letters, numbers and underscores."
            )
        return normalized


class RoleUpdateRequest(BaseModel):
    """Payload for updating a role's descriptive fields."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    display_name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    priority: int | None = Field(default=None, ge=0, le=1000)


class AssignPermissionsRequest(BaseModel):
    """Payload for replacing a role's permission set."""

    model_config = ConfigDict(extra="forbid")

    permissions: list[str] = Field(default_factory=list)


class CloneRoleRequest(BaseModel):
    """Payload for cloning an existing role."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=2, max_length=50)
    display_name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def _normalize_name(cls, value: str) -> str:
        """Normalize cloned role names identically to creation."""
        normalized = value.strip().lower().replace(" ", "_").replace("-", "_")
        if not normalized.replace("_", "").isalnum():
            raise ValueError(
                "Role name may only contain letters, numbers and underscores."
            )
        return normalized
