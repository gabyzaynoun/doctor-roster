from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_admin_user, get_current_user
from app.core.security import get_password_hash
from app.models.user import User
from app.models.doctor import Doctor
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Create a new user. Admin only."""
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data = user.model_dump(exclude={"password", "monthly_hours_target"})
    db_user = User(
        **user_data,
        password_hash=get_password_hash(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/with-doctor", response_model=UserResponse, status_code=201)
def create_user_with_doctor(
    user: UserCreate,
    employee_id: str | None = None,
    specialty: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Create a new user with a doctor profile. Admin only."""
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data = user.model_dump(exclude={"password", "monthly_hours_target"})
    db_user = User(
        **user_data,
        password_hash=get_password_hash(user.password),
    )
    db.add(db_user)
    db.flush()

    db_doctor = Doctor(
        user_id=db_user.id,
        employee_id=employee_id,
        specialty=specialty,
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """List all users. Admin only."""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user by ID. Authenticated users can view."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Update user. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Delete user. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
