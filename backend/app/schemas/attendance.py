from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import date
from app.models.attendance import AttendanceStatus


class AttendanceRecord(BaseModel):
    """Single child's attendance status within a bulk submission."""
    child_id: str
    status: AttendanceStatus


class AttendanceCreateRequest(BaseModel):
    """
    Body for POST /attendance/
    Marks attendance for a whole class in one request.
    """
    class_id: str
    date: date
    records: List[AttendanceRecord]

    @field_validator("date")
    @classmethod
    def date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Cannot mark attendance for a future date")
        return v

    @field_validator("records")
    @classmethod
    def records_not_empty(cls, v: List[AttendanceRecord]) -> List[AttendanceRecord]:
        if not v:
            raise ValueError("At least one attendance record is required")
        return v


class AttendanceResponse(BaseModel):
    """Single attendance record in responses."""
    id: str
    child_id: str
    child_name: str
    child_code: str
    class_id: str
    date: date
    status: str
    marked_by: str

    model_config = {"from_attributes": True}


class AttendanceSummaryResponse(BaseModel):
    """Dashboard attendance summary."""
    date: date
    total: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_rate: float