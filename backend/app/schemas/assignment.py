from pydantic import BaseModel
from datetime import datetime, date


class AssignmentBase(BaseModel):
    doctor_id: int
    center_id: int
    shift_id: int
    date: date
    is_pediatrics: bool = False


class AssignmentCreate(AssignmentBase):
    schedule_id: int


class AssignmentUpdate(BaseModel):
    center_id: int | None = None
    shift_id: int | None = None
    is_pediatrics: bool | None = None


class AssignmentResponse(AssignmentBase):
    id: int
    schedule_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
