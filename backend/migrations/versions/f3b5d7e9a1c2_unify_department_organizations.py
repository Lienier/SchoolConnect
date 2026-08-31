"""unify department organizations

Revision ID: f3b5d7e9a1c2
Revises: e2a4c6d8f0b1
"""
from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa


revision = "f3b5d7e9a1c2"
down_revision = "e2a4c6d8f0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    op.execute(
        """
        UPDATE officer_profiles
        SET organization_id = existing.id
        FROM organizations old_org
        JOIN organizations existing
          ON existing.department_id = old_org.department_id
         AND existing.organization_type = 'department_organization'
        WHERE officer_profiles.organization_id = old_org.id
          AND old_org.organization_type = 'department_student_leaders'
        """
    )
    rows = connection.execute(
        sa.text(
            """
            SELECT existing.id AS organization_id, old_positions.name, old_positions.sort_order, old_positions.created_at
            FROM organization_positions old_positions
            JOIN organizations old_org ON old_org.id = old_positions.organization_id
            JOIN organizations existing
              ON existing.department_id = old_org.department_id
             AND existing.organization_type = 'department_organization'
            WHERE old_org.organization_type = 'department_student_leaders'
              AND NOT EXISTS (
                SELECT 1 FROM organization_positions current_positions
                WHERE current_positions.organization_id = existing.id
                  AND lower(current_positions.name) = lower(old_positions.name)
              )
            """
        )
    ).mappings()
    for row in rows:
        connection.execute(
            sa.text(
                """
                INSERT INTO organization_positions (id, organization_id, name, sort_order, created_at)
                VALUES (:id, :organization_id, :name, :sort_order, :created_at)
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "organization_id": row["organization_id"],
                "name": row["name"],
                "sort_order": row["sort_order"],
                "created_at": row["created_at"],
            },
        )
    op.execute(
        """
        DELETE FROM organizations old_org
        USING organizations existing
        WHERE old_org.organization_type = 'department_student_leaders'
          AND existing.organization_type = 'department_organization'
          AND existing.department_id = old_org.department_id
        """
    )
    op.execute(
        "UPDATE organizations SET organization_type = 'department_organization' "
        "WHERE organization_type = 'department_student_leaders'"
    )
    op.drop_constraint("ck_organizations_type", "organizations", type_="check")
    op.create_check_constraint(
        "ck_organizations_type",
        "organizations",
        "organization_type IN ('college_wide','student_council','department_organization')",
    )
    _seed_department_organization_positions(connection)


def downgrade() -> None:
    op.drop_constraint("ck_organizations_type", "organizations", type_="check")
    op.create_check_constraint(
        "ck_organizations_type",
        "organizations",
        "organization_type IN ('college_wide','student_council','department_organization','department_student_leaders')",
    )


def _seed_department_organization_positions(connection) -> None:
    defaults = ["Governor", "Vice Governor", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"]
    organizations = connection.execute(
        sa.text(
            """
            SELECT organizations.id
            FROM organizations
            WHERE organizations.organization_type = 'department_organization'
              AND NOT EXISTS (
                SELECT 1 FROM organization_positions
                WHERE organization_positions.organization_id = organizations.id
              )
            """
        )
    ).mappings()
    for organization in organizations:
        for sort_order, name in enumerate(defaults):
            connection.execute(
                sa.text(
                    """
                    INSERT INTO organization_positions (id, organization_id, name, sort_order)
                    VALUES (:id, :organization_id, :name, :sort_order)
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "organization_id": organization["id"],
                    "name": name,
                    "sort_order": sort_order,
                },
            )
