from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime


class CoverageTemplate(Base):
    __tablename__ = "coverage_templates"
    __table_args__ = (
        UniqueConstraint("center_id", "shift_id", name="uq_center_shift"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    center_id: Mapped[int] = mapped_column(ForeignKey("centers.id"), index=True)
    shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"), index=True)
    min_doctors: Mapped[int] = mapped_column(Integer, default=1)
    is_mandatory: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    center: Mapped["Center"] = relationship("Center", back_populates="coverage_templates")
    shift: Mapped["Shift"] = relationship("Shift", back_populates="coverage_templates")
