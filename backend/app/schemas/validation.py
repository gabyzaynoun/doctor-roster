"""Validation schemas for constraint validation results."""
from pydantic import BaseModel, Field
from datetime import date as date_type
from typing import Any, Optional


class ViolationResponse(BaseModel):
    """Schema for a constraint violation."""
    type: str
    severity: str
    message: str
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    center_id: Optional[int] = None
    center_name: Optional[str] = None
    shift_id: Optional[int] = None
    shift_code: Optional[str] = None
    date: Optional[date_type] = None
    details: dict[str, Any] = Field(default_factory=dict)


class ValidationResultResponse(BaseModel):
    """Schema for validation result."""
    is_valid: bool
    error_count: int
    warning_count: int
    info_count: int
    violations: list[ViolationResponse]


class AssignmentValidationRequest(BaseModel):
    """Request to validate a potential assignment."""
    doctor_id: int
    center_id: int
    shift_id: int
    date: date_type
