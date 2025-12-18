"""Notification model for in-app notifications."""
from sqlalchemy import ForeignKey, String, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime
import enum


class NotificationType(str, enum.Enum):
    # Schedule notifications
    SCHEDULE_PUBLISHED = "schedule_published"
    SCHEDULE_UPDATED = "schedule_updated"
    SHIFT_ASSIGNED = "shift_assigned"
    SHIFT_REMOVED = "shift_removed"

    # Swap notifications
    SWAP_REQUEST_RECEIVED = "swap_request_received"
    SWAP_REQUEST_ACCEPTED = "swap_request_accepted"
    SWAP_REQUEST_DECLINED = "swap_request_declined"
    SWAP_REQUEST_CANCELLED = "swap_request_cancelled"

    # Leave notifications
    LEAVE_APPROVED = "leave_approved"
    LEAVE_REJECTED = "leave_rejected"
    LEAVE_REMINDER = "leave_reminder"

    # System notifications
    ANNOUNCEMENT = "announcement"
    REMINDER = "reminder"
    SYSTEM = "system"


class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    """In-app notification for users."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Recipient
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Notification content
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)

    # Type and priority
    type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType), default=NotificationType.SYSTEM
    )
    priority: Mapped[NotificationPriority] = mapped_column(
        SQLEnum(NotificationPriority), default=NotificationPriority.NORMAL
    )

    # Read status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Optional link/action
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    action_label: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Reference to related entity (polymorphic)
    related_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    related_id: Mapped[int | None] = mapped_column(nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", backref="notifications")

    def mark_as_read(self) -> None:
        """Mark notification as read."""
        self.is_read = True
        self.read_at = datetime.utcnow()

    def __repr__(self) -> str:
        return f"<Notification {self.id}: {self.title} ({self.type})>"


class Announcement(Base):
    """System-wide or group announcements."""

    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Content
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)

    # Target audience
    target_role: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # None = all users
    target_center_id: Mapped[int | None] = mapped_column(
        ForeignKey("centers.id"), nullable=True
    )

    # Priority and display
    priority: Mapped[NotificationPriority] = mapped_column(
        SQLEnum(NotificationPriority), default=NotificationPriority.NORMAL
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)

    # Visibility
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    publish_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Author
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    created_by: Mapped["User"] = relationship("User")
    target_center: Mapped["Center"] = relationship("Center")

    def __repr__(self) -> str:
        return f"<Announcement {self.id}: {self.title}>"
