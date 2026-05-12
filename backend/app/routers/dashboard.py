from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.database import get_db
from app.models.child import Child, ChildStatus
from app.models.staff import Staff, StaffStatus
from app.models.user import User, UserRole
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.manager,
                UserRole.teacher,
            ]
        )
    ),
):
    """Dashboard KPI summary — live counts from Neon."""
    today = date.today()

    total_children = db.query(Child).filter(Child.status == ChildStatus.active).count()

    total_alumni = db.query(Child).filter(Child.status == ChildStatus.alumni).count()

    new_this_month = (
        db.query(Child)
        .filter(
            Child.status == ChildStatus.active,
            Child.created_at >= date(today.year, today.month, 1),
        )
        .count()
    )

    total_staff = db.query(Staff).filter(Staff.status == StaffStatus.active).count()

    recent_children = (
        db.query(Child)
        .filter(Child.status == ChildStatus.active)
        .order_by(Child.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "children": {
            "total_active": total_children,
            "total_alumni": total_alumni,
            "registered_this_month": new_this_month,
        },
        "staff": {
            "total_active": total_staff,
        },
        "recent_registrations": [
            {
                "child_code": c.child_code,
                "full_name": c.full_name,
                "class_grade": c.class_grade,
                "registered_at": c.created_at.isoformat(),
            }
            for c in recent_children
        ],
    }


@router.get("/birthdays")
def get_upcoming_birthdays(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            [
                UserRole.admin,
                UserRole.manager,
                UserRole.teacher,
            ]
        )
    ),
):
    """
    Returns children whose birthday falls today or within the next 7 days.
    FR-3.10 — Birthday alerts for all active children.
    """
    today = date.today()
    upcoming = []

    children = db.query(Child).filter(Child.status == ChildStatus.active).all()

    for child in children:
        dob = child.date_of_birth
        # Calculate this year's birthday
        try:
            birthday_this_year = dob.replace(year=today.year)
        except ValueError:
            # Handle Feb 29 in non-leap years
            birthday_this_year = dob.replace(year=today.year, day=28)

        # If birthday already passed this year, check next year
        if birthday_this_year < today:
            try:
                birthday_this_year = dob.replace(year=today.year + 1)
            except ValueError:
                birthday_this_year = dob.replace(year=today.year + 1, day=28)

        days_until = (birthday_this_year - today).days

        if 0 <= days_until <= 7:
            age_turning = today.year - dob.year
            if birthday_this_year.year == today.year + 1:
                age_turning = (today.year + 1) - dob.year

            upcoming.append(
                {
                    "child_id": child.id,
                    "child_code": child.child_code,
                    "full_name": child.full_name,
                    "date_of_birth": dob.isoformat(),
                    "birthday_date": birthday_this_year.isoformat(),
                    "days_until": days_until,
                    "turning_age": age_turning,
                    "is_today": days_until == 0,
                }
            )

    # Sort by days until birthday
    upcoming.sort(key=lambda x: x["days_until"])

    return {
        "total_upcoming": len(upcoming),
        "birthdays_today": sum(1 for b in upcoming if b["is_today"]),
        "upcoming": upcoming,
    }
