from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.models.grade import Term


class GradeCreateRequest(BaseModel):
    child_id: str
    subject: str
    term: Term
    academic_year: str
    score: float
    max_score: float = 100.0
    comments: Optional[str] = None

    @field_validator("subject")
    @classmethod
    def clean_subject(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Subject must be at least 2 characters")
        return v

    @field_validator("score")
    @classmethod
    def score_not_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Score cannot be negative")
        return v

    @field_validator("max_score")
    @classmethod
    def max_score_valid(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Max score must be greater than 0")
        return v

    @field_validator("academic_year")
    @classmethod
    def year_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 4:
            raise ValueError("Academic year must be a 4-digit year e.g. 2026")
        return v


class GradeUpdateRequest(BaseModel):
    score: Optional[float] = None
    comments: Optional[str] = None


class GradeResponse(BaseModel):
    id: str
    child_id: str
    subject: str
    term: str
    academic_year: str
    score: float
    max_score: float
    percentage: float
    comments: Optional[str]
    teacher_id: str
    created_at: str
    model_config = {"from_attributes": True}


class SubjectSummary(BaseModel):
    subject: str
    score: float
    max_score: float
    percentage: float
    term: str
    comments: Optional[str]


class TermReportCard(BaseModel):
    child_code: str
    child_name: str
    term: str
    academic_year: str
    subjects: List[SubjectSummary]
    total_score: float
    total_max: float
    average_percentage: float
    grade_letter: str
    attendance_rate: Optional[float] = None