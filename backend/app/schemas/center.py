from pydantic import BaseModel
from datetime import datetime


class CenterBase(BaseModel):
    code: str
    name: str
    name_ar: str | None = None
    allowed_shifts: list[str] = []


class CenterCreate(CenterBase):
    pass


class CenterUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    name_ar: str | None = None
    allowed_shifts: list[str] | None = None
    is_active: bool | None = None


class CenterResponse(CenterBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
