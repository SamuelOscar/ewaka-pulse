import uuid
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class BiometricRecord(Base):
    """
    Health stats per child at intake and scheduled check-ins.
    FR-2.6 — Classified SENSITIVE.
    Visible to Admin and Counselor roles only.
    """

    __tablename__ = "biometric_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), nullable=False, index=True
    )
    record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    height_cm: Mapped[float] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=True)
    allergies: Mapped[str] = mapped_column(String(500), nullable=True)
    blood_type: Mapped[str] = mapped_column(String(10), nullable=True)
    health_notes: Mapped[str] = mapped_column(Text, nullable=True)
    next_checkup_date: Mapped[date] = mapped_column(Date, nullable=True)
    recorded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    child = relationship("Child")
    recorder = relationship("User")
