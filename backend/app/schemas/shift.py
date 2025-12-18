from pydantic import BaseModel
from datetime import datetime, time
from enum import Enum


class ShiftType(str, Enum):
    EIGHT_HOUR = "8h"
    TWELVE_HOUR = "12h"


class ShiftBase(BaseModel):
    code: str
    name: str
    shift_type: ShiftType
    start_time: time
    end_time: time
    hours: int
    is_overnight: bool = False
    is_optional: bool = False


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    shift_type: ShiftType | None = None
    start_time: time | None = None
    end_time: time | None = None
    hours: int | None = None
    is_overnight: bool | None = None
    is_optional: bool | None = None


class ShiftResponse(ShiftBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
