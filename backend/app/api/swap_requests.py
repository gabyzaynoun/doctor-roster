"""API routes for shift swap requests."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user, get_admin_user
from app.models.user import User
from app.models.doctor import Doctor
from app.models.assignment import Assignment
from app.models.swap_request import SwapRequest, SwapRequestStatus
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.schemas.swap_request import (
    SwapRequestCreate,
    SwapRequestRespond,
    SwapRequestResponse,
    SwapRequestListResponse,
)

router = APIRouter()


def get_swap_response(swap: SwapRequest, db: Session) -> SwapRequestResponse:
    """Convert swap request to response schema."""
    # Get requester info
    requester = db.query(Doctor).filter(Doctor.id == swap.requester_id).first()
    requester_user = requester.user if requester else None
    requester_assignment = (
        db.query(Assignment).filter(Assignment.id == swap.requester_assignment_id).first()
    )

    # Get target info
    target = db.query(Doctor).filter(Doctor.id == swap.target_id).first() if swap.target_id else None
    target_user = target.user if target else None
    target_assignment = (
        db.query(Assignment).filter(Assignment.id == swap.target_assignment_id).first()
        if swap.target_assignment_id
        else None
    )

    return SwapRequestResponse(
        id=swap.id,
        requester_id=swap.requester_id,
        requester_name=requester_user.name if requester_user else "Unknown",
        target_id=swap.target_id,
        target_name=target_user.name if target_user else None,
        requester_assignment_id=swap.requester_assignment_id,
        requester_assignment_date=str(requester_assignment.date) if requester_assignment else "",
        requester_assignment_shift=requester_assignment.shift.code if requester_assignment else "",
        requester_assignment_center=requester_assignment.center.name if requester_assignment else "",
        target_assignment_id=swap.target_assignment_id,
        target_assignment_date=str(target_assignment.date) if target_assignment else None,
        target_assignment_shift=target_assignment.shift.code if target_assignment else None,
        target_assignment_center=target_assignment.center.name if target_assignment else None,
        request_type=swap.request_type,
        status=swap.status,
        message=swap.message,
        response_message=swap.response_message,
        created_at=swap.created_at,
        responded_at=swap.responded_at,
        expires_at=swap.expires_at,
    )


@router.post("/", response_model=SwapRequestResponse, status_code=201)
def create_swap_request(
    request: SwapRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new swap request."""
    # Get doctor profile for current user
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can create swap requests")

    # Verify requester owns the assignment
    assignment = db.query(Assignment).filter(
        Assignment.id == request.requester_assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="You can only swap your own assignments")

    # Check if assignment is in the future
    if assignment.date < datetime.utcnow().date():
        raise HTTPException(status_code=400, detail="Cannot swap past assignments")

    # For swap requests, verify target assignment
    if request.request_type == "swap" and request.target_assignment_id:
        target_assignment = db.query(Assignment).filter(
            Assignment.id == request.target_assignment_id
        ).first()
        if not target_assignment:
            raise HTTPException(status_code=404, detail="Target assignment not found")
        if request.target_id and target_assignment.doctor_id != request.target_id:
            raise HTTPException(
                status_code=400,
                detail="Target assignment doesn't belong to target doctor",
            )

    # Create swap request
    swap = SwapRequest(
        requester_id=doctor.id,
        target_id=request.target_id,
        requester_assignment_id=request.requester_assignment_id,
        target_assignment_id=request.target_assignment_id,
        request_type=request.request_type,
        message=request.message,
        expires_at=datetime.utcnow() + timedelta(days=7),  # 7 day expiry
    )
    db.add(swap)
    db.commit()
    db.refresh(swap)

    # Create notification for target (if specified)
    if request.target_id:
        target_doctor = db.query(Doctor).filter(Doctor.id == request.target_id).first()
        if target_doctor:
            notification = Notification(
                user_id=target_doctor.user_id,
                title="New Swap Request",
                message=f"{current_user.name} wants to swap shifts with you",
                type=NotificationType.SWAP_REQUEST_RECEIVED,
                priority=NotificationPriority.HIGH,
                action_url=f"/swaps/{swap.id}",
                action_label="View Request",
                related_type="swap_request",
                related_id=swap.id,
            )
            db.add(notification)
            db.commit()

    return get_swap_response(swap, db)


@router.get("/", response_model=SwapRequestListResponse)
def list_swap_requests(
    status: str | None = None,
    type: str | None = None,  # sent, received, all
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List swap requests for current user."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()

    query = db.query(SwapRequest)

    if doctor:
        if type == "sent":
            query = query.filter(SwapRequest.requester_id == doctor.id)
        elif type == "received":
            query = query.filter(SwapRequest.target_id == doctor.id)
        else:
            # Show all requests involving this doctor
            query = query.filter(
                (SwapRequest.requester_id == doctor.id)
                | (SwapRequest.target_id == doctor.id)
                | (SwapRequest.target_id.is_(None))  # Open requests
            )
    elif current_user.role != "admin":
        # Non-doctors can only see open requests
        query = query.filter(SwapRequest.target_id.is_(None))

    if status:
        query = query.filter(SwapRequest.status == status)

    # Get total and pending counts
    total = query.count()
    pending_count = query.filter(SwapRequest.status == SwapRequestStatus.PENDING).count()

    # Get paginated results
    swaps = query.order_by(SwapRequest.created_at.desc()).offset(skip).limit(limit).all()

    return SwapRequestListResponse(
        items=[get_swap_response(swap, db) for swap in swaps],
        total=total,
        pending_count=pending_count,
    )


@router.get("/{swap_id}", response_model=SwapRequestResponse)
def get_swap_request(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific swap request."""
    swap = db.query(SwapRequest).filter(SwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    return get_swap_response(swap, db)


@router.post("/{swap_id}/respond", response_model=SwapRequestResponse)
def respond_to_swap(
    swap_id: int,
    response: SwapRequestRespond,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept or decline a swap request."""
    swap = db.query(SwapRequest).filter(SwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap.status != SwapRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Swap request is no longer pending")

    # Verify current user is the target
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can respond to swaps")

    # For open requests, anyone can respond
    if swap.target_id and swap.target_id != doctor.id:
        raise HTTPException(status_code=403, detail="You cannot respond to this request")

    swap.responded_at = datetime.utcnow()
    swap.response_message = response.response_message

    if response.accept:
        swap.status = SwapRequestStatus.ACCEPTED

        # Perform the actual swap
        requester_assignment = db.query(Assignment).filter(
            Assignment.id == swap.requester_assignment_id
        ).first()

        if swap.request_type == "swap" and swap.target_assignment_id:
            target_assignment = db.query(Assignment).filter(
                Assignment.id == swap.target_assignment_id
            ).first()
            if requester_assignment and target_assignment:
                # Swap the doctors
                requester_assignment.doctor_id, target_assignment.doctor_id = (
                    target_assignment.doctor_id,
                    requester_assignment.doctor_id,
                )
        elif swap.request_type == "giveaway":
            if requester_assignment:
                requester_assignment.doctor_id = doctor.id
        elif swap.request_type == "pickup":
            if requester_assignment:
                requester_assignment.doctor_id = doctor.id

        # Notify requester
        requester_doctor = db.query(Doctor).filter(
            Doctor.id == swap.requester_id
        ).first()
        if requester_doctor:
            notification = Notification(
                user_id=requester_doctor.user_id,
                title="Swap Request Accepted",
                message=f"{current_user.name} accepted your swap request",
                type=NotificationType.SWAP_REQUEST_ACCEPTED,
                priority=NotificationPriority.HIGH,
                related_type="swap_request",
                related_id=swap.id,
            )
            db.add(notification)
    else:
        swap.status = SwapRequestStatus.DECLINED

        # Notify requester
        requester_doctor = db.query(Doctor).filter(
            Doctor.id == swap.requester_id
        ).first()
        if requester_doctor:
            notification = Notification(
                user_id=requester_doctor.user_id,
                title="Swap Request Declined",
                message=f"{current_user.name} declined your swap request",
                type=NotificationType.SWAP_REQUEST_DECLINED,
                priority=NotificationPriority.NORMAL,
                related_type="swap_request",
                related_id=swap.id,
            )
            db.add(notification)

    db.commit()
    db.refresh(swap)

    return get_swap_response(swap, db)


@router.post("/{swap_id}/cancel", response_model=SwapRequestResponse)
def cancel_swap_request(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a pending swap request."""
    swap = db.query(SwapRequest).filter(SwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap.status != SwapRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")

    # Verify current user is the requester
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor or swap.requester_id != doctor.id:
        raise HTTPException(status_code=403, detail="Only requester can cancel")

    swap.status = SwapRequestStatus.CANCELLED
    swap.responded_at = datetime.utcnow()

    # Notify target if there is one
    if swap.target_id:
        target_doctor = db.query(Doctor).filter(Doctor.id == swap.target_id).first()
        if target_doctor:
            notification = Notification(
                user_id=target_doctor.user_id,
                title="Swap Request Cancelled",
                message=f"{current_user.name} cancelled their swap request",
                type=NotificationType.SWAP_REQUEST_CANCELLED,
                priority=NotificationPriority.LOW,
                related_type="swap_request",
                related_id=swap.id,
            )
            db.add(notification)

    db.commit()
    db.refresh(swap)

    return get_swap_response(swap, db)


@router.get("/open/available", response_model=SwapRequestListResponse)
def list_open_swap_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all open swap requests (giveaways) that anyone can pick up."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()

    query = db.query(SwapRequest).filter(
        SwapRequest.target_id.is_(None),
        SwapRequest.status == SwapRequestStatus.PENDING,
        SwapRequest.request_type.in_(["giveaway", "pickup"]),
    )

    # Exclude own requests
    if doctor:
        query = query.filter(SwapRequest.requester_id != doctor.id)

    swaps = query.order_by(SwapRequest.created_at.desc()).all()

    return SwapRequestListResponse(
        items=[get_swap_response(swap, db) for swap in swaps],
        total=len(swaps),
        pending_count=len(swaps),
    )
