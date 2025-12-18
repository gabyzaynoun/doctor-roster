"""Doctor availability preferences model."""
from sqlalchemy import ForeignKey, String, Enum as SQLEnum, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime, date
import enum


class PreferenceLevel(str, enum.Enum):
    PREFERRED = "preferred"      # Doctor wants to work
    NEUTRAL = "neutral"          # No preference
    AVOID = "avoid"              # Doctor prefers not to work
    UNAVAILABLE = "unavailable"  # Doctor cannot work


class AvailabilityPreference(Base):
    """Weekly recurring availability preferences."""

    __tablename__ = "availability_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id"), index=True
    )

    # Day of week (0=Monday, 6=Sunday)
    day_of_week: Mapped[int] = mapped_column()

    # Preference level for this day/shift combination
    preference: Mapped[PreferenceLevel] = mapped_column(
        SQLEnum(PreferenceLevel), default=PreferenceLevel.NEUTRAL
    )

    # Optional: specific shift type preference
    shift_id: Mapped[int | None] = mapped_column(
        ForeignKey("shifts.id"), nullable=True
    )

    # When this preference is effective
    effective_from: Mapped[date] = mapped_column(Date, default=date.today)
    effective_until: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    doctor: Mapped["Doctor"] = relationship(
        "Doctor", backref="availability_preferences"
    )
    shift: Mapped["Shift"] = relationship("Shift")


class SpecificDatePreference(Base):
    """Specific date availability (overrides weekly preferences)."""

    __tablename__ = "specific_date_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id"), index=True
    )

    # The specific date
    date: Mapped[date] = mapped_column(Date, index=True)

    # Preference for this date
    preference: Mapped[PreferenceLevel] = mapped_column(
        SQLEnum(PreferenceLevel), default=PreferenceLevel.NEUTRAL
    )

    # Optional: specific shift type
    shift_id: Mapped[int | None] = mapped_column(
        ForeignKey("shifts.id"), nullable=True
    )

    # Reason (visible to admins)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    doctor: Mapped["Doctor"] = relationship(
        "Doctor", backref="specific_date_preferences"
    )
    shift: Mapped["Shift"] = relationship("Shift")
