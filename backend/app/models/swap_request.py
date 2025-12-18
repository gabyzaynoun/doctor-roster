"""Shift swap request model for doctors to trade shifts."""
from sqlalchemy import ForeignKey, String, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime
import enum


class SwapRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SwapRequest(Base):
    """Model for shift swap requests between doctors."""

    __tablename__ = "swap_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # The doctor requesting the swap
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id"), index=True
    )

    # The doctor being asked to swap (optional - can be open request)
    target_id: Mapped[int | None] = mapped_column(
        ForeignKey("doctors.id"), nullable=True, index=True
    )

    # The assignment the requester wants to give away
    requester_assignment_id: Mapped[int] = mapped_column(
        ForeignKey("assignments.id"), index=True
    )

    # The assignment the requester wants in exchange (optional for giveaway)
    target_assignment_id: Mapped[int | None] = mapped_column(
        ForeignKey("assignments.id"), nullable=True
    )

    # Request type
    request_type: Mapped[str] = mapped_column(
        String(20), default="swap"  # swap, giveaway, pickup
    )

    status: Mapped[SwapRequestStatus] = mapped_column(
        SQLEnum(SwapRequestStatus), default=SwapRequestStatus.PENDING
    )

    # Optional message from requester
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Response message from target
    response_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    responded_at: Mapped[datetime | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Who approved (for admin approval workflow)
    approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    requester: Mapped["Doctor"] = relationship(
        "Doctor", foreign_keys=[requester_id], backref="swap_requests_sent"
    )
    target: Mapped["Doctor"] = relationship(
        "Doctor", foreign_keys=[target_id], backref="swap_requests_received"
    )
    requester_assignment: Mapped["Assignment"] = relationship(
        "Assignment", foreign_keys=[requester_assignment_id]
    )
    target_assignment: Mapped["Assignment"] = relationship(
        "Assignment", foreign_keys=[target_assignment_id]
    )
    approved_by: Mapped["User"] = relationship(
        "User", foreign_keys=[approved_by_id]
    )

    def __repr__(self) -> str:
        return f"<SwapRequest {self.id}: {self.requester_id} -> {self.target_id} ({self.status})>"
