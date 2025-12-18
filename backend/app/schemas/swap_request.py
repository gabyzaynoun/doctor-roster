"""Schemas for shift swap requests."""
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class SwapRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SwapRequestCreate(BaseModel):
    """Create a new swap request."""

    requester_assignment_id: int
    target_id: int | None = None  # None for open requests
    target_assignment_id: int | None = None  # None for giveaways
    request_type: str = "swap"  # swap, giveaway, pickup
    message: str | None = None


class SwapRequestRespond(BaseModel):
    """Respond to a swap request."""

    accept: bool
    response_message: str | None = None


class SwapRequestResponse(BaseModel):
    """Response schema for swap requests."""

    id: int
    requester_id: int
    requester_name: str
    target_id: int | None
    target_name: str | None
    requester_assignment_id: int
    requester_assignment_date: str
    requester_assignment_shift: str
    requester_assignment_center: str
    target_assignment_id: int | None
    target_assignment_date: str | None
    target_assignment_shift: str | None
    target_assignment_center: str | None
    request_type: str
    status: SwapRequestStatus
    message: str | None
    response_message: str | None
    created_at: datetime
    responded_at: datetime | None
    expires_at: datetime | None

    class Config:
        from_attributes = True


class SwapRequestListResponse(BaseModel):
    """List of swap requests."""

    items: list[SwapRequestResponse]
    total: int
    pending_count: int
