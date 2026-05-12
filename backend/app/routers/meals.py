from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
import uuid

from app.database import get_db
from app.models.meal import Meal, MealType
from app.models.child import Child
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.meal import MealBulkCreateRequest, MealResponse
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/meals", tags=["Meals"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def log_meals(
    request: Request,
    body: MealBulkCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin, UserRole.operations, UserRole.teacher
    ])),
):
    """
    Bulk log meals for multiple children.
    Operations staff and Admin only.
    """
    created = 0
    for record in body.records:
        child = db.query(Child).filter(Child.id == record.child_id).first()
        if not child:
            continue

        # Check for existing record same child + date + meal type
        existing = db.query(Meal).filter(
            Meal.child_id == record.child_id,
            Meal.meal_date == body.meal_date,
            Meal.meal_type == record.meal_type,
        ).first()

        if existing:
            existing.served = record.served
            existing.quantity_notes = record.quantity_notes
        else:
            meal = Meal(
                id=str(uuid.uuid4()),
                child_id=record.child_id,
                meal_date=body.meal_date,
                meal_type=record.meal_type,
                served=record.served,
                quantity_notes=record.quantity_notes,
                recorded_by=current_user.id,
            )
            db.add(meal)
            created += 1

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="MEALS_LOGGED",
        entity_type="meal",
        details=f"Date: {body.meal_date} | Records: {len(body.records)} | Created: {created}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Meals logged successfully",
        "date": body.meal_date.isoformat(),
        "total_records": len(body.records),
        "created": created,
    }


@router.get("/child/{child_id}")
def get_child_meals(
    child_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin, UserRole.operations, UserRole.manager
    ])),
):
    """Get meal history for a child."""
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    query = db.query(Meal).filter(Meal.child_id == child_id)
    if from_date:
        query = query.filter(Meal.meal_date >= from_date)
    if to_date:
        query = query.filter(Meal.meal_date <= to_date)

    meals = query.order_by(Meal.meal_date.desc()).all()
    total_served = sum(1 for m in meals if m.served)

    return {
        "child_code": child.child_code,
        "child_name": child.full_name,
        "total_records": len(meals),
        "total_served": total_served,
        "meals": [
            MealResponse(
                id=m.id,
                child_id=m.child_id,
                meal_date=m.meal_date.isoformat(),
                meal_type=m.meal_type.value,
                served=m.served,
                quantity_notes=m.quantity_notes,
                recorded_by=m.recorded_by,
            )
            for m in meals
        ],
    }


@router.get("/summary")
def get_meal_summary(
    summary_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin, UserRole.operations, UserRole.manager
    ])),
):
    """Daily meal summary — total served per meal type."""
    query_date = summary_date or date.today()
    meals = db.query(Meal).filter(Meal.meal_date == query_date).all()

    summary = {}
    for meal_type in MealType:
        type_meals = [m for m in meals if m.meal_type == meal_type]
        summary[meal_type.value] = {
            "total": len(type_meals),
            "served": sum(1 for m in type_meals if m.served),
        }

    return {
        "date": query_date.isoformat(),
        "total_meals_logged": len(meals),
        "total_served": sum(1 for m in meals if m.served),
        "breakdown": summary,
    }