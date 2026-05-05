import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    excused = "excused"


class Attendance(Base):
    """
    Daily attendance record per child.

    SECURITY:
    - UniqueConstraint on (child_id, date) prevents double-marking
      at the DATABASE level — not just application logic.
    - Records older than 7 days are locked at the API level.
    - Admin override required for historical corrections.
    """
    __tablename__ = "attendance"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), nullable=False, index=True
    )
    class_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("classes.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        SAEnum(AttendanceStatus), nullable=False
    )
    marked_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # SECURITY: One record per child per day — enforced at DB level
    __table_args__ = (
        UniqueConstraint("child_id", "date", name="uq_attendance_child_date"),
    )

    # Relationships
    child = relationship("Child")
    class_group = relationship("ClassGroup", back_populates="attendance_records")
    marked_by_user = relationship("User")