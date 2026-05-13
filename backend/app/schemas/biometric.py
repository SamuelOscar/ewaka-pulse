from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date


class BiometricCreateRequest(BaseModel):
    child_id: str
    record_date: date
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None
    blood_type: Optional[str] = None
    health_notes: Optional[str] = None
    next_checkup_date: Optional[date] = None

    @field_validator("height_cm")
    @classmethod
    def height_valid(cls, v):
        if v is not None and (v < 30 or v > 250):
            raise ValueError("Height must be between 30cm and 250cm")
        return v

    @field_validator("weight_kg")
    @classmethod
    def weight_valid(cls, v):
        if v is not None and (v < 2 or v > 200):
            raise ValueError("Weight must be between 2kg and 200kg")
        return v


class BiometricResponse(BaseModel):
    id: str
    child_id: str
    record_date: str
    height_cm: Optional[float]
    weight_kg: Optional[float]
    allergies: Optional[str]
    blood_type: Optional[str]
    health_notes: Optional[str]
    next_checkup_date: Optional[str]
    recorded_by: str
    created_at: str

    model_config = {"from_attributes": True}
