from sqlalchemy import ForeignKey, Date, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime, date
import enum


class LeaveType(str, enum.Enum):
    ANNUAL = "annual"
    EMERGENCY = "emergency"
    SICK = "sick"
    REQUEST_OFF = "request_off"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    CANCELLED = "cancelled"


class Leave(Base):
    __tablename__ = "leaves"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    leave_type: Mapped[LeaveType] = mapped_column(SQLEnum(LeaveType))
    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[LeaveStatus] = mapped_column(
        SQLEnum(LeaveStatus), default=LeaveStatus.PENDING
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="leaves")
