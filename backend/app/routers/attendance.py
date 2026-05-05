from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
import uuid

from app.database import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.class_group import ClassGroup
from app.models.child import Child
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceCreateRequest,
    AttendanceResponse,
    AttendanceSummaryResponse,
)
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# SECURITY: Attendance locked after this many days
ATTENDANCE_LOCK_DAYS = 7


def _check_date_lock(record_date: date, current_user: User) -> None:
    """
    Attendance records older than ATTENDANCE_LOCK_DAYS cannot be
    modified unless the user is an Admin.
    This is enforced at the API layer.
    """
    cutoff = date.today() - timedelta(days=ATTENDANCE_LOCK_DAYS)
    if record_date < cutoff and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Attendance records older than {ATTENDANCE_LOCK_DAYS} days "
                f"are locked. Contact an administrator to make corrections."
            ),
        )


# ── POST /attendance/ ─────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
def mark_attendance(
    request: Request,
    body: AttendanceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin,
        UserRole.teacher,
    ])),
):
    """
    Mark attendance for a whole class in one request.
    Teacher and Admin roles only.

    SECURITY:
    - Date lock: cannot mark attendance older than 7 days (unless admin)
    - Duplicate prevention: if a record already exists for child+date,
      it is UPDATED not duplicated (upsert behaviour)
    - All marking written to audit_logs
    """
    # Verify class exists
    class_group = db.query(ClassGroup).filter(
        ClassGroup.id == body.class_id
    ).first()
    if not class_group:
        raise HTTPException(status_code=404, detail="Class not found")

    # Date lock check
    _check_date_lock(body.date, current_user)

    created_count = 0
    updated_count = 0

    for record in body.records:
        # Verify child exists
        child = db.query(Child).filter(Child.id == record.child_id).first()
        if not child:
            raise HTTPException(
                status_code=404,
                detail=f"Child {record.child_id} not found",
            )

        # Check for existing record (upsert)
        existing = db.query(Attendance).filter(
            Attendance.child_id == record.child_id,
            Attendance.date == body.date,
        ).first()

        if existing:
            # Update existing record
            existing.status = record.status
            existing.marked_by = current_user.id
            updated_count += 1
        else:
            # Create new record
            attendance = Attendance(
                id=str(uuid.uuid4()),
                child_id=record.child_id,
                class_id=body.class_id,
                date=body.date,
                status=record.status,
                marked_by=current_user.id,
            )
            db.add(attendance)
            created_count += 1

    # Single audit log for the whole bulk operation
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="ATTENDANCE_MARKED",
        entity_type="attendance",
        details=(
            f"Class: {class_group.name} | Date: {body.date} | "
            f"Created: {created_count} | Updated: {updated_count}"
        ),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Attendance recorded successfully",
        "date": body.date.isoformat(),
        "class": class_group.name,
        "created": created_count,
        "updated": updated_count,
        "total_records": created_count + updated_count,
    }


# ── GET /attendance/class/{class_id} ─────────────────────────

@router.get("/class/{class_id}")
def get_class_attendance(
    class_id: str,
    attendance_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin,
        UserRole.teacher,
        UserRole.manager,
    ])),
):
    """
    Get attendance for a class on a specific date.
    Defaults to today if no date provided.
    """
    class_group = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
    if not class_group:
        raise HTTPException(status_code=404, detail="Class not found")

    query_date = attendance_date or date.today()

    records = db.query(Attendance).filter(
        Attendance.class_id == class_id,
        Attendance.date == query_date,
    ).all()

    result = []
    for r in records:
        child = db.query(Child).filter(Child.id == r.child_id).first()
        result.append({
            "id": r.id,
            "child_id": r.child_id,
            "child_name": child.full_name if child else "Unknown",
            "child_code": child.child_code if child else "Unknown",
            "date": r.date.isoformat(),
            "status": r.status.value,
        })

    return {
        "class": class_group.name,
        "date": query_date.isoformat(),
        "total": len(result),
        "records": result,
    }


# ── GET /attendance/child/{child_id} ─────────────────────────

@router.get("/child/{child_id}")
def get_child_attendance(
    child_id: str,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin,
        UserRole.teacher,
        UserRole.manager,
    ])),
):
    """
    Get attendance history for a single child.
    Optional date range filters.
    """
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    query = db.query(Attendance).filter(Attendance.child_id == child_id)

    if from_date:
        query = query.filter(Attendance.date >= from_date)
    if to_date:
        query = query.filter(Attendance.date <= to_date)

    records = query.order_by(Attendance.date.desc()).all()

    # Calculate attendance rate
    total = len(records)
    present_count = sum(
        1 for r in records
        if r.status in [AttendanceStatus.present, AttendanceStatus.late]
    )
    rate = round((present_count / total * 100), 1) if total > 0 else 0.0

    # Attendance flag: below 80% is flagged
    flagged = rate < 80.0 and total >= 5

    return {
        "child_code": child.child_code,
        "child_name": child.full_name,
        "total_records": total,
        "present": present_count,
        "absent": sum(1 for r in records if r.status == AttendanceStatus.absent),
        "late": sum(1 for r in records if r.status == AttendanceStatus.late),
        "excused": sum(1 for r in records if r.status == AttendanceStatus.excused),
        "attendance_rate": rate,
        "attendance_flag": flagged,
        "records": [
            {
                "date": r.date.isoformat(),
                "status": r.status.value,
            }
            for r in records
        ],
    }


# ── GET /attendance/summary ───────────────────────────────────

@router.get("/summary")
def get_attendance_summary(
    summary_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin,
        UserRole.manager,
        UserRole.teacher,
    ])),
):
    """
    Daily attendance summary for the dashboard.
    Returns counts by status for a given date (default: today).
    """
    query_date = summary_date or date.today()

    records = db.query(Attendance).filter(
        Attendance.date == query_date
    ).all()

    total = len(records)
    present = sum(1 for r in records if r.status == AttendanceStatus.present)
    absent = sum(1 for r in records if r.status == AttendanceStatus.absent)
    late = sum(1 for r in records if r.status == AttendanceStatus.late)
    excused = sum(1 for r in records if r.status == AttendanceStatus.excused)

    present_and_late = present + late
    rate = round((present_and_late / total * 100), 1) if total > 0 else 0.0

    return {
        "date": query_date.isoformat(),
        "total": total,
        "present": present,
        "absent": absent,
        "late": late,
        "excused": excused,
        "attendance_rate": rate,
    }


# ── GET /attendance/classes ───────────────────────────────────

@router.get("/classes")
def list_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin,
        UserRole.teacher,
        UserRole.manager,
    ])),
):
    """List all classes — used to populate the class selector."""
    classes = db.query(ClassGroup).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "village_id": c.village_id,
        }
        for c in classes
    ]