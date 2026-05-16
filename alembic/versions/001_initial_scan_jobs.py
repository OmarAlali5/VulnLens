"""initial scan_jobs table

Revision ID: 001
Revises:
Create Date: 2026-05-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    scan_status = sa.Enum(
        "PENDING",
        "RUNNING",
        "COMPLETED",
        "FAILED",
        name="scan_status",
    )
    scan_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "scan_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("target_url", sa.String(length=2048), nullable=False),
        sa.Column("status", scan_status, nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("result_payload", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("scan_jobs")
    sa.Enum(name="scan_status").drop(op.get_bind(), checkfirst=True)
