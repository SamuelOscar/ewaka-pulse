import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    volunteer = "volunteer"


class StaffStatus(str, enum.Enum):
    active = "active"
    on_leave = "on_leave"
    resigned = "resigned"
    retired = "retired"


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    staff_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_title: Mapped[str] = mapped_column(String(150), nullable=True)
    department: Mapped[str] = mapped_column(String(150), nullable=True)
    employment_type: Mapped[EmploymentType] = mapped_column(
        SAEnum(EmploymentType), nullable=False, default=EmploymentType.full_time
    )
    village_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("villages.id"), nullable=True
    )
    date_joined: Mapped[date] = mapped_column(Date, nullable=True)
    status: Mapped[StaffStatus] = mapped_column(
        SAEnum(StaffStatus), nullable=False, default=StaffStatus.active
    )
    contact_phone: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    village = relationship("Village", back_populates="staff")
