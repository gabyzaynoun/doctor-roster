from pydantic import BaseModel, field_validator
from datetime import datetime, date
from enum import Enum


class LeaveType(str, Enum):
    ANNUAL = "annual"
    EMERGENCY = "emergency"
    SICK = "sick"
    REQUEST_OFF = "request_off"


class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    CANCELLED = "cancelled"


class LeaveBase(BaseModel):
    doctor_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str | None = None

    @field_validator("end_date")
    @classmethod
    def end_date_after_start(cls, v: date, info) -> date:
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be after or equal to start_date")
        return v


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(BaseModel):
    leave_type: LeaveType | None = None
    start_date: date | None = None
    end_date: date | None = None
    reason: str | None = None
    status: LeaveStatus | None = None
    review_notes: str | None = None


class LeaveResponse(LeaveBase):
    id: int
    status: LeaveStatus
    reviewed_by_id: int | None
    reviewed_at: datetime | None
    review_notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
