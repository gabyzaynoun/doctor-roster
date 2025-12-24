from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum


class PostingType(str, Enum):
    GIVEAWAY = "giveaway"
    PICKUP = "pickup"
    SWAP = "swap"


class PostingStatus(str, Enum):
    OPEN = "open"
    PENDING = "pending"
    CLAIMED = "claimed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ShiftPostingCreate(BaseModel):
    """Create a new shift posting."""
    assignment_id: Optional[int] = None  # Required for giveaway/swap
    posting_type: PostingType = PostingType.GIVEAWAY
    preferred_date: Optional[str] = None  # For pickup requests
    preferred_center_id: Optional[int] = None
    preferred_shift_id: Optional[int] = None
    message: Optional[str] = None
    is_urgent: bool = False


class ShiftPostingUpdate(BaseModel):
    """Update a shift posting."""
    message: Optional[str] = None
    is_urgent: Optional[bool] = None
    status: Optional[PostingStatus] = None


class ShiftPostingClaim(BaseModel):
    """Claim a shift posting."""
    message: Optional[str] = None


class AssignmentInfo(BaseModel):
    """Brief assignment info for posting display."""
    id: int
    date: str
    center_name: str
    center_code: str
    shift_code: str
    shift_name: str
    hours: int

    class Config:
        from_attributes = True


class DoctorInfo(BaseModel):
    """Brief doctor info."""
    id: int
    name: str
    specialty: Optional[str] = None

    class Config:
        from_attributes = True


class ShiftPostingResponse(BaseModel):
    """Response schema for a shift posting."""
    id: int
    poster_id: int
    poster: Optional[DoctorInfo] = None
    assignment_id: Optional[int] = None
    assignment: Optional[AssignmentInfo] = None
    posting_type: PostingType
    status: PostingStatus
    preferred_date: Optional[str] = None
    preferred_center_id: Optional[int] = None
    preferred_shift_id: Optional[int] = None
    message: Optional[str] = None
    bonus_points: int
    is_urgent: bool
    claimed_by_id: Optional[int] = None
    claimed_by: Optional[DoctorInfo] = None
    claimed_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True
