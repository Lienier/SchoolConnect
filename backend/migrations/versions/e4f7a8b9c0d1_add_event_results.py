"""add structured event results

Revision ID: e4f7a8b9c0d1
Revises: d1c5f8e2b9a4
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e4f7a8b9c0d1"
down_revision = "d1c5f8e2b9a4"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "event_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("placement", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("winner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("attachment_file_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["winner_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["attachment_file_id"], ["uploaded_files.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_event_results_event_id", "event_results", ["event_id"])

def downgrade():
    op.drop_index("ix_event_results_event_id", table_name="event_results")
    op.drop_table("event_results")
