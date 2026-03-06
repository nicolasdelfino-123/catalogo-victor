"""add selected_size_ml to order_item

Revision ID: b72f8a19c4d1
Revises: 176a9e86de70
Create Date: 2026-03-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b72f8a19c4d1"
down_revision = "176a9e86de70"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("order_item", schema=None) as batch_op:
        batch_op.add_column(sa.Column("selected_size_ml", sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table("order_item", schema=None) as batch_op:
        batch_op.drop_column("selected_size_ml")
