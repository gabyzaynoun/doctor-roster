"""In-app messaging model for HIPAA-compliant communication."""
from sqlalchemy import ForeignKey, String, Text, Boolean, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime


# Association table for conversation participants
conversation_participants = Table(
    "conversation_participants",
    Base.metadata,
    Column("conversation_id", Integer, ForeignKey("conversations.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)


class Conversation(Base):
    """A conversation thread between users."""

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Conversation name (for group chats)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Is this a group conversation?
    is_group: Mapped[bool] = mapped_column(Boolean, default=False)

    # Created by
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Last message timestamp for sorting
    last_message_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    participants: Mapped[list["User"]] = relationship(
        "User", secondary=conversation_participants, backref="conversations"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", order_by="Message.created_at"
    )

    def __repr__(self) -> str:
        return f"<Conversation {self.id}: {self.name or 'Direct'}>"


class Message(Base):
    """A message in a conversation."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Conversation this message belongs to
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id"), index=True
    )

    # Sender
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    # Message content
    content: Mapped[str] = mapped_column(Text)

    # Message type
    message_type: Mapped[str] = mapped_column(
        String(20), default="text"
    )  # text, image, file, system

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    edited_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )
    sender: Mapped["User"] = relationship("User")
    read_receipts: Mapped[list["MessageReadReceipt"]] = relationship(
        "MessageReadReceipt", back_populates="message"
    )

    def __repr__(self) -> str:
        return f"<Message {self.id}: {self.content[:50]}...>"


class MessageReadReceipt(Base):
    """Track who has read which messages."""

    __tablename__ = "message_read_receipts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    read_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    message: Mapped["Message"] = relationship(
        "Message", back_populates="read_receipts"
    )
    user: Mapped["User"] = relationship("User")
