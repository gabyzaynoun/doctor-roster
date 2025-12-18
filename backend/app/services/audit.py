"""Audit logging service for tracking user actions."""
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta

from app.models.audit_log import AuditLog
from app.models.user import User


class AuditService:
    """Service for creating and querying audit logs."""

    # Standard action types
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_LOGIN = "login"
    ACTION_LOGOUT = "logout"
    ACTION_PUBLISH = "publish"
    ACTION_UNPUBLISH = "unpublish"
    ACTION_ARCHIVE = "archive"
    ACTION_UNARCHIVE = "unarchive"
    ACTION_AUTO_BUILD = "auto_build"
    ACTION_EXPORT = "export"

    # Entity types
    ENTITY_USER = "user"
    ENTITY_DOCTOR = "doctor"
    ENTITY_SCHEDULE = "schedule"
    ENTITY_ASSIGNMENT = "assignment"
    ENTITY_LEAVE = "leave"
    ENTITY_CENTER = "center"
    ENTITY_SHIFT = "shift"

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.

        Args:
            action: The action performed (create, update, delete, etc.)
            entity_type: The type of entity affected (schedule, assignment, etc.)
            entity_id: The ID of the affected entity
            user_id: The ID of the user who performed the action
            old_values: Previous values (for updates)
            new_values: New values (for creates/updates)
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            The created AuditLog entry
        """
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log

    def get_logs(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditLog]:
        """
        Query audit logs with filters.

        Args:
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            user_id: Filter by user ID
            action: Filter by action type
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of matching AuditLog entries
        """
        query = self.db.query(AuditLog)

        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            query = query.filter(AuditLog.entity_id == entity_id)
        if user_id is not None:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)

        return (
            query.order_by(desc(AuditLog.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_logs_count(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Get count of audit logs matching filters."""
        query = self.db.query(AuditLog)

        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            query = query.filter(AuditLog.entity_id == entity_id)
        if user_id is not None:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)

        return query.count()

    def get_entity_history(
        self,
        entity_type: str,
        entity_id: int,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Get the change history for a specific entity."""
        return self.get_logs(
            entity_type=entity_type,
            entity_id=entity_id,
            limit=limit,
        )

    def get_user_activity(
        self,
        user_id: int,
        days: int = 30,
        limit: int = 100,
    ) -> list[AuditLog]:
        """Get recent activity for a specific user."""
        start_date = datetime.utcnow() - timedelta(days=days)
        return self.get_logs(
            user_id=user_id,
            start_date=start_date,
            limit=limit,
        )

    def get_recent_activity(
        self,
        hours: int = 24,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Get recent activity across all users."""
        start_date = datetime.utcnow() - timedelta(hours=hours)
        return self.get_logs(
            start_date=start_date,
            limit=limit,
        )


def get_client_info(request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent from request."""
    ip_address = None
    user_agent = None

    if hasattr(request, "client") and request.client:
        ip_address = request.client.host

    if hasattr(request, "headers"):
        user_agent = request.headers.get("user-agent")
        # Check for forwarded IP (behind proxy)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()

    return ip_address, user_agent
