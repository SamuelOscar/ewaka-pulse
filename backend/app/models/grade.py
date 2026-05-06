import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Term(str, enum.Enum):
    term_1 = "term_1"
    term_2 = "term_2"
    term_3 = "term_3"


class Grade(Base):
    """
    Exam/assessment score for a child per subject per term.

    One record = one child + one subject + one term + one academic year.
    Teachers enter scores. Admins and teachers can view.
    """
    __tablename__ = "grades"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), nullable=False, index=True
    )
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    term: Mapped[Term] = mapped_column(SAEnum(Term), nullable=False)
    academic_year: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # e.g. "2026"
    score: Mapped[float] = mapped_column(Float, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    teacher_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    comments: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    child = relationship("Child")
    teacher = relationship("User")