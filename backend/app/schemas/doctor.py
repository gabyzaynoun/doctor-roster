from pydantic import BaseModel
from datetime import datetime
from app.schemas.user import UserResponse


class DoctorBase(BaseModel):
    employee_id: str | None = None
    specialty: str | None = None
    is_pediatrics_certified: bool = False
    can_work_nights: bool = True


class DoctorCreate(DoctorBase):
    user_id: int


class DoctorUpdate(BaseModel):
    employee_id: str | None = None
    specialty: str | None = None
    is_pediatrics_certified: bool | None = None
    can_work_nights: bool | None = None
    is_active: bool | None = None


class DoctorResponse(DoctorBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    user: UserResponse | None = None

    class Config:
        from_attributes = True
