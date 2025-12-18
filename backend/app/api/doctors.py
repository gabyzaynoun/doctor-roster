from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.deps import get_current_user, get_admin_user
from app.models.doctor import Doctor
from app.models.user import User
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorResponse

router = APIRouter()


@router.get("/", response_model=list[DoctorResponse])
def list_doctors(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doctors = (
        db.query(Doctor)
        .options(joinedload(Doctor.user))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return doctors


@router.post("/", response_model=DoctorResponse, status_code=201)
def create_doctor(
    doctor: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    db_doctor = db.query(Doctor).filter(Doctor.user_id == doctor.user_id).first()
    if db_doctor:
        raise HTTPException(status_code=400, detail="Doctor profile already exists for this user")
    db_doctor = Doctor(**doctor.model_dump())
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.user))
        .filter(Doctor.id == doctor_id)
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.patch("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: int,
    doctor_update: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    update_data = doctor_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)
    return doctor


@router.delete("/{doctor_id}", status_code=204)
def delete_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.delete(doctor)
    db.commit()
