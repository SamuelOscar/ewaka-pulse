from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

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
    """
    Dashboard KPI summary.
    Returns live counts for the admin dashboard.
    """
    # Children stats
    total_children = db.query(Child).filter(Child.status == ChildStatus.active).count()

    total_alumni = db.query(Child).filter(Child.status == ChildStatus.alumni).count()

    # Children registered this month
    today = date.today()
    new_this_month = (
        db.query(Child)
        .filter(
            Child.status == ChildStatus.active,
            Child.created_at >= date(today.year, today.month, 1),
        )
        .count()
    )

    # Staff stats
    total_staff = db.query(Staff).filter(Staff.status == StaffStatus.active).count()

    # Recent registrations (last 5)
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
