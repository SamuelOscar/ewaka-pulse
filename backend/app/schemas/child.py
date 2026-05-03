from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date
from app.models.child import Gender, ChildStatus


# ── Request Schemas ───────────────────────────────────────────


class ChildCreateRequest(BaseModel):
    """Body for POST /children/ — admin only"""

    full_name: str
    date_of_birth: date
    gender: Gender
    nationality: Optional[str] = None
    village_id: str
    date_of_arrival: date
    class_grade: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_contact: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 200:
            raise ValueError("Full name must be under 200 characters")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date) -> date:
        today = date.today()
        if v >= today:
            raise ValueError("Date of birth must be in the past")
        age = (today - v).days / 365.25
        if age > 25:
            raise ValueError("Date of birth indicates age over 25 — please verify")
        return v

    @field_validator("village_id")
    @classmethod
    def village_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Village ID is required")
        return v.strip()


class ChildUpdateRequest(BaseModel):
    """Body for PATCH /children/{id} — admin only"""

    full_name: Optional[str] = None
    class_grade: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_contact: Optional[str] = None
    nationality: Optional[str] = None
    status: Optional[ChildStatus] = None


# ── Response Schemas ──────────────────────────────────────────


class VillageBasic(BaseModel):
    id: str
    name: str
    model_config = {"from_attributes": True}


class ChildListResponse(BaseModel):
    """Minimal fields returned in list endpoints — SECURITY: no sensitive data"""

    id: str
    child_code: str
    full_name: str
    date_of_birth: date
    gender: str
    class_grade: Optional[str]
    status: str
    village: Optional[VillageBasic]

    model_config = {"from_attributes": True}


class ChildDetailResponse(BaseModel):
    """Full profile — returned only in detail endpoint after role check"""

    id: str
    child_code: str
    full_name: str
    date_of_birth: date
    gender: str
    nationality: Optional[str]
    village_id: str
    village: Optional[VillageBasic]
    date_of_arrival: date
    class_grade: Optional[str]
    status: str
    guardian_name: Optional[str]
    guardian_contact: Optional[str]
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
