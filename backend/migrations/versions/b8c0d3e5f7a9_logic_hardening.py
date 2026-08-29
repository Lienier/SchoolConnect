"""remove content approvals and add scoped event assignments

Revision ID: b8c0d3e5f7a9
Revises: a7b9c2d4e6f8
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "b8c0d3e5f7a9"
down_revision = "a7b9c2d4e6f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Preserve existing content while collapsing the old review lifecycle.
    op.execute(
        "UPDATE events SET status = 'approved' WHERE status = 'pending_approval'"
    )
    op.execute(
        "UPDATE events SET status = 'archived' WHERE status IN ('draft', 'returned')"
    )
    op.execute(
        "UPDATE announcements SET status = 'published', "
        "published_at = COALESCE(published_at, created_at) "
        "WHERE status = 'pending_approval'"
    )
    op.execute("UPDATE announcements SET status = 'archived' WHERE status = 'draft'")

    op.drop_table("event_approvals")
    op.drop_table("announcement_approvals")
    op.drop_table("email_verification_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_table("oauth_accounts")

    op.drop_constraint("ck_events_status", "events", type_="check")
    op.create_check_constraint(
        "ck_events_status",
        "events",
        "status IN ('approved','ongoing','completed','cancelled','archived')",
    )
    op.drop_constraint("ck_announcements_status", "announcements", type_="check")
    op.create_check_constraint(
        "ck_announcements_status",
        "announcements",
        "status IN ('published','archived')",
    )

    op.create_table(
        "event_officer_assignments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.UUID(), nullable=False),
        sa.Column("officer_id", sa.UUID(), nullable=False),
        sa.Column("assigned_by", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["officer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id", "officer_id", name="uq_event_officer_assignment"
        ),
    )
    op.create_index(
        op.f("ix_event_officer_assignments_event_id"),
        "event_officer_assignments",
        ["event_id"],
    )
    op.create_index(
        op.f("ix_event_officer_assignments_officer_id"),
        "event_officer_assignments",
        ["officer_id"],
    )

    # Older profiles had a section but no course column. Recover the full chain.
    op.execute(
        "UPDATE student_profiles AS sp SET course_id = s.course_id "
        "FROM sections AS s WHERE sp.section_id = s.id AND sp.course_id IS NULL"
    )
    op.execute(
        "UPDATE student_profiles AS sp SET department_id = c.department_id "
        "FROM courses AS c WHERE sp.course_id = c.id AND sp.department_id IS NULL"
    )
    op.execute(
        "UPDATE student_profiles SET profile_completed = true "
        "WHERE student_number IS NOT NULL AND department_id IS NOT NULL "
        "AND course_id IS NOT NULL AND section_id IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_event_officer_assignments_officer_id"),
        table_name="event_officer_assignments",
    )
    op.drop_index(
        op.f("ix_event_officer_assignments_event_id"),
        table_name="event_officer_assignments",
    )
    op.drop_table("event_officer_assignments")

    op.drop_constraint("ck_announcements_status", "announcements", type_="check")
    op.create_check_constraint(
        "ck_announcements_status",
        "announcements",
        "status IN ('draft','pending_approval','published','archived')",
    )
    op.drop_constraint("ck_events_status", "events", type_="check")
    op.create_check_constraint(
        "ck_events_status",
        "events",
        "status IN ('draft','pending_approval','approved','ongoing','completed','cancelled','archived','returned')",
    )

    op.create_table(
        "announcement_approvals",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("announcement_id", sa.UUID(), nullable=False),
        sa.Column("reviewer_id", sa.UUID(), nullable=False),
        sa.Column("decision", sa.String(length=20), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["announcement_id"], ["announcements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_announcement_approvals_announcement_id"),
        "announcement_approvals",
        ["announcement_id"],
    )
    op.create_table(
        "event_approvals",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.UUID(), nullable=False),
        sa.Column("reviewer_id", sa.UUID(), nullable=False),
        sa.Column("decision", sa.String(length=20), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_event_approvals_event_id"),
        "event_approvals",
        ["event_id"],
    )
    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_email_verification_tokens_user_id"), "email_verification_tokens", ["user_id"])
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"])
    op.create_table(
        "oauth_accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),
    )
    op.create_index(op.f("ix_oauth_accounts_user_id"), "oauth_accounts", ["user_id"])
