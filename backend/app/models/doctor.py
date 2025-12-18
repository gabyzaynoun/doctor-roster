from sqlalchemy import ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, index=True
    )
    employee_id: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True
    )
    specialty: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_pediatrics_certified: Mapped[bool] = mapped_column(Boolean, default=False)
    can_work_nights: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    assignments: Mapped[list["Assignment"]] = relationship(
        "Assignment", back_populates="doctor"
    )
    leaves: Mapped[list["Leave"]] = relationship("Leave", back_populates="doctor")
