import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class ChildStatus(str, enum.Enum):
    active = "active"
    alumni = "alumni"
    transferred = "transferred"
    withdrawn = "withdrawn"


class Child(Base):
    __tablename__ = "children"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # Immutable display code — EP-2026-0001
    child_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Gender] = mapped_column(SAEnum(Gender), nullable=False)
    nationality: Mapped[str] = mapped_column(String(100), nullable=True)
    village_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("villages.id"), nullable=False
    )
    date_of_arrival: Mapped[date] = mapped_column(Date, nullable=False)
    class_grade: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[ChildStatus] = mapped_column(
        SAEnum(ChildStatus), nullable=False, default=ChildStatus.active
    )
    guardian_name: Mapped[str] = mapped_column(String(200), nullable=True)
    guardian_contact: Mapped[str] = mapped_column(String(50), nullable=True)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    village = relationship("Village", back_populates="children")
