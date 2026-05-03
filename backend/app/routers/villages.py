from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.village import Village
from app.models.user import UserRole
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/villages", tags=["Villages"])


@router.get("/")
def list_villages(
    db: Session = Depends(get_db),
    current_user=Depends(
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
    """List all villages — used to get village IDs for child registration."""
    villages = db.query(Village).all()
    return [{"id": v.id, "name": v.name, "location": v.location} for v in villages]
