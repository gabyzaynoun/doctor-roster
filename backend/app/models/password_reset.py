from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from datetime import datetime, timedelta
import secrets


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    @classmethod
    def generate_token(cls) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)

    @classmethod
    def get_expiry(cls, hours: int = 1) -> datetime:
        """Get expiry datetime."""
        return datetime.utcnow() + timedelta(hours=hours)

    @property
    def is_valid(self) -> bool:
        """Check if token is still valid."""
        return self.used_at is None and datetime.utcnow() < self.expires_at
