from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.shift_posting import ShiftPosting, PostingType, PostingStatus
from app.models.assignment import Assignment
from app.models.doctor import Doctor
from app.models.center import Center
from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift_posting import (
    ShiftPostingCreate,
    ShiftPostingUpdate,
    ShiftPostingClaim,
    ShiftPostingResponse,
    AssignmentInfo,
    DoctorInfo,
)
from app.services.audit import AuditService, get_client_info

router = APIRouter()


def build_posting_response(posting: ShiftPosting, db: Session) -> dict:
    """Build a complete posting response with related data."""
    response = {
        "id": posting.id,
        "poster_id": posting.poster_id,
        "assignment_id": posting.assignment_id,
        "posting_type": posting.posting_type.value,
        "status": posting.status.value,
        "preferred_date": posting.preferred_date,
        "preferred_center_id": posting.preferred_center_id,
        "preferred_shift_id": posting.preferred_shift_id,
        "message": posting.message,
        "bonus_points": posting.bonus_points,
        "is_urgent": posting.is_urgent,
        "claimed_by_id": posting.claimed_by_id,
        "claimed_at": posting.claimed_at,
        "created_at": posting.created_at,
        "expires_at": posting.expires_at,
    }

    # Add poster info
    if posting.poster and posting.poster.user:
        response["poster"] = {
            "id": posting.poster_id,
            "name": posting.poster.user.name,
            "specialty": posting.poster.specialty,
        }

    # Add assignment info if available
    if posting.assignment:
        center = db.query(Center).filter(Center.id == posting.assignment.center_id).first()
        shift = db.query(Shift).filter(Shift.id == posting.assignment.shift_id).first()
        if center and shift:
            response["assignment"] = {
                "id": posting.assignment.id,
                "date": posting.assignment.date,
                "center_name": center.name,
                "center_code": center.code,
                "shift_code": shift.code,
                "shift_name": shift.name,
                "hours": shift.hours or 8,
            }

    # Add claimed_by info
    if posting.claimed_by and posting.claimed_by.user:
        response["claimed_by"] = {
            "id": posting.claimed_by_id,
            "name": posting.claimed_by.user.name,
            "specialty": posting.claimed_by.specialty,
        }

    return response


@router.get("/")
def list_postings(
    status: str = None,
    posting_type: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all open shift postings (marketplace view)."""
    query = (
        db.query(ShiftPosting)
        .options(
            joinedload(ShiftPosting.poster).joinedload(Doctor.user),
            joinedload(ShiftPosting.assignment),
            joinedload(ShiftPosting.claimed_by).joinedload(Doctor.user),
        )
    )

    # Filter by status (default to open)
    if status:
        query = query.filter(ShiftPosting.status == status)
    else:
        query = query.filter(ShiftPosting.status == PostingStatus.OPEN)

    # Filter by type
    if posting_type:
        query = query.filter(ShiftPosting.posting_type == posting_type)

    # Order by urgency first, then recency
    query = query.order_by(
        ShiftPosting.is_urgent.desc(),
        ShiftPosting.created_at.desc()
    )

    postings = query.offset(skip).limit(limit).all()
    return [build_posting_response(p, db) for p in postings]


@router.get("/my-postings")
def list_my_postings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List current user's postings."""
    # Get doctor for current user
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        return []

    postings = (
        db.query(ShiftPosting)
        .options(
            joinedload(ShiftPosting.poster).joinedload(Doctor.user),
            joinedload(ShiftPosting.assignment),
            joinedload(ShiftPosting.claimed_by).joinedload(Doctor.user),
        )
        .filter(ShiftPosting.poster_id == doctor.id)
        .order_by(ShiftPosting.created_at.desc())
        .all()
    )
    return [build_posting_response(p, db) for p in postings]


@router.post("/", status_code=201)
def create_posting(
    posting: ShiftPostingCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new shift posting."""
    # Get doctor for current user
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=400, detail="User is not registered as a doctor")

    # Validate assignment if provided
    if posting.assignment_id:
        assignment = db.query(Assignment).filter(Assignment.id == posting.assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        if assignment.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="You can only post your own assignments")

    # Create posting
    db_posting = ShiftPosting(
        poster_id=doctor.id,
        assignment_id=posting.assignment_id,
        posting_type=PostingType(posting.posting_type.value),
        status=PostingStatus.OPEN,
        preferred_date=posting.preferred_date,
        preferred_center_id=posting.preferred_center_id,
        preferred_shift_id=posting.preferred_shift_id,
        message=posting.message,
        is_urgent=posting.is_urgent,
        expires_at=datetime.utcnow() + timedelta(days=7),  # Expires in 7 days
    )
    db.add(db_posting)
    db.commit()
    db.refresh(db_posting)

    # Reload with relationships
    db_posting = (
        db.query(ShiftPosting)
        .options(
            joinedload(ShiftPosting.poster).joinedload(Doctor.user),
            joinedload(ShiftPosting.assignment),
        )
        .filter(ShiftPosting.id == db_posting.id)
        .first()
    )

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_CREATE,
        entity_type="shift_posting",
        entity_id=db_posting.id,
        user_id=current_user.id,
        new_values={"posting_type": posting.posting_type.value},
        ip_address=ip,
        user_agent=ua,
    )

    return build_posting_response(db_posting, db)


@router.post("/{posting_id}/claim")
def claim_posting(
    posting_id: int,
    claim: ShiftPostingClaim,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Claim an open shift posting."""
    # Get doctor for current user
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=400, detail="User is not registered as a doctor")

    # Get posting
    db_posting = (
        db.query(ShiftPosting)
        .options(
            joinedload(ShiftPosting.poster).joinedload(Doctor.user),
            joinedload(ShiftPosting.assignment),
        )
        .filter(ShiftPosting.id == posting_id)
        .first()
    )
    if not db_posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    # Validate
    if db_posting.status != PostingStatus.OPEN:
        raise HTTPException(status_code=400, detail="Posting is not open for claiming")
    if db_posting.poster_id == doctor.id:
        raise HTTPException(status_code=400, detail="You cannot claim your own posting")

    # Claim the posting
    db_posting.status = PostingStatus.CLAIMED
    db_posting.claimed_by_id = doctor.id
    db_posting.claimed_at = datetime.utcnow()

    # If it's a giveaway and has an assignment, transfer the assignment
    if db_posting.posting_type == PostingType.GIVEAWAY and db_posting.assignment_id:
        assignment = db.query(Assignment).filter(Assignment.id == db_posting.assignment_id).first()
        if assignment:
            assignment.doctor_id = doctor.id

    db.commit()
    db.refresh(db_posting)

    # Reload with relationships
    db_posting = (
        db.query(ShiftPosting)
        .options(
            joinedload(ShiftPosting.poster).joinedload(Doctor.user),
            joinedload(ShiftPosting.assignment),
            joinedload(ShiftPosting.claimed_by).joinedload(Doctor.user),
        )
        .filter(ShiftPosting.id == posting_id)
        .first()
    )

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action="claim",
        entity_type="shift_posting",
        entity_id=posting_id,
        user_id=current_user.id,
        new_values={"claimed_by_id": doctor.id},
        ip_address=ip,
        user_agent=ua,
    )

    return build_posting_response(db_posting, db)


@router.post("/{posting_id}/cancel")
def cancel_posting(
    posting_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a posting (only by poster)."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=400, detail="User is not registered as a doctor")

    db_posting = db.query(ShiftPosting).filter(ShiftPosting.id == posting_id).first()
    if not db_posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    if db_posting.poster_id != doctor.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only cancel your own postings")

    if db_posting.status not in [PostingStatus.OPEN, PostingStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Cannot cancel this posting")

    db_posting.status = PostingStatus.CANCELLED
    db.commit()

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action="cancel",
        entity_type="shift_posting",
        entity_id=posting_id,
        user_id=current_user.id,
        ip_address=ip,
        user_agent=ua,
    )

    return {"message": "Posting cancelled"}


@router.get("/{posting_id}")
def get_posting(
    posting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific posting."""
    db_posting = (
        db.query(ShiftPosting)
        .options(
            joinedload(ShiftPosting.poster).joinedload(Doctor.user),
            joinedload(ShiftPosting.assignment),
            joinedload(ShiftPosting.claimed_by).joinedload(Doctor.user),
        )
        .filter(ShiftPosting.id == posting_id)
        .first()
    )
    if not db_posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    return build_posting_response(db_posting, db)
