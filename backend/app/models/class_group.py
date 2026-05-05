import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ClassGroup(Base):
    """
    Represents a class or group at the village.
    e.g. "Primary 5", "Secondary 1", "Vocational Group A"
    Named ClassGroup to avoid conflict with Python's built-in 'class' keyword.
    """
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    village_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("villages.id"), nullable=False
    )
    # The teacher responsible for this class
    teacher_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    village = relationship("Village")
    teacher = relationship("User")
    attendance_records = relationship("Attendance", back_populates="class_group")