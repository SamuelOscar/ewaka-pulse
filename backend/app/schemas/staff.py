from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date
from app.models.staff import EmploymentType, StaffStatus


class StaffCreateRequest(BaseModel):
    full_name: str
    role_title: str
    department: str
    employment_type: EmploymentType
    village_id: str
    date_joined: Optional[date] = None
    contact_phone: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 200:
            raise ValueError("Full name must be under 200 characters")
        return v

    @field_validator("role_title")
    @classmethod
    def clean_role(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Role title is required")
        return v

    @field_validator("department")
    @classmethod
    def clean_department(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Department is required")
        return v


class StaffUpdateRequest(BaseModel):
    role_title: Optional[str] = None
    department: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[StaffStatus] = None
    date_joined: Optional[date] = None


class StaffResponse(BaseModel):
    id: str
    staff_code: str
    full_name: str
    role_title: Optional[str]
    department: Optional[str]
    employment_type: str
    village_id: Optional[str]
    date_joined: Optional[str]
    status: str
    contact_phone: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}