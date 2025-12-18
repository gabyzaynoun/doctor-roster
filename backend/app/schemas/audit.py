"""Pydantic schemas for audit logs."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class AuditLogBase(BaseModel):
    """Base audit log schema."""
    action: str
    entity_type: str
    entity_id: Optional[int] = None


class AuditLogResponse(AuditLogBase):
    """Response schema for audit logs."""
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    old_values: Optional[dict[str, Any]] = None
    new_values: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Response schema for paginated audit log list."""
    items: list[AuditLogResponse]
    total: int
    limit: int
    offset: int


class AuditLogFilters(BaseModel):
    """Query filters for audit logs."""
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    user_id: Optional[int] = None
    action: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0
