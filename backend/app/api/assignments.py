from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.core.database import get_db
from app.core.deps import get_current_user, get_team_lead_or_admin, get_admin_user
from app.models.assignment import Assignment
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse

router = APIRouter()


@router.get("/", response_model=list[AssignmentResponse])
def list_assignments(
    schedule_id: int | None = None,
    doctor_id: int | None = None,
    center_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Assignment)

    if schedule_id:
        query = query.filter(Assignment.schedule_id == schedule_id)
    if doctor_id:
        query = query.filter(Assignment.doctor_id == doctor_id)
    if center_id:
        query = query.filter(Assignment.center_id == center_id)
    if date_from:
        query = query.filter(Assignment.date >= date_from)
    if date_to:
        query = query.filter(Assignment.date <= date_to)

    assignments = query.order_by(Assignment.date).offset(skip).limit(limit).all()
    return assignments


@router.post("/", response_model=AssignmentResponse, status_code=201)
def create_assignment(
    assignment: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_admin),
):
    # Check if doctor already has an assignment on this date
    existing = (
        db.query(Assignment)
        .filter(
            Assignment.schedule_id == assignment.schedule_id,
            Assignment.doctor_id == assignment.doctor_id,
            Assignment.date == assignment.date,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Doctor already has an assignment on this date",
        )

    db_assignment = Assignment(**assignment.model_dump())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: int,
    assignment_update: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_admin),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = assignment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
