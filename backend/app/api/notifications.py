"""API routes for notifications."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user, get_admin_user
from app.models.user import User
from app.models.notification import (
    Notification,
    Announcement,
    NotificationType,
    NotificationPriority,
)

router = APIRouter()


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    priority: str
    is_read: bool
    action_url: str | None
    action_label: str | None
    created_at: datetime
    read_at: datetime | None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class AnnouncementCreate(BaseModel):
    title: str
    message: str
    target_role: str | None = None
    target_center_id: int | None = None
    priority: str = "normal"
    is_pinned: bool = False


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str
    priority: str
    is_pinned: bool
    created_by_name: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .count()
    )

    notifications = (
        query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    )

    return NotificationListResponse(
        items=[
            NotificationResponse(
                id=n.id,
                title=n.title,
                message=n.message,
                type=n.type.value if hasattr(n.type, "value") else str(n.type),
                priority=n.priority.value if hasattr(n.priority, "value") else str(n.priority),
                is_read=n.is_read,
                action_url=n.action_url,
                action_label=n.action_label,
                created_at=n.created_at,
                read_at=n.read_at,
            )
            for n in notifications
        ],
        total=total,
        unread_count=unread_count,
    )


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.mark_as_read()
    db.commit()

    return {"status": "ok"}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()

    return {"status": "ok"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"status": "ok"}


# Announcements endpoints
@router.get("/announcements", response_model=list[AnnouncementResponse])
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active announcements for current user."""
    query = db.query(Announcement).filter(
        Announcement.is_active == True,
        Announcement.publish_at <= datetime.utcnow(),
    )

    # Filter by role if applicable
    query = query.filter(
        (Announcement.target_role.is_(None))
        | (Announcement.target_role == current_user.role.value)
    )

    announcements = query.order_by(
        desc(Announcement.is_pinned), desc(Announcement.created_at)
    ).all()

    return [
        AnnouncementResponse(
            id=a.id,
            title=a.title,
            message=a.message,
            priority=a.priority.value if hasattr(a.priority, "value") else str(a.priority),
            is_pinned=a.is_pinned,
            created_by_name=a.created_by.name if a.created_by else "System",
            created_at=a.created_at,
        )
        for a in announcements
    ]


@router.post("/announcements", response_model=AnnouncementResponse, status_code=201)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Create a new announcement. Admin only."""
    announcement = Announcement(
        title=data.title,
        message=data.message,
        target_role=data.target_role,
        target_center_id=data.target_center_id,
        priority=NotificationPriority(data.priority),
        is_pinned=data.is_pinned,
        created_by_id=current_user.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    # Create notifications for all relevant users
    users_query = db.query(User).filter(User.is_active == True)
    if data.target_role:
        users_query = users_query.filter(User.role == data.target_role)

    for user in users_query.all():
        notification = Notification(
            user_id=user.id,
            title=f"Announcement: {data.title}",
            message=data.message[:200] + "..." if len(data.message) > 200 else data.message,
            type=NotificationType.ANNOUNCEMENT,
            priority=NotificationPriority(data.priority),
            action_url=f"/announcements/{announcement.id}",
            action_label="View",
            related_type="announcement",
            related_id=announcement.id,
        )
        db.add(notification)

    db.commit()

    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        message=announcement.message,
        priority=announcement.priority.value,
        is_pinned=announcement.is_pinned,
        created_by_name=current_user.name,
        created_at=announcement.created_at,
    )


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Delete an announcement. Admin only."""
    announcement = (
        db.query(Announcement).filter(Announcement.id == announcement_id).first()
    )
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    announcement.is_active = False
    db.commit()

    return {"status": "ok"}
