from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date
from app.models.activity import ActivityType, ParticipationLevel, VocationalStatus


class ActivityCreateRequest(BaseModel):
    child_id: str
    activity_type: ActivityType
    activity_name: Optional[str] = None
    activity_date: date
    participation_level: ParticipationLevel = ParticipationLevel.active
    instructor_notes: Optional[str] = None
    vocational_status: Optional[VocationalStatus] = None

    @field_validator("activity_date")
    @classmethod
    def date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Activity date cannot be in the future")
        return v


class ActivityResponse(BaseModel):
    id: str
    child_id: str
    activity_type: str
    activity_name: Optional[str]
    activity_date: str
    participation_level: str
    instructor_notes: Optional[str]
    vocational_status: Optional[str]
    recorded_by: str
    created_at: str

    model_config = {"from_attributes": True}