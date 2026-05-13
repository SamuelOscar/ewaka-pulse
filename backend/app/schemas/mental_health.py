from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date
from app.models.mental_health import SessionType


class MentalHealthLogCreateRequest(BaseModel):
    child_id: str
    session_date: date
    session_type: SessionType
    wellbeing_rating: Optional[int] = None
    session_notes: Optional[str] = None
    trauma_milestone: Optional[str] = None
    action_items: Optional[str] = None
    next_session_date: Optional[date] = None

    @field_validator("wellbeing_rating")
    @classmethod
    def rating_valid(cls, v):
        if v is not None and v not in [1, 2, 3, 4, 5]:
            raise ValueError("Wellbeing rating must be between 1 and 5")
        return v

    @field_validator("session_date")
    @classmethod
    def date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Session date cannot be in the future")
        return v


class MentalHealthLogResponse(BaseModel):
    id: str
    child_id: str
    session_date: str
    session_type: str
    wellbeing_rating: Optional[int]
    session_notes: Optional[str]
    trauma_milestone: Optional[str]
    action_items: Optional[str]
    next_session_date: Optional[str]
    counselor_id: str
    created_at: str

    model_config = {"from_attributes": True}
