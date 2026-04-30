from pydantic import BaseModel, field_validator
from app.models.user import UserRole


# ── Request Schemas (what the client sends) ───────────────────

class LoginRequest(BaseModel):
    """Body for POST /auth/login"""
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Username cannot be empty")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_must_not_be_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Password cannot be empty")
        return v


class CreateUserRequest(BaseModel):
    """Body for POST /admin/users — admin only"""
    username: str
    password: str
    role: UserRole = UserRole.readonly

    @field_validator("username")
    @classmethod
    def clean_username(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 100:
            raise ValueError("Username must be under 100 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("Password must be at least 10 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


# ── Response Schemas (what the server returns) ────────────────

class TokenResponse(BaseModel):
    """Response from POST /auth/login"""
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


class UserResponse(BaseModel):
    """Response from GET /auth/me"""
    id: str
    username: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}