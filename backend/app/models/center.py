from sqlalchemy import String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime


class Center(Base):
    __tablename__ = "centers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    name_ar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    allowed_shifts: Mapped[list[str]] = mapped_column(JSON, default=[])
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    coverage_templates: Mapped[list["CoverageTemplate"]] = relationship(
        "CoverageTemplate", back_populates="center"
    )
    assignments: Mapped[list["Assignment"]] = relationship(
        "Assignment", back_populates="center"
    )
