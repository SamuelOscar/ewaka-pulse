import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ActivityType(str, enum.Enum):
    football = "football"
    dance = "dance"
    choir = "choir"
    drama = "drama"
    basketball = "basketball"
    volleyball = "volleyball"
    athletics = "athletics"
    vocational_tailoring = "vocational_tailoring"
    vocational_carpentry = "vocational_carpentry"
    vocational_cooking = "vocational_cooking"
    vocational_computing = "vocational_computing"
    other = "other"


class ParticipationLevel(str, enum.Enum):
    observer = "observer"
    active = "active"
    leader = "leader"


class VocationalStatus(str, enum.Enum):
    in_progress = "in_progress"
    certified = "certified"
    did_not_complete = "did_not_complete"


class Activity(Base):
    """
    Tracks sports, dance, drama, and vocational participation per child.
    FR-3.5 (Vocational) and FR-3.7 (Sports/Dance/Engagement).
    """
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), nullable=False, index=True
    )
    activity_type: Mapped[ActivityType] = mapped_column(
        SAEnum(ActivityType), nullable=False
    )
    activity_name: Mapped[str] = mapped_column(String(200), nullable=True)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    participation_level: Mapped[ParticipationLevel] = mapped_column(
        SAEnum(ParticipationLevel), nullable=False, default=ParticipationLevel.active
    )
    instructor_notes: Mapped[str] = mapped_column(Text, nullable=True)
    vocational_status: Mapped[VocationalStatus] = mapped_column(
        SAEnum(VocationalStatus), nullable=True
    )
    recorded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    child = relationship("Child")
    recorder = relationship("User")