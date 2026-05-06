from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
import uuid

from app.database import get_db
from app.models.staff import Staff, StaffStatus, EmploymentType
from app.models.village import Village
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.staff import StaffCreateRequest, StaffUpdateRequest, StaffResponse
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/staff", tags=["Staff"])


def generate_staff_code(db: Session, employment_type: EmploymentType) -> str:
    """
    Generate staff code based on employment type.
    ST = Staff, VOL = Volunteer
    Format: ST-YYYY-XXXX or VOL-YYYY-XXXX
    """
    year = date.today().year
    if employment_type == EmploymentType.volunteer:
        prefix = f"VOL-{year}-"
    else:
        prefix = f"ST-{year}-"

    count = db.query(Staff).filter(
        Staff.staff_code.like(f"{prefix}%")
    ).count()

    next_number = count + 1
    return f"{prefix}{next_number:04d}"


@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def register_staff(
    request: Request,
    body: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """
    Register a new staff member. Admin only.
    Auto-generates ST-YYYY-XXXX or VOL-YYYY-XXXX code.
    """
    # Verify village exists
    village = db.query(Village).filter(Village.id == body.village_id).first()
    if not village:
        raise HTTPException(status_code=404, detail="Village not found")

    # Duplicate detection: same name + role + village
    duplicate = db.query(Staff).filter(
        Staff.full_name == body.full_name,
        Staff.village_id == body.village_id,
        Staff.status == StaffStatus.active,
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"An active staff member with this name already exists in this village. Code: {duplicate.staff_code}",
        )

    staff_code = generate_staff_code(db, body.employment_type)

    staff = Staff(
        id=str(uuid.uuid4()),
        staff_code=staff_code,
        full_name=body.full_name,
        role_title=body.role_title,
        department=body.department,
        employment_type=body.employment_type,
        village_id=body.village_id,
        date_joined=body.date_joined or date.today(),
        contact_phone=body.contact_phone,
        status=StaffStatus.active,
    )
    db.add(staff)

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="STAFF_REGISTERED",
        entity_type="staff",
        entity_id=staff.id,
        details=f"Registered '{body.full_name}' as {staff_code} | Role: {body.role_title}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(staff)

    return StaffResponse(
        id=staff.id,
        staff_code=staff.staff_code,
        full_name=staff.full_name,
        role_title=staff.role_title,
        department=staff.department,
        employment_type=staff.employment_type.value,
        village_id=staff.village_id,
        date_joined=staff.date_joined.isoformat() if staff.date_joined else None,
        status=staff.status.value,
        contact_phone=staff.contact_phone,
        created_at=staff.created_at.isoformat(),
    )


@router.get("/", response_model=List[StaffResponse])
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin,
        UserRole.manager,
    ])),
    status_filter: Optional[str] = Query(None, alias="status"),
    employment_type: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    List all staff. Admin and Manager only.
    Supports filters: status, employment_type, department, search.
    """
    query = db.query(Staff)

    if status_filter:
        try:
            query = query.filter(Staff.status == StaffStatus(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status. Choose from: {[s.value for s in StaffStatus]}",
            )

    if employment_type:
        try:
            query = query.filter(Staff.employment_type == EmploymentType(employment_type))
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid employment type. Choose from: {[e.value for e in EmploymentType]}",
            )

    if department:
        query = query.filter(Staff.department.ilike(f"%{department}%"))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            Staff.full_name.ilike(term) | Staff.staff_code.ilike(term)
        )

    staff_list = query.order_by(Staff.full_name).all()

    return [
        StaffResponse(
            id=s.id,
            staff_code=s.staff_code,
            full_name=s.full_name,
            role_title=s.role_title,
            department=s.department,
            employment_type=s.employment_type.value,
            village_id=s.village_id,
            date_joined=s.date_joined.isoformat() if s.date_joined else None,
            status=s.status.value,
            contact_phone=s.contact_phone,
            created_at=s.created_at.isoformat(),
        )
        for s in staff_list
    ]


@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin,
        UserRole.manager,
    ])),
):
    """Get a staff member's full profile."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return StaffResponse(
        id=staff.id,
        staff_code=staff.staff_code,
        full_name=staff.full_name,
        role_title=staff.role_title,
        department=staff.department,
        employment_type=staff.employment_type.value,
        village_id=staff.village_id,
        date_joined=staff.date_joined.isoformat() if staff.date_joined else None,
        status=staff.status.value,
        contact_phone=staff.contact_phone,
        created_at=staff.created_at.isoformat(),
    )


@router.patch("/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: str,
    body: StaffUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """
    Update staff details. Admin only.
    staff_code is immutable after creation.
    """
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    changed = []
    if body.role_title is not None:
        staff.role_title = body.role_title
        changed.append("role_title")
    if body.department is not None:
        staff.department = body.department
        changed.append("department")
    if body.contact_phone is not None:
        staff.contact_phone = body.contact_phone
        changed.append("contact_phone")
    if body.status is not None:
        staff.status = body.status
        changed.append("status")
    if body.date_joined is not None:
        staff.date_joined = body.date_joined
        changed.append("date_joined")

    if not changed:
        raise HTTPException(status_code=422, detail="No fields provided to update")

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="STAFF_UPDATED",
        entity_type="staff",
        entity_id=staff.id,
        details=f"Updated: {', '.join(changed)}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(staff)

    return StaffResponse(
        id=staff.id,
        staff_code=staff.staff_code,
        full_name=staff.full_name,
        role_title=staff.role_title,
        department=staff.department,
        employment_type=staff.employment_type.value,
        village_id=staff.village_id,
        date_joined=staff.date_joined.isoformat() if staff.date_joined else None,
        status=staff.status.value,
        contact_phone=staff.contact_phone,
        created_at=staff.created_at.isoformat(),
    )