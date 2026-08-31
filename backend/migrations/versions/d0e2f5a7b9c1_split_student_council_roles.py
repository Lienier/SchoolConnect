"""split student council and department student leader roles

Revision ID: d0e2f5a7b9c1
Revises: c9d1e4f6a8b0
"""
from __future__ import annotations

from alembic import op


revision = "d0e2f5a7b9c1"
down_revision = "c9d1e4f6a8b0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE organizations SET organization_type = 'department_student_leaders' "
        "WHERE organization_type = 'department_council'"
    )
    op.drop_constraint("ck_organizations_type", "organizations", type_="check")
    op.create_check_constraint(
        "ck_organizations_type",
        "organizations",
        "organization_type IN ('college_wide','student_council','department_organization','department_student_leaders')",
    )


def downgrade() -> None:
    op.execute(
        "UPDATE organizations SET organization_type = 'department_council' "
        "WHERE organization_type = 'department_student_leaders'"
    )
    op.execute(
        "UPDATE organizations SET organization_type = 'college_wide' "
        "WHERE organization_type = 'student_council'"
    )
    op.drop_constraint("ck_organizations_type", "organizations", type_="check")
    op.create_check_constraint(
        "ck_organizations_type",
        "organizations",
        "organization_type IN ('college_wide','department_organization','department_council')",
    )
