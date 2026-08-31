"""Request validators for the users module (Pydantic)."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserCreateRequest(BaseModel):
    """Admin-created user."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    first_name: str | None = Field(default=None, max_length=80)
    middle_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    username: str | None = Field(default=None, max_length=50)
    role: str | None = None
    roles: list[str] = Field(default_factory=lambda: ["student"])
    status: str = "active"
    student_number: str | None = Field(default=None, max_length=30)
    department_id: str | None = None
    course_id: str | None = None
    section_id: str | None = None
    officer_position: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def validate_role_profile_fields(self):
        role = self.role or (self.roles[0] if self.roles else "student")
        if role in {"student", "student_council", "department_student_leader"} and not self.student_number:
            raise ValueError("Student ID number is required.")
        if role == "teacher" and not self.department_id:
            raise ValueError("Department is required for professors.")
        if role in {"student_council", "department_student_leader"} and not self.officer_position:
            raise ValueError("Officer role is required.")
        return self


class UserUpdateRequest(BaseModel):
    """Partial user update (admin)."""

    full_name: str | None = Field(default=None, max_length=150)
    first_name: str | None = Field(default=None, max_length=80)
    middle_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    username: str | None = Field(default=None, max_length=50)
    status: str | None = None
    phone: str | None = Field(default=None, max_length=30)


class AssignRolesRequest(BaseModel):
    """Assign a set of roles to a user."""

    roles: list[str] = Field(min_length=1)
    student_number: str | None = Field(default=None, max_length=30)
    department_id: str | None = None
    course_id: str | None = None
    section_id: str | None = None
    officer_position: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def validate_role_profile_fields(self):
        role_names = set(self.roles)
        if {"student_council", "department_student_leader"}.issubset(role_names):
            raise ValueError("Choose either Student Council or Department Student Leader, not both.")
        if role_names.intersection({"student_council", "department_student_leader"}):
            if not self.officer_position:
                raise ValueError("Officer position is required.")
        if "department_student_leader" in role_names:
            if not self.department_id:
                raise ValueError("Department is required for Department Student Leaders.")
            if not self.course_id:
                raise ValueError("Course is required for Department Student Leaders.")
        return self


class ProfileUpdateRequest(BaseModel):
    """Self-service profile update for the authenticated user."""

    phone: str | None = Field(default=None, max_length=30)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)


class StudentProfileUpdateRequest(BaseModel):
    """Student-managed college structure fields."""

    department_id: str
    course_id: str
    section_id: str


class AdminResetPasswordRequest(BaseModel):
    """Admin-initiated password reset for another user."""

    new_password: str = Field(min_length=8, max_length=128)


class SetAvatarRequest(BaseModel):
    """Set a user's profile picture URL (upload handled separately)."""

    avatar_url: str = Field(min_length=1, max_length=2000)
