from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.core.database import get_db
from app.core.deps import get_current_user, get_team_lead_or_admin, get_admin_user
from app.models.leave import Leave
from app.models.user import User
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveResponse, LeaveStatus

router = APIRouter()


@router.get("/", response_model=list[LeaveResponse])
def list_leaves(
    doctor_id: int | None = None,
    status: LeaveStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Leave)

    if doctor_id:
        query = query.filter(Leave.doctor_id == doctor_id)
    if status:
        query = query.filter(Leave.status == status)
    if date_from:
        query = query.filter(Leave.end_date >= date_from)
    if date_to:
        query = query.filter(Leave.start_date <= date_to)

    leaves = query.order_by(Leave.start_date.desc()).offset(skip).limit(limit).all()
    return leaves


@router.post("/", response_model=LeaveResponse, status_code=201)
def create_leave(
    leave: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_leave = Leave(**leave.model_dump())
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave


@router.get("/{leave_id}", response_model=LeaveResponse)
def get_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    return leave


@router.patch("/{leave_id}", response_model=LeaveResponse)
def update_leave(
    leave_id: int,
    leave_update: LeaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_admin),
):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    update_data = leave_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(leave, field, value)

    db.commit()
    db.refresh(leave)
    return leave


@router.delete("/{leave_id}", status_code=204)
def delete_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    db.delete(leave)
    db.commit()
