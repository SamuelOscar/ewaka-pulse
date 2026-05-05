from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.village import Village
from app.models.user import User, UserRole
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/villages", tags=["Villages"])


@router.get("/")
def list_villages(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.teacher,
                UserRole.counselor,
                UserRole.manager,
                UserRole.operations,
                UserRole.finance,
            ]
        )
    ),
):
    """
    List all villages.
    Used by the frontend to populate village dropdowns.
    """
    villages = db.query(Village).order_by(Village.name).all()
    return [
        {
            "id": v.id,
            "name": v.name,
            "location": v.location,
        }
        for v in villages
    ]


@router.post("/", status_code=201)
def create_village(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """
    Create a new village. Admin only.
    Body: { "name": "Village Name", "location": "Location" }
    """
    name = body.get("name", "").strip()
    if not name:
        from fastapi import HTTPException

        raise HTTPException(status_code=422, detail="Village name is required")

    existing = db.query(Village).filter(Village.name == name).first()
    if existing:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=409, detail="Village with this name already exists"
        )

    village = Village(
        id=str(uuid.uuid4()),
        name=name,
        location=body.get("location", "").strip() or None,
    )
    db.add(village)
    db.commit()
    db.refresh(village)

    return {
        "id": village.id,
        "name": village.name,
        "location": village.location,
        "message": "Village created successfully",
    }
