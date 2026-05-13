from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.biometric import BiometricRecord
from app.models.child import Child
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.biometric import BiometricCreateRequest, BiometricResponse
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/biometrics", tags=["Biometrics"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_biometric_record(
    request: Request,
    body: BiometricCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.counselor,
            ]
        )
    ),
):
    """
    Record biometric health data for a child.
    SENSITIVE — Admin and Counselor only. FR-2.6.
    """
    child = db.query(Child).filter(Child.id == body.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    record = BiometricRecord(
        id=str(uuid.uuid4()),
        child_id=body.child_id,
        record_date=body.record_date,
        height_cm=body.height_cm,
        weight_kg=body.weight_kg,
        allergies=body.allergies,
        blood_type=body.blood_type,
        health_notes=body.health_notes,
        next_checkup_date=body.next_checkup_date,
        recorded_by=current_user.id,
    )
    db.add(record)

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="BIOMETRIC_RECORDED",
        entity_type="biometric",
        entity_id=record.id,
        details=(
            f"Child: {child.child_code} | Date: {body.record_date} | "
            f"Height: {body.height_cm}cm | Weight: {body.weight_kg}kg"
        ),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return BiometricResponse(
        id=record.id,
        child_id=record.child_id,
        record_date=record.record_date.isoformat(),
        height_cm=record.height_cm,
        weight_kg=record.weight_kg,
        allergies=record.allergies,
        blood_type=record.blood_type,
        health_notes=record.health_notes,
        next_checkup_date=(
            record.next_checkup_date.isoformat() if record.next_checkup_date else None
        ),
        recorded_by=record.recorded_by,
        created_at=record.created_at.isoformat(),
    )


@router.get("/child/{child_id}", response_model=List[BiometricResponse])
def get_child_biometrics(
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.counselor,
            ]
        )
    ),
):
    """
    Get all biometric records for a child.
    SENSITIVE — Admin and Counselor only.
    """
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    records = (
        db.query(BiometricRecord)
        .filter(BiometricRecord.child_id == child_id)
        .order_by(BiometricRecord.record_date.desc())
        .all()
    )

    return [
        BiometricResponse(
            id=r.id,
            child_id=r.child_id,
            record_date=r.record_date.isoformat(),
            height_cm=r.height_cm,
            weight_kg=r.weight_kg,
            allergies=r.allergies,
            blood_type=r.blood_type,
            health_notes=r.health_notes,
            next_checkup_date=(
                r.next_checkup_date.isoformat() if r.next_checkup_date else None
            ),
            recorded_by=r.recorded_by,
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]


@router.get("/child/{child_id}/latest")
def get_latest_biometric(
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.counselor,
            ]
        )
    ),
):
    """Get the most recent biometric record for a child."""
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    record = (
        db.query(BiometricRecord)
        .filter(BiometricRecord.child_id == child_id)
        .order_by(BiometricRecord.record_date.desc())
        .first()
    )

    if not record:
        return {
            "child_code": child.child_code,
            "child_name": child.full_name,
            "latest_record": None,
        }

    return {
        "child_code": child.child_code,
        "child_name": child.full_name,
        "latest_record": BiometricResponse(
            id=record.id,
            child_id=record.child_id,
            record_date=record.record_date.isoformat(),
            height_cm=record.height_cm,
            weight_kg=record.weight_kg,
            allergies=record.allergies,
            blood_type=record.blood_type,
            health_notes=record.health_notes,
            next_checkup_date=(
                record.next_checkup_date.isoformat()
                if record.next_checkup_date
                else None
            ),
            recorded_by=record.recorded_by,
            created_at=record.created_at.isoformat(),
        ),
    }
