from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import io
from app.core.database import get_db
from app.core.deps import get_current_user, get_team_lead_or_admin, get_admin_user
from app.models.schedule import Schedule, ScheduleStatus
from app.models.user import User
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.schemas.validation import (
    ValidationResultResponse,
    AssignmentValidationRequest,
)
from app.services.constraints import ConstraintValidator
from app.services.auto_builder import AutoBuilder
from app.services.statistics import StatisticsService
from app.services.export import ExportService
from app.services.audit import AuditService, get_client_info


class AutoBuildRequest(BaseModel):
    """Request body for auto-build endpoint."""
    clear_existing: bool = False


class AutoBuildResponse(BaseModel):
    """Response from auto-build endpoint."""
    success: bool
    message: str
    assignments_created: int
    slots_unfilled: int
    warnings: list[str]

router = APIRouter()


@router.get("/", response_model=list[ScheduleResponse])
def list_schedules(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all schedules. Authenticated users only."""
    schedules = db.query(Schedule).order_by(Schedule.year.desc(), Schedule.month.desc()).offset(skip).limit(limit).all()
    return schedules


@router.post("/", response_model=ScheduleResponse, status_code=201)
def create_schedule(
    schedule: ScheduleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Create a new schedule. Admin only."""
    db_schedule = (
        db.query(Schedule)
        .filter(Schedule.year == schedule.year, Schedule.month == schedule.month)
        .first()
    )
    if db_schedule:
        raise HTTPException(
            status_code=400,
            detail=f"Schedule for {schedule.year}-{schedule.month:02d} already exists"
        )
    db_schedule = Schedule(**schedule.model_dump())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_CREATE,
        entity_type=AuditService.ENTITY_SCHEDULE,
        entity_id=db_schedule.id,
        user_id=current_user.id,
        new_values={"year": schedule.year, "month": schedule.month},
        ip_address=ip,
        user_agent=ua,
    )

    return db_schedule


@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get schedule by ID. Authenticated users only."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.get("/by-month/{year}/{month}", response_model=ScheduleResponse)
def get_schedule_by_month(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get schedule by month. Authenticated users only."""
    schedule = (
        db.query(Schedule)
        .filter(Schedule.year == year, Schedule.month == month)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Update schedule status. Admin only."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = schedule_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Delete schedule. Admin only."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    old_values = {"year": schedule.year, "month": schedule.month, "status": schedule.status.value}
    db.delete(schedule)
    db.commit()

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_DELETE,
        entity_type=AuditService.ENTITY_SCHEDULE,
        entity_id=schedule_id,
        user_id=current_user.id,
        old_values=old_values,
        ip_address=ip,
        user_agent=ua,
    )


@router.get("/{schedule_id}/validate", response_model=ValidationResultResponse)
def validate_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validate all constraints for a schedule.

    Returns a list of violations including:
    - Monthly hours exceeded
    - Consecutive night shifts
    - Insufficient coverage
    - Leave conflicts
    - Double bookings
    - Invalid shifts for centers
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    validator = ConstraintValidator(db)
    result = validator.validate_schedule(schedule_id)
    return result.to_dict()


@router.post("/{schedule_id}/validate-assignment", response_model=ValidationResultResponse)
def validate_assignment(
    schedule_id: int,
    request: AssignmentValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validate a potential assignment before adding it.

    Checks:
    - Shift is valid for center
    - No leave conflict
    - No double booking
    - Consecutive night shifts warning
    - Monthly hours warning
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    validator = ConstraintValidator(db)
    result = validator.validate_assignment(
        schedule_id=schedule_id,
        doctor_id=request.doctor_id,
        center_id=request.center_id,
        shift_id=request.shift_id,
        assignment_date=request.date,
    )
    return result.to_dict()


@router.post("/{schedule_id}/auto-build", response_model=AutoBuildResponse)
def auto_build_schedule(
    schedule_id: int,
    http_request: Request,
    request: AutoBuildRequest = AutoBuildRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Auto-generate assignments for a schedule using constraint satisfaction.

    The auto-builder will:
    - Fill all coverage requirements for each day
    - Respect monthly hours limits (160h Saudi, 192h non-Saudi)
    - Avoid assigning doctors on leave
    - Avoid double-booking (one shift per doctor per day)
    - Minimize consecutive night shifts
    - Balance workload across doctors

    Admin only.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    builder = AutoBuilder(db)
    result = builder.build_schedule(
        schedule_id=schedule_id,
        clear_existing=request.clear_existing,
    )

    # Audit log
    ip, ua = get_client_info(http_request)
    AuditService(db).log(
        action=AuditService.ACTION_AUTO_BUILD,
        entity_type=AuditService.ENTITY_SCHEDULE,
        entity_id=schedule_id,
        user_id=current_user.id,
        new_values={
            "clear_existing": request.clear_existing,
            "assignments_created": result.assignments_created,
            "slots_unfilled": result.slots_unfilled,
        },
        ip_address=ip,
        user_agent=ua,
    )

    return result.to_dict()


@router.get("/{schedule_id}/stats")
def get_schedule_stats(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive statistics for a schedule.

    Returns:
    - Summary: total assignments, hours, coverage percentage
    - Doctor stats: hours per doctor, assignment counts
    - Coverage stats: filled vs required slots, gaps
    - Center stats: assignments per center
    - Shift stats: assignments per shift type
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    stats_service = StatisticsService(db)
    return stats_service.get_schedule_stats(schedule_id)


@router.get("/{schedule_id}/export/assignments")
def export_assignments_csv(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export all assignments for a schedule as CSV.

    Returns a downloadable CSV file with columns:
    Date, Day, Center, Shift, Shift Hours, Doctor Name, Doctor ID, Nationality
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    export_service = ExportService(db)
    csv_content = export_service.export_schedule_csv(schedule_id)

    filename = f"schedule_{schedule.year}_{schedule.month:02d}_assignments.csv"
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{schedule_id}/export/doctor-hours")
def export_doctor_hours_csv(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export doctor hours summary for a schedule as CSV.

    Returns a downloadable CSV file with columns:
    Doctor Name, Employee ID, Nationality, Total Hours, Max Hours, Hours %, Assignments, Night Shifts, Over Limit
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    export_service = ExportService(db)
    csv_content = export_service.export_doctor_hours_csv(schedule_id)

    filename = f"schedule_{schedule.year}_{schedule.month:02d}_doctor_hours.csv"
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{schedule_id}/export/coverage-matrix")
def export_coverage_matrix_csv(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export coverage matrix (centers x days) for a schedule as CSV.

    Returns a downloadable CSV file showing which doctors are assigned
    to each center for each day of the month.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    export_service = ExportService(db)
    csv_content = export_service.export_coverage_matrix_csv(schedule_id)

    filename = f"schedule_{schedule.year}_{schedule.month:02d}_coverage_matrix.csv"
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/{schedule_id}/publish", response_model=ScheduleResponse)
def publish_schedule(
    schedule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Publish a schedule, making it official.

    - Changes status from 'draft' to 'published'
    - Records the publish timestamp and user
    - Only drafts can be published
    - Admin only.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if schedule.status != ScheduleStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot publish schedule with status '{schedule.status.value}'. Only draft schedules can be published."
        )

    old_status = schedule.status.value
    schedule.status = ScheduleStatus.PUBLISHED
    schedule.published_at = datetime.utcnow()
    schedule.published_by_id = current_user.id

    db.commit()
    db.refresh(schedule)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_PUBLISH,
        entity_type=AuditService.ENTITY_SCHEDULE,
        entity_id=schedule_id,
        user_id=current_user.id,
        old_values={"status": old_status},
        new_values={"status": "published"},
        ip_address=ip,
        user_agent=ua,
    )

    return schedule


@router.post("/{schedule_id}/unpublish", response_model=ScheduleResponse)
def unpublish_schedule(
    schedule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Unpublish a schedule, returning it to draft status.

    - Changes status from 'published' back to 'draft'
    - Clears the publish timestamp and user
    - Only published schedules can be unpublished
    - Admin only.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if schedule.status != ScheduleStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot unpublish schedule with status '{schedule.status.value}'. Only published schedules can be unpublished."
        )

    old_status = schedule.status.value
    schedule.status = ScheduleStatus.DRAFT
    schedule.published_at = None
    schedule.published_by_id = None

    db.commit()
    db.refresh(schedule)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_UNPUBLISH,
        entity_type=AuditService.ENTITY_SCHEDULE,
        entity_id=schedule_id,
        user_id=current_user.id,
        old_values={"status": old_status},
        new_values={"status": "draft"},
        ip_address=ip,
        user_agent=ua,
    )

    return schedule


@router.post("/{schedule_id}/archive", response_model=ScheduleResponse)
def archive_schedule(
    schedule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Archive a schedule.

    - Changes status to 'archived'
    - Archived schedules are read-only
    - Both draft and published schedules can be archived
    - Admin only.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if schedule.status == ScheduleStatus.ARCHIVED:
        raise HTTPException(
            status_code=400,
            detail="Schedule is already archived."
        )

    old_status = schedule.status.value
    schedule.status = ScheduleStatus.ARCHIVED

    db.commit()
    db.refresh(schedule)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_ARCHIVE,
        entity_type=AuditService.ENTITY_SCHEDULE,
        entity_id=schedule_id,
        user_id=current_user.id,
        old_values={"status": old_status},
        new_values={"status": "archived"},
        ip_address=ip,
        user_agent=ua,
    )

    return schedule


@router.post("/{schedule_id}/unarchive", response_model=ScheduleResponse)
def unarchive_schedule(
    schedule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Unarchive a schedule, returning it to draft status.

    - Changes status from 'archived' back to 'draft'
    - Only archived schedules can be unarchived
    - Admin only.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if schedule.status != ScheduleStatus.ARCHIVED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot unarchive schedule with status '{schedule.status.value}'. Only archived schedules can be unarchived."
        )

    old_status = schedule.status.value
    schedule.status = ScheduleStatus.DRAFT
    schedule.published_at = None
    schedule.published_by_id = None

    db.commit()
    db.refresh(schedule)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_UNARCHIVE,
        entity_type=AuditService.ENTITY_SCHEDULE,
        entity_id=schedule_id,
        user_id=current_user.id,
        old_values={"status": old_status},
        new_values={"status": "draft"},
        ip_address=ip,
        user_agent=ua,
    )

    return schedule
