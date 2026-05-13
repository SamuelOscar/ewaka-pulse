import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, Enum as SAEnum, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SessionType(str, enum.Enum):
    individual = "individual"
    group = "group"
    emergency = "emergency"
    follow_up = "follow_up"


class WellbeingRating(int, enum.Enum):
    very_low = 1
    low = 2
    moderate = 3
    good = 4
    excellent = 5


class MentalHealthLog(Base):
    """
    Counseling session log per child.
    FR-3.6 — MOST SENSITIVE module in the system.

    ACCESS RULES (enforced at API layer):
    - Counselor: can create and view logs for ANY child
    - Admin: full access
    - ALL other roles: 403 Forbidden — no exceptions
    - Must never appear in exported reports without Admin approval
    """
    __tablename__ = "mental_health_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), nullable=False, index=True
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    session_type: Mapped[SessionType] = mapped_column(
        SAEnum(SessionType), nullable=False
    )
    wellbeing_rating: Mapped[int] = mapped_column(Integer, nullable=True)
    # Notes stored as plain text for now
    # Phase 3: field-level encryption added before production
    session_notes: Mapped[str] = mapped_column(Text, nullable=True)
    trauma_milestone: Mapped[str] = mapped_column(String(500), nullable=True)
    action_items: Mapped[str] = mapped_column(Text, nullable=True)
    next_session_date: Mapped[date] = mapped_column(Date, nullable=True)
    counselor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    child = relationship("Child")
    counselor = relationship("User")