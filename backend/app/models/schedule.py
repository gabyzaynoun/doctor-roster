from sqlalchemy import Integer, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime
import enum


class ScheduleStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Schedule(Base):
    __tablename__ = "schedules"
    __table_args__ = (UniqueConstraint("year", "month", name="uq_year_month"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    month: Mapped[int] = mapped_column(Integer, index=True)
    status: Mapped[ScheduleStatus] = mapped_column(
        SQLEnum(ScheduleStatus), default=ScheduleStatus.DRAFT
    )
    published_at: Mapped[datetime | None] = mapped_column(nullable=True)
    published_by_id: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    assignments: Mapped[list["Assignment"]] = relationship(
        "Assignment", back_populates="schedule", cascade="all, delete-orphan"
    )
