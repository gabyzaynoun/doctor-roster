from sqlalchemy import ForeignKey, Date, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime, date


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (
        UniqueConstraint(
            "schedule_id", "doctor_id", "date", name="uq_schedule_doctor_date"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    center_id: Mapped[int] = mapped_column(ForeignKey("centers.id"), index=True)
    shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    is_pediatrics: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    schedule: Mapped["Schedule"] = relationship("Schedule", back_populates="assignments")
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="assignments")
    center: Mapped["Center"] = relationship("Center", back_populates="assignments")
    shift: Mapped["Shift"] = relationship("Shift", back_populates="assignments")
