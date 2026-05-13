from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.mental_health import MentalHealthLog
from app.models.child import Child
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.mental_health import (
    MentalHealthLogCreateRequest,
    MentalHealthLogResponse,
)
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/mental-health", tags=["Mental Health"])

# SECURITY: Only admin and counselor — no exceptions
SENSITIVE_ROLES = [UserRole.admin, UserRole.counselor]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_session_log(
    request: Request,
    body: MentalHealthLogCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SENSITIVE_ROLES)),
):
    """
    Create a counseling session log.
    SENSITIVE — Admin and Counselor ONLY. FR-3.6.
    Every access is audit logged including who created the record.
    """
    child = db.query(Child).filter(Child.id == body.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    log = MentalHealthLog(
        id=str(uuid.uuid4()),
        child_id=body.child_id,
        session_date=body.session_date,
        session_type=body.session_type,
        wellbeing_rating=body.wellbeing_rating,
        session_notes=body.session_notes,
        trauma_milestone=body.trauma_milestone,
        action_items=body.action_items,
        next_session_date=body.next_session_date,
        counselor_id=current_user.id,
    )
    db.add(log)

    # Audit log — records WHO accessed this sensitive record
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="MENTAL_HEALTH_LOG_CREATED",
        entity_type="mental_health_log",
        entity_id=log.id,
        details=(
            f"Child: {child.child_code} | Session: {body.session_type.value} | "
            f"Date: {body.session_date} | Counselor: {current_user.username}"
        ),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(log)

    return MentalHealthLogResponse(
        id=log.id,
        child_id=log.child_id,
        session_date=log.session_date.isoformat(),
        session_type=log.session_type.value,
        wellbeing_rating=log.wellbeing_rating,
        session_notes=log.session_notes,
        trauma_milestone=log.trauma_milestone,
        action_items=log.action_items,
        next_session_date=(
            log.next_session_date.isoformat() if log.next_session_date else None
        ),
        counselor_id=log.counselor_id,
        created_at=log.created_at.isoformat(),
    )


@router.get("/child/{child_id}", response_model=List[MentalHealthLogResponse])
def get_child_mental_health_logs(
    child_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SENSITIVE_ROLES)),
):
    """
    Get all mental health logs for a child.
    SENSITIVE — Admin and Counselor ONLY.
    Every READ access is audit logged.
    """
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Audit log every READ of sensitive records
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="MENTAL_HEALTH_LOG_ACCESSED",
        entity_type="mental_health_log",
        entity_id=child_id,
        details=f"Child: {child.child_code} accessed by {current_user.username} ({current_user.role.value})",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    logs = (
        db.query(MentalHealthLog)
        .filter(MentalHealthLog.child_id == child_id)
        .order_by(MentalHealthLog.session_date.desc())
        .all()
    )

    return [
        MentalHealthLogResponse(
            id=log.id,
            child_id=log.child_id,
            session_date=log.session_date.isoformat(),
            session_type=log.session_type.value,
            wellbeing_rating=log.wellbeing_rating,
            session_notes=log.session_notes,
            trauma_milestone=log.trauma_milestone,
            action_items=log.action_items,
            next_session_date=(
                log.next_session_date.isoformat() if log.next_session_date else None
            ),
            counselor_id=log.counselor_id,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]
