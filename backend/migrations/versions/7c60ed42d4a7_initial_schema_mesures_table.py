"""initial_schema_mesures_table

Revision ID: 7c60ed42d4a7
Revises:
Create Date: 2026-04-11 19:17:03.833612

Creates the mesures table and performance indexes.
This migration matches the schema from docker/postgres/init.sql.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7c60ed42d4a7'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create mesures table and indexes."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS mesures (
            id          SERIAL PRIMARY KEY,
            device_id   VARCHAR(64) NOT NULL,
            temperature NUMERIC(5,2),
            humidite    NUMERIC(5,2),
            recu_le     TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_mesures_device_id ON mesures(device_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mesures_recu_le ON mesures(recu_le DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_mesures_device_time ON mesures(device_id, recu_le DESC)")


def downgrade() -> None:
    """Drop mesures table and indexes."""
    op.execute("DROP INDEX IF EXISTS idx_mesures_device_time")
    op.execute("DROP INDEX IF EXISTS idx_mesures_recu_le")
    op.execute("DROP INDEX IF EXISTS idx_mesures_device_id")
    op.execute("DROP TABLE IF EXISTS mesures")
