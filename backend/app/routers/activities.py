from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
import uuid

from app.database import get_db
from app.models.activity import Activity, ActivityType
from app.models.child import Child
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.activity import ActivityCreateRequest, ActivityResponse
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def log_activity(
    request: Request,
    body: ActivityCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin, UserRole.teacher
    ])),
):
    """Log a sports, dance, or vocational activity for a child."""
    child = db.query(Child).filter(Child.id == body.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    activity = Activity(
        id=str(uuid.uuid4()),
        child_id=body.child_id,
        activity_type=body.activity_type,
        activity_name=body.activity_name,
        activity_date=body.activity_date,
        participation_level=body.participation_level,
        instructor_notes=body.instructor_notes,
        vocational_status=body.vocational_status,
        recorded_by=current_user.id,
    )
    db.add(activity)

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="ACTIVITY_LOGGED",
        entity_type="activity",
        entity_id=activity.id,
        details=(
            f"Child: {child.child_code} | Activity: {body.activity_type.value} | "
            f"Date: {body.activity_date} | Level: {body.participation_level.value}"
        ),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(activity)

    return ActivityResponse(
        id=activity.id,
        child_id=activity.child_id,
        activity_type=activity.activity_type.value,
        activity_name=activity.activity_name,
        activity_date=activity.activity_date.isoformat(),
        participation_level=activity.participation_level.value,
        instructor_notes=activity.instructor_notes,
        vocational_status=activity.vocational_status.value if activity.vocational_status else None,
        recorded_by=activity.recorded_by,
        created_at=activity.created_at.isoformat(),
    )


@router.get("/child/{child_id}")
def get_child_activities(
    child_id: str,
    activity_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin, UserRole.teacher, UserRole.manager
    ])),
):
    """Get all activities for a child."""
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    query = db.query(Activity).filter(Activity.child_id == child_id)

    if activity_type:
        try:
            query = query.filter(Activity.activity_type == ActivityType(activity_type))
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid type. Choose from: {[t.value for t in ActivityType]}",
            )

    if from_date:
        query = query.filter(Activity.activity_date >= from_date)
    if to_date:
        query = query.filter(Activity.activity_date <= to_date)

    activities = query.order_by(Activity.activity_date.desc()).all()

    sports = [a for a in activities if a.activity_type.value in [
        'football', 'dance', 'choir', 'drama', 'basketball', 'volleyball', 'athletics', 'other'
    ]]
    vocational = [a for a in activities if 'vocational' in a.activity_type.value]

    return {
        "child_code": child.child_code,
        "child_name": child.full_name,
        "total_activities": len(activities),
        "sports_and_arts": len(sports),
        "vocational": len(vocational),
        "activities": [
            ActivityResponse(
                id=a.id,
                child_id=a.child_id,
                activity_type=a.activity_type.value,
                activity_name=a.activity_name,
                activity_date=a.activity_date.isoformat(),
                participation_level=a.participation_level.value,
                instructor_notes=a.instructor_notes,
                vocational_status=a.vocational_status.value if a.vocational_status else None,
                recorded_by=a.recorded_by,
                created_at=a.created_at.isoformat(),
            )
            for a in activities
        ],
    }