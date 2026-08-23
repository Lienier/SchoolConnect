"""add_is_emergency_to_announcements

Revision ID: d1c5f8e2b9a4
Revises: ca82aa182ec3
Create Date: 2026-07-26 13:40:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d1c5f8e2b9a4"
down_revision = "ca82aa182ec3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column("is_emergency", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("announcements", "is_emergency", server_default=None)


def downgrade() -> None:
    op.drop_column("announcements", "is_emergency")
