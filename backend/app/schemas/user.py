from pydantic import BaseModel, EmailStr
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    TEAM_LEAD = "team_lead"
    DOCTOR = "doctor"


class Nationality(str, Enum):
    SAUDI = "saudi"
    NON_SAUDI = "non_saudi"


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.DOCTOR
    nationality: Nationality = Nationality.NON_SAUDI


class UserCreate(UserBase):
    password: str
    monthly_hours_target: int | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    role: UserRole | None = None
    nationality: Nationality | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    monthly_hours_target: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
