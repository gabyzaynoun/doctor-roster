from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, get_admin_user
from app.models.center import Center
from app.models.user import User
from app.schemas.center import CenterCreate, CenterUpdate, CenterResponse

router = APIRouter()


@router.get("/", response_model=list[CenterResponse])
def list_centers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    centers = db.query(Center).offset(skip).limit(limit).all()
    return centers


@router.post("/", response_model=CenterResponse, status_code=201)
def create_center(
    center: CenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    db_center = db.query(Center).filter(Center.code == center.code).first()
    if db_center:
        raise HTTPException(status_code=400, detail="Center code already exists")
    db_center = Center(**center.model_dump())
    db.add(db_center)
    db.commit()
    db.refresh(db_center)
    return db_center


@router.get("/{center_id}", response_model=CenterResponse)
def get_center(
    center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    center = db.query(Center).filter(Center.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    return center


@router.patch("/{center_id}", response_model=CenterResponse)
def update_center(
    center_id: int,
    center_update: CenterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    center = db.query(Center).filter(Center.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")

    update_data = center_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(center, field, value)

    db.commit()
    db.refresh(center)
    return center


@router.delete("/{center_id}", status_code=204)
def delete_center(
    center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    center = db.query(Center).filter(Center.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    db.delete(center)
    db.commit()
