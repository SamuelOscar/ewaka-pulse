from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import uuid

from app.database import get_db
from app.models.class_group import ClassGroup
from app.models.class_enrollment import ClassEnrollment
from app.models.child import Child, ChildStatus
from app.models.village import Village
from app.models.user import User, UserRole
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.get("/")
def list_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.admin, UserRole.teacher, UserRole.manager])
    ),
):
    """List all classes with student count."""
    classes = db.query(ClassGroup).all()
    result = []
    for c in classes:
        count = (
            db.query(ClassEnrollment).filter(ClassEnrollment.class_id == c.id).count()
        )
        result.append(
            {
                "id": c.id,
                "name": c.name,
                "village_id": c.village_id,
                "student_count": count,
            }
        )
    return result


@router.post("/", status_code=201)
def create_class(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """Create a new class. Admin only."""
    name = body.get("name", "").strip()
    village_id = body.get("village_id", "").strip()

    if not name:
        raise HTTPException(status_code=422, detail="Class name is required")
    if not village_id:
        raise HTTPException(status_code=422, detail="Village ID is required")

    village = db.query(Village).filter(Village.id == village_id).first()
    if not village:
        raise HTTPException(status_code=404, detail="Village not found")

    existing = (
        db.query(ClassGroup)
        .filter(
            ClassGroup.name == name,
            ClassGroup.village_id == village_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409, detail="Class already exists in this village"
        )

    new_class = ClassGroup(
        id=str(uuid.uuid4()),
        name=name,
        village_id=village_id,
        teacher_id=body.get("teacher_id"),
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    return {
        "id": new_class.id,
        "name": new_class.name,
        "village_id": new_class.village_id,
        "message": "Class created successfully",
    }


@router.get("/{class_id}/students")
def get_class_students(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles([UserRole.admin, UserRole.teacher, UserRole.manager])
    ),
):
    """Get all students enrolled in a class."""
    class_group = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
    if not class_group:
        raise HTTPException(status_code=404, detail="Class not found")

    enrollments = (
        db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id).all()
    )

    students = []
    for e in enrollments:
        child = db.query(Child).filter(Child.id == e.child_id).first()
        if child and child.status == ChildStatus.active:
            students.append(
                {
                    "id": child.id,
                    "child_code": child.child_code,
                    "full_name": child.full_name,
                    "class_grade": child.class_grade,
                    "enrollment_id": e.id,
                }
            )

    return {
        "class_id": class_id,
        "class_name": class_group.name,
        "total_students": len(students),
        "students": students,
    }


@router.post("/{class_id}/enroll", status_code=201)
def enroll_child(
    class_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """Enroll a child in a class. Admin only. One class per child."""
    child_id = body.get("child_id", "").strip()
    if not child_id:
        raise HTTPException(status_code=422, detail="child_id is required")

    class_group = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
    if not class_group:
        raise HTTPException(status_code=404, detail="Class not found")

    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Check existing enrollment — move to new class if already enrolled
    existing = (
        db.query(ClassEnrollment).filter(ClassEnrollment.child_id == child_id).first()
    )

    if existing:
        old_class = (
            db.query(ClassGroup).filter(ClassGroup.id == existing.class_id).first()
        )
        existing.class_id = class_id
        existing.enrolled_date = date.today()
        db.commit()
        return {
            "message": f"{child.full_name} moved from {old_class.name if old_class else 'previous class'} to {class_group.name}",
            "child_code": child.child_code,
            "class": class_group.name,
        }

    enrollment = ClassEnrollment(
        id=str(uuid.uuid4()),
        child_id=child_id,
        class_id=class_id,
        enrolled_date=date.today(),
    )
    db.add(enrollment)
    db.commit()

    return {
        "message": f"{child.full_name} enrolled in {class_group.name}",
        "child_code": child.child_code,
        "class": class_group.name,
    }


@router.delete("/{class_id}/enroll/{child_id}", status_code=200)
def unenroll_child(
    class_id: str,
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """Remove a child from a class."""
    enrollment = (
        db.query(ClassEnrollment)
        .filter(
            ClassEnrollment.child_id == child_id,
            ClassEnrollment.class_id == class_id,
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    db.delete(enrollment)
    db.commit()
    return {"message": "Child removed from class"}
