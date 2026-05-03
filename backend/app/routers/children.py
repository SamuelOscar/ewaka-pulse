from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import date
import uuid

from app.database import get_db
from app.models.child import Child, ChildStatus
from app.models.village import Village
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.child import (
    ChildCreateRequest,
    ChildUpdateRequest,
    ChildListResponse,
    ChildDetailResponse,
    VillageBasic,
)
from app.middleware.rbac import get_current_user, require_roles

router = APIRouter(prefix="/children", tags=["Children"])


def generate_child_code(db: Session) -> str:
    """
    Generate next sequential EP-YYYY-XXXX code.
    Queries DB to find highest existing number for this year.
    """
    year = date.today().year
    prefix = f"EP-{year}-"

    count = db.query(Child).filter(Child.child_code.like(f"{prefix}%")).count()

    next_number = count + 1
    return f"{prefix}{next_number:04d}"


@router.post(
    "/",
    response_model=ChildDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_child(
    request: Request,
    body: ChildCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """Register a new child. Admin only."""

    # Verify village exists
    village = db.query(Village).filter(Village.id == body.village_id).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Village not found",
        )

    # Duplicate detection
    duplicate = (
        db.query(Child)
        .filter(
            Child.full_name == body.full_name,
            Child.date_of_birth == body.date_of_birth,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"A child with this name and date of birth already exists. "
                f"Existing record: {duplicate.child_code}."
            ),
        )

    child_code = generate_child_code(db)

    child = Child(
        id=str(uuid.uuid4()),
        child_code=child_code,
        full_name=body.full_name,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
        nationality=body.nationality,
        village_id=body.village_id,
        date_of_arrival=body.date_of_arrival,
        class_grade=body.class_grade,
        status=ChildStatus.active,
        guardian_name=body.guardian_name,
        guardian_contact=body.guardian_contact,
        created_by=current_user.id,
    )
    db.add(child)

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="CHILD_REGISTERED",
        entity_type="child",
        entity_id=child.id,
        details=f"Registered '{body.full_name}' as {child_code}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(child)

    return ChildDetailResponse(
        id=child.id,
        child_code=child.child_code,
        full_name=child.full_name,
        date_of_birth=child.date_of_birth,
        gender=child.gender.value,
        nationality=child.nationality,
        village_id=child.village_id,
        village=VillageBasic(id=village.id, name=village.name),
        date_of_arrival=child.date_of_arrival,
        class_grade=child.class_grade,
        status=child.status.value,
        guardian_name=child.guardian_name,
        guardian_contact=child.guardian_contact,
        created_at=child.created_at.isoformat(),
        updated_at=child.updated_at.isoformat(),
    )


@router.get("/", response_model=List[ChildListResponse])
def list_children(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.teacher,
                UserRole.counselor,
                UserRole.manager,
                UserRole.operations,
            ]
        )
    ),
    status_filter: Optional[str] = Query(None, alias="status"),
    village_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List children with optional filters. Minimal fields only."""
    query = db.query(Child).options(joinedload(Child.village))

    if status_filter:
        try:
            query = query.filter(Child.status == ChildStatus(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status. Choose: {[s.value for s in ChildStatus]}",
            )

    if village_id:
        query = query.filter(Child.village_id == village_id)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(Child.full_name.ilike(term) | Child.child_code.ilike(term))

    children = query.order_by(Child.created_at.desc()).all()

    return [
        ChildListResponse(
            id=c.id,
            child_code=c.child_code,
            full_name=c.full_name,
            date_of_birth=c.date_of_birth,
            gender=c.gender.value,
            class_grade=c.class_grade,
            status=c.status.value,
            village=(
                VillageBasic(id=c.village.id, name=c.village.name)
                if c.village
                else None
            ),
        )
        for c in children
    ]


@router.get("/{child_id}", response_model=ChildDetailResponse)
def get_child(
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.teacher,
                UserRole.counselor,
                UserRole.manager,
            ]
        )
    ),
):
    """Get full child profile by ID."""
    child = (
        db.query(Child)
        .options(joinedload(Child.village))
        .filter(Child.id == child_id)
        .first()
    )

    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    return ChildDetailResponse(
        id=child.id,
        child_code=child.child_code,
        full_name=child.full_name,
        date_of_birth=child.date_of_birth,
        gender=child.gender.value,
        nationality=child.nationality,
        village_id=child.village_id,
        village=(
            VillageBasic(id=child.village.id, name=child.village.name)
            if child.village
            else None
        ),
        date_of_arrival=child.date_of_arrival,
        class_grade=child.class_grade,
        status=child.status.value,
        guardian_name=child.guardian_name,
        guardian_contact=child.guardian_contact,
        created_at=child.created_at.isoformat(),
        updated_at=child.updated_at.isoformat(),
    )


@router.patch("/{child_id}", response_model=ChildDetailResponse)
def update_child(
    child_id: str,
    body: ChildUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """Update child details. Admin only. child_code is never updatable."""
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    changed = []
    if body.full_name is not None:
        child.full_name = body.full_name
        changed.append("full_name")
    if body.class_grade is not None:
        child.class_grade = body.class_grade
        changed.append("class_grade")
    if body.guardian_name is not None:
        child.guardian_name = body.guardian_name
        changed.append("guardian_name")
    if body.guardian_contact is not None:
        child.guardian_contact = body.guardian_contact
        changed.append("guardian_contact")
    if body.nationality is not None:
        child.nationality = body.nationality
        changed.append("nationality")
    if body.status is not None:
        child.status = body.status
        changed.append("status")

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="CHILD_UPDATED",
        entity_type="child",
        entity_id=child.id,
        details=f"Updated: {', '.join(changed)}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(child)

    village = db.query(Village).filter(Village.id == child.village_id).first()

    return ChildDetailResponse(
        id=child.id,
        child_code=child.child_code,
        full_name=child.full_name,
        date_of_birth=child.date_of_birth,
        gender=child.gender.value,
        nationality=child.nationality,
        village_id=child.village_id,
        village=VillageBasic(id=village.id, name=village.name) if village else None,
        date_of_arrival=child.date_of_arrival,
        class_grade=child.class_grade,
        status=child.status.value,
        guardian_name=child.guardian_name,
        guardian_contact=child.guardian_contact,
        created_at=child.created_at.isoformat(),
        updated_at=child.updated_at.isoformat(),
    )
