from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date
from app.models.meal import MealType


class MealRecord(BaseModel):
    child_id: str
    meal_type: MealType
    served: bool = True
    quantity_notes: Optional[str] = None


class MealBulkCreateRequest(BaseModel):
    """Bulk log meals for multiple children at once."""
    meal_date: date
    records: List[MealRecord]

    @field_validator("meal_date")
    @classmethod
    def date_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Meal date cannot be in the future")
        return v

    @field_validator("records")
    @classmethod
    def records_not_empty(cls, v):
        if not v:
            raise ValueError("At least one meal record is required")
        return v


class MealResponse(BaseModel):
    id: str
    child_id: str
    meal_date: str
    meal_type: str
    served: bool
    quantity_notes: Optional[str]
    recorded_by: str

    model_config = {"from_attributes": True}