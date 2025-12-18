from sqlalchemy import String, Time, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime, time
import enum


class ShiftType(str, enum.Enum):
    EIGHT_HOUR = "8h"
    TWELVE_HOUR = "12h"


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    shift_type: Mapped[ShiftType] = mapped_column(SQLEnum(ShiftType))
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    hours: Mapped[int] = mapped_column(Integer)
    is_overnight: Mapped[bool] = mapped_column(default=False)
    is_optional: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    coverage_templates: Mapped[list["CoverageTemplate"]] = relationship(
        "CoverageTemplate", back_populates="shift"
    )
    assignments: Mapped[list["Assignment"]] = relationship(
        "Assignment", back_populates="shift"
    )
