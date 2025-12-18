from pydantic import BaseModel
from datetime import datetime


class CoverageTemplateBase(BaseModel):
    center_id: int
    shift_id: int
    min_doctors: int = 1
    is_mandatory: bool = True


class CoverageTemplateCreate(CoverageTemplateBase):
    pass


class CoverageTemplateUpdate(BaseModel):
    min_doctors: int | None = None
    is_mandatory: bool | None = None


class CoverageTemplateResponse(CoverageTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
