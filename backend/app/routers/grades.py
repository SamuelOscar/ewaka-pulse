from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.database import get_db
from app.models.grade import Grade, Term
from app.models.child import Child
from app.models.attendance import Attendance, AttendanceStatus
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.grade import (
    GradeCreateRequest,
    GradeUpdateRequest,
    GradeResponse,
    TermReportCard,
    SubjectSummary,
)
from app.middleware.rbac import require_roles

router = APIRouter(prefix="/grades", tags=["Grades"])


def _calculate_grade_letter(percentage: float) -> str:
    if percentage >= 90:
        return "D1"
    elif percentage >= 80:
        return "D2"
    elif percentage >= 70:
        return "C3"
    elif percentage >= 65:
        return "C4"
    elif percentage >= 60:
        return "C5"
    elif percentage >= 55:
        return "C6"
    elif percentage >= 50:
        return "P7"
    elif percentage >= 45:
        return "P8"
    else:
        return "F9"


@router.post("/", status_code=status.HTTP_201_CREATED)
def enter_grade(
    request: Request,
    body: GradeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.teacher])),
):
    child = db.query(Child).filter(Child.id == body.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if body.score > body.max_score:
        raise HTTPException(
            status_code=422,
            detail=f"Score ({body.score}) cannot exceed max score ({body.max_score})",
        )

    existing = db.query(Grade).filter(
        Grade.child_id == body.child_id,
        Grade.subject == body.subject,
        Grade.term == body.term,
        Grade.academic_year == body.academic_year,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Grade for {body.subject} in {body.term.value} {body.academic_year} already exists. Use PATCH /grades/{existing.id} to update it.",
        )

    grade = Grade(
        id=str(uuid.uuid4()),
        child_id=body.child_id,
        subject=body.subject,
        term=body.term,
        academic_year=body.academic_year,
        score=body.score,
        max_score=body.max_score,
        comments=body.comments,
        teacher_id=current_user.id,
    )
    db.add(grade)

    percentage = round((body.score / body.max_score) * 100, 1)
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="GRADE_ENTERED",
        entity_type="grade",
        entity_id=grade.id,
        details=f"Child: {child.child_code} | Subject: {body.subject} | Term: {body.term.value} | Score: {body.score}/{body.max_score} ({percentage}%)",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(grade)

    return GradeResponse(
        id=grade.id,
        child_id=grade.child_id,
        subject=grade.subject,
        term=grade.term.value,
        academic_year=grade.academic_year,
        score=grade.score,
        max_score=grade.max_score,
        percentage=percentage,
        comments=grade.comments,
        teacher_id=grade.teacher_id,
        created_at=grade.created_at.isoformat(),
    )


@router.get("/child/{child_id}")
def get_child_grades(
    child_id: str,
    term: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin, UserRole.teacher, UserRole.manager
    ])),
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    query = db.query(Grade).filter(Grade.child_id == child_id)
    if term:
        try:
            query = query.filter(Grade.term == Term(term))
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid term. Choose from: {[t.value for t in Term]}",
            )
    if academic_year:
        query = query.filter(Grade.academic_year == academic_year)

    grades = query.order_by(Grade.academic_year, Grade.term, Grade.subject).all()

    return {
        "child_code": child.child_code,
        "child_name": child.full_name,
        "total_grades": len(grades),
        "grades": [
            GradeResponse(
                id=g.id,
                child_id=g.child_id,
                subject=g.subject,
                term=g.term.value,
                academic_year=g.academic_year,
                score=g.score,
                max_score=g.max_score,
                percentage=round((g.score / g.max_score) * 100, 1),
                comments=g.comments,
                teacher_id=g.teacher_id,
                created_at=g.created_at.isoformat(),
            )
            for g in grades
        ],
    }


@router.get("/report/{child_id}")
def get_term_report(
    child_id: str,
    term: str = Query(...),
    academic_year: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.admin, UserRole.teacher, UserRole.manager
    ])),
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    try:
        term_enum = Term(term)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid term. Choose from: {[t.value for t in Term]}",
        )

    grades = db.query(Grade).filter(
        Grade.child_id == child_id,
        Grade.term == term_enum,
        Grade.academic_year == academic_year,
    ).order_by(Grade.subject).all()

    if not grades:
        raise HTTPException(
            status_code=404,
            detail=f"No grades found for {child.child_code} in {term} {academic_year}",
        )

    subjects = [
        SubjectSummary(
            subject=g.subject,
            score=g.score,
            max_score=g.max_score,
            percentage=round((g.score / g.max_score) * 100, 1),
            term=g.term.value,
            comments=g.comments,
        )
        for g in grades
    ]

    total_score = sum(g.score for g in grades)
    total_max = sum(g.max_score for g in grades)
    avg_percentage = round((total_score / total_max) * 100, 1) if total_max > 0 else 0.0

    all_attendance = db.query(Attendance).filter(Attendance.child_id == child_id).all()
    attendance_rate = None
    if all_attendance:
        present_count = sum(
            1 for a in all_attendance
            if a.status in [AttendanceStatus.present, AttendanceStatus.late]
        )
        attendance_rate = round((present_count / len(all_attendance)) * 100, 1)

    return TermReportCard(
        child_code=child.child_code,
        child_name=child.full_name,
        term=term_enum.value,
        academic_year=academic_year,
        subjects=subjects,
        total_score=total_score,
        total_max=total_max,
        average_percentage=avg_percentage,
        grade_letter=_calculate_grade_letter(avg_percentage),
        attendance_rate=attendance_rate,
    )


@router.patch("/{grade_id}")
def update_grade(
    grade_id: str,
    body: GradeUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    changed = []
    if body.score is not None:
        if body.score > grade.max_score:
            raise HTTPException(
                status_code=422,
                detail=f"Score cannot exceed max score ({grade.max_score})",
            )
        grade.score = body.score
        changed.append("score")
    if body.comments is not None:
        grade.comments = body.comments
        changed.append("comments")
    if not changed:
        raise HTTPException(status_code=422, detail="No fields provided to update")

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="GRADE_UPDATED",
        entity_type="grade",
        entity_id=grade.id,
        details=f"Updated: {', '.join(changed)}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(grade)

    return GradeResponse(
        id=grade.id,
        child_id=grade.child_id,
        subject=grade.subject,
        term=grade.term.value,
        academic_year=grade.academic_year,
        score=grade.score,
        max_score=grade.max_score,
        percentage=round((grade.score / grade.max_score) * 100, 1),
        comments=grade.comments,
        teacher_id=grade.teacher_id,
        created_at=grade.created_at.isoformat(),
    )