from sqlalchemy import String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum
from datetime import datetime


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEAM_LEAD = "team_lead"
    DOCTOR = "doctor"


class Nationality(str, enum.Enum):
    SAUDI = "saudi"
    NON_SAUDI = "non_saudi"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.DOCTOR)
    nationality: Mapped[Nationality] = mapped_column(
        SQLEnum(Nationality), default=Nationality.NON_SAUDI
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    doctor_profile: Mapped["Doctor"] = relationship(
        "Doctor", back_populates="user", uselist=False
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="user"
    )

    @property
    def monthly_hours_target(self) -> int:
        """Saudi doctors: 160 hours, Non-Saudi: 192 hours."""
        return 160 if self.nationality == Nationality.SAUDI else 192
