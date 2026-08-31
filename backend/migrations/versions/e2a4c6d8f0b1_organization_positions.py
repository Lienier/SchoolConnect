"""organization positions

Revision ID: e2a4c6d8f0b1
Revises: d0e2f5a7b9c1
"""
from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "e2a4c6d8f0b1"
down_revision = "d0e2f5a7b9c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_organization_positions_org_name"),
    )
    op.create_index(op.f("ix_organization_positions_organization_id"), "organization_positions", ["organization_id"])
    op.alter_column("organization_positions", "sort_order", server_default=None)
    _seed_existing_positions()


def downgrade() -> None:
    op.drop_index(op.f("ix_organization_positions_organization_id"), table_name="organization_positions")
    op.drop_table("organization_positions")


def _seed_existing_positions() -> None:
    connection = op.get_bind()
    organizations = connection.execute(
        sa.text(
            "SELECT id, organization_type FROM organizations "
            "WHERE organization_type IN ('student_council', 'department_student_leaders')"
        )
    ).mappings()
    defaults = {
        "student_council": ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"],
        "department_student_leaders": ["Governor", "Vice Governor", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"],
    }
    for organization in organizations:
        for sort_order, name in enumerate(defaults[organization["organization_type"]]):
            connection.execute(
                sa.text(
                    "INSERT INTO organization_positions (id, organization_id, name, sort_order) "
                    "VALUES (:id, :organization_id, :name, :sort_order)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "organization_id": organization["id"],
                    "name": name,
                    "sort_order": sort_order,
                },
            )
