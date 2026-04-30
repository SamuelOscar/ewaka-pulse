from pydantic import BaseModel
from app.models.user import UserRole


class UserResponse(BaseModel):
    id: str
    username: str
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}