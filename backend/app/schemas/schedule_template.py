from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PatternEntry(BaseModel):
    """A single pattern entry in a template."""
    day_of_week: int  # 0-6 (Monday-Sunday)
    center_code: str
    shift_code: str
    doctor_count: int = 1


class TemplatePattern(BaseModel):
    """The complete pattern data for a template."""
    patterns: list[PatternEntry]


class ScheduleTemplateBase(BaseModel):
    """Base schema for schedule templates."""
    name: str
    description: Optional[str] = None


class ScheduleTemplateCreate(ScheduleTemplateBase):
    """Schema for creating a template from scratch."""
    pattern_data: TemplatePattern


class ScheduleTemplateFromSchedule(ScheduleTemplateBase):
    """Schema for creating a template from an existing schedule."""
    source_schedule_id: int


class ScheduleTemplateUpdate(BaseModel):
    """Schema for updating a template."""
    name: Optional[str] = None
    description: Optional[str] = None


class ScheduleTemplateResponse(ScheduleTemplateBase):
    """Response schema for a template."""
    id: int
    pattern_data: dict
    created_by_id: int
    source_schedule_id: Optional[int]
    times_used: int
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplyTemplateRequest(BaseModel):
    """Request schema for applying a template to a schedule."""
    template_id: int
    clear_existing: bool = False
