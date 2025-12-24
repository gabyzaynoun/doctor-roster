from sqlalchemy import Integer, String, Text, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime
import enum


class PostingType(str, enum.Enum):
    GIVEAWAY = "giveaway"  # Doctor wants to give away their shift
    PICKUP = "pickup"      # Doctor wants to pick up extra shifts
    SWAP = "swap"          # Doctor wants to swap with someone


class PostingStatus(str, enum.Enum):
    OPEN = "open"          # Available for claiming
    PENDING = "pending"    # Someone has expressed interest
    CLAIMED = "claimed"    # Successfully claimed
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ShiftPosting(Base):
    """
    Represents a shift that a doctor wants to give away, swap, or a request to pickup.
    This is the Shift Marketplace feature.
    """
    __tablename__ = "shift_postings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # The doctor posting the shift
    poster_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False)

    # The assignment being posted (for giveaway/swap)
    assignment_id: Mapped[int | None] = mapped_column(ForeignKey("assignments.id"), nullable=True)

    # Type and status
    posting_type: Mapped[PostingType] = mapped_column(SQLEnum(PostingType), default=PostingType.GIVEAWAY)
    status: Mapped[PostingStatus] = mapped_column(SQLEnum(PostingStatus), default=PostingStatus.OPEN)

    # For pickup requests - what they're looking for
    preferred_date: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    preferred_center_id: Mapped[int | None] = mapped_column(ForeignKey("centers.id"), nullable=True)
    preferred_shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"), nullable=True)

    # Message/reason
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Incentive (bonus points or priority for hard-to-fill)
    bonus_points: Mapped[int] = mapped_column(Integer, default=0)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Claiming
    claimed_by_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    poster: Mapped["Doctor"] = relationship("Doctor", foreign_keys=[poster_id])
    assignment: Mapped["Assignment"] = relationship("Assignment", foreign_keys=[assignment_id])
    claimed_by: Mapped["Doctor"] = relationship("Doctor", foreign_keys=[claimed_by_id])
    preferred_center: Mapped["Center"] = relationship("Center", foreign_keys=[preferred_center_id])
    preferred_shift: Mapped["Shift"] = relationship("Shift", foreign_keys=[preferred_shift_id])
