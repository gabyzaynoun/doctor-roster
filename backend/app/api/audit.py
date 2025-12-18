"""Audit log API endpoints."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_admin_user
from app.models.user import User
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.services.audit import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=AuditLogListResponse)
def get_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    limit: int = Query(50, ge=1, le=500, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Results to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Get audit logs with optional filters.

    Admin only. Returns paginated list of audit log entries.
    """
    audit_service = AuditService(db)

    logs = audit_service.get_logs(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    total = audit_service.get_logs_count(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        start_date=start_date,
        end_date=end_date,
    )

    # Enrich with user names
    items = []
    for log in logs:
        item = AuditLogResponse(
            id=log.id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            user_id=log.user_id,
            user_name=log.user.name if log.user else None,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        items.append(item)

    return AuditLogListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/entity/{entity_type}/{entity_id}", response_model=list[AuditLogResponse])
def get_entity_history(
    entity_type: str,
    entity_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Get change history for a specific entity.

    Admin only. Returns list of changes made to the entity.
    """
    audit_service = AuditService(db)
    logs = audit_service.get_entity_history(entity_type, entity_id, limit)

    return [
        AuditLogResponse(
            id=log.id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            user_id=log.user_id,
            user_name=log.user.name if log.user else None,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.get("/user/{user_id}", response_model=list[AuditLogResponse])
def get_user_activity(
    user_id: int,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Get recent activity for a specific user.

    Admin only. Returns list of actions performed by the user.
    """
    audit_service = AuditService(db)
    logs = audit_service.get_user_activity(user_id, days, limit)

    return [
        AuditLogResponse(
            id=log.id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            user_id=log.user_id,
            user_name=log.user.name if log.user else None,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.get("/recent", response_model=list[AuditLogResponse])
def get_recent_activity(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Get recent activity across all users.

    Admin only. Returns list of recent actions in the system.
    """
    audit_service = AuditService(db)
    logs = audit_service.get_recent_activity(hours, limit)

    return [
        AuditLogResponse(
            id=log.id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            user_id=log.user_id,
            user_name=log.user.name if log.user else None,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]
