"""create class enrollments table manually

Revision ID: bec2b622b374
Revises: 76c02d2d607b
Create Date: 2026-05-13 17:06:36.971662

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bec2b622b374'
down_revision: Union[str, None] = '76c02d2d607b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'class_enrollments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id'), nullable=False, index=True),
        sa.Column('class_id', sa.String(36), sa.ForeignKey('classes.id'), nullable=False, index=True),
        sa.Column('enrolled_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('child_id', name='uq_enrollment_child'),
    )
    op.create_index('ix_class_enrollments_child_id', 'class_enrollments', ['child_id'])
    op.create_index('ix_class_enrollments_class_id', 'class_enrollments', ['class_id'])


def downgrade() -> None:
    op.drop_table('class_enrollments')
