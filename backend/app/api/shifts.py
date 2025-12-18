from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, get_admin_user
from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift import ShiftCreate, ShiftUpdate, ShiftResponse

router = APIRouter()


@router.get("/", response_model=list[ShiftResponse])
def list_shifts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shifts = db.query(Shift).offset(skip).limit(limit).all()
    return shifts


@router.post("/", response_model=ShiftResponse, status_code=201)
def create_shift(
    shift: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    db_shift = db.query(Shift).filter(Shift.code == shift.code).first()
    if db_shift:
        raise HTTPException(status_code=400, detail="Shift code already exists")
    db_shift = Shift(**shift.model_dump())
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift


@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@router.patch("/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: int,
    shift_update: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    update_data = shift_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shift, field, value)

    db.commit()
    db.refresh(shift)
    return shift


@router.delete("/{shift_id}", status_code=204)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
