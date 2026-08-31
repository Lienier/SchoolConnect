"""link organizations to departments

Revision ID: c9d1e4f6a8b0
Revises: b8c0d3e5f7a9
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "c9d1e4f6a8b0"
down_revision = "b8c0d3e5f7a9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column(
            "organization_type",
            sa.String(length=40),
            server_default="college_wide",
            nullable=False,
        ),
    )
    op.add_column(
        "organizations",
        sa.Column("department_id", sa.UUID(), nullable=True),
    )
    op.create_index(op.f("ix_organizations_department_id"), "organizations", ["department_id"])
    op.create_foreign_key(
        "fk_organizations_department_id_departments",
        "organizations",
        "departments",
        ["department_id"],
        ["id"],
    )
    op.create_check_constraint(
        "ck_organizations_type",
        "organizations",
            "organization_type IN ('college_wide','student_council','department_organization','department_student_leaders')",
    )
    op.create_unique_constraint(
        "uq_organizations_department_type",
        "organizations",
        ["department_id", "organization_type"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_organizations_department_type", "organizations", type_="unique")
    op.drop_constraint("ck_organizations_type", "organizations", type_="check")
    op.drop_constraint("fk_organizations_department_id_departments", "organizations", type_="foreignkey")
    op.drop_index(op.f("ix_organizations_department_id"), table_name="organizations")
    op.drop_column("organizations", "department_id")
    op.drop_column("organizations", "organization_type")
