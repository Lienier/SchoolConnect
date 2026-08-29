"""account creation profile fields

Revision ID: a7b9c2d4e6f8
Revises: f6a1b2c3d4e5
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "a7b9c2d4e6f8"
down_revision = "f6a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("middle_name", sa.String(length=80), nullable=True))
    op.add_column("student_profiles", sa.Column("course_id", sa.UUID(), nullable=True))
    op.add_column("student_profiles", sa.Column("profile_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index(op.f("ix_student_profiles_course_id"), "student_profiles", ["course_id"], unique=False)
    op.create_foreign_key(
        "fk_student_profiles_course_id_courses",
        "student_profiles",
        "courses",
        ["course_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_student_profiles_course_id_courses", "student_profiles", type_="foreignkey")
    op.drop_index(op.f("ix_student_profiles_course_id"), table_name="student_profiles")
    op.drop_column("student_profiles", "profile_completed")
    op.drop_column("student_profiles", "course_id")
    op.drop_column("users", "middle_name")
