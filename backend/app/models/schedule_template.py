from sqlalchemy import Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime


class ScheduleTemplate(Base):
    """
    Stores reusable schedule patterns as templates.
    Templates capture the assignment patterns from a schedule that can be
    applied to create new schedules quickly.
    """
    __tablename__ = "schedule_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Template data stored as JSON
    # Format: { "patterns": [ { "day_of_week": 0-6, "center_code": "ER", "shift_code": "AM", "doctor_count": 2 }, ... ] }
    pattern_data: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Metadata
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    source_schedule_id: Mapped[int | None] = mapped_column(ForeignKey("schedules.id"), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Usage tracking
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    source_schedule: Mapped["Schedule"] = relationship("Schedule", foreign_keys=[source_schedule_id])
