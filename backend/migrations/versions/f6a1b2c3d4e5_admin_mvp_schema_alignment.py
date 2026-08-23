"""admin mvp schema alignment

Revision ID: f6a1b2c3d4e5
Revises: e4f7a8b9c0d1
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "f6a1b2c3d4e5"
down_revision = "e4f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "event_requirements",
        sa.Column("requirement_value", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "teams",
        sa.Column("team_code", sa.String(length=10), nullable=True),
    )
    op.execute(
        "UPDATE teams SET team_code = 'SC-' || substring(md5(id::text), 1, 4) "
        "WHERE team_code IS NULL"
    )
    op.alter_column("teams", "team_code", nullable=False)
    op.create_index(op.f("ix_teams_team_code"), "teams", ["team_code"], unique=True)
    op.drop_constraint("ck_events_status", "events", type_="check")
    op.create_check_constraint(
        "ck_events_status",
        "events",
        "status IN ('draft','pending_approval','approved','ongoing','completed','cancelled','archived','returned')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_events_status", "events", type_="check")
    op.create_check_constraint(
        "ck_events_status",
        "events",
        "status IN ('draft','pending_approval','approved','ongoing','completed','cancelled','archived')",
    )
    op.drop_index(op.f("ix_teams_team_code"), table_name="teams")
    op.drop_column("teams", "team_code")
    op.drop_column("event_requirements", "requirement_value")
