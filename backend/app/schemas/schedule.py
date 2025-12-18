from pydantic import BaseModel, field_validator
from datetime import datetime
from enum import Enum


class ScheduleStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ScheduleBase(BaseModel):
    year: int
    month: int

    @field_validator("month")
    @classmethod
    def validate_month(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("Month must be between 1 and 12")
        return v

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if not 2020 <= v <= 2100:
            raise ValueError("Year must be between 2020 and 2100")
        return v


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    status: ScheduleStatus | None = None


class ScheduleResponse(ScheduleBase):
    id: int
    status: ScheduleStatus
    published_at: datetime | None
    published_by_id: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
