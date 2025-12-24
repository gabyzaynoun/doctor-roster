from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, get_team_lead_or_admin
from app.models.schedule import Schedule
from app.models.schedule_template import ScheduleTemplate
from app.models.assignment import Assignment
from app.models.center import Center
from app.models.shift import Shift
from app.models.user import User
from app.schemas.schedule_template import (
    ScheduleTemplateCreate,
    ScheduleTemplateFromSchedule,
    ScheduleTemplateUpdate,
    ScheduleTemplateResponse,
    ApplyTemplateRequest,
)
from app.services.audit import AuditService, get_client_info

router = APIRouter()


@router.get("/", response_model=list[ScheduleTemplateResponse])
def list_templates(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all schedule templates."""
    templates = (
        db.query(ScheduleTemplate)
        .order_by(ScheduleTemplate.times_used.desc(), ScheduleTemplate.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return templates


@router.post("/", response_model=ScheduleTemplateResponse, status_code=201)
def create_template(
    template: ScheduleTemplateCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_admin),
):
    """Create a new template with custom pattern data."""
    db_template = ScheduleTemplate(
        name=template.name,
        description=template.description,
        pattern_data=template.pattern_data.model_dump(),
        created_by_id=current_user.id,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_CREATE,
        entity_type="schedule_template",
        entity_id=db_template.id,
        user_id=current_user.id,
        new_values={"name": template.name},
        ip_address=ip,
        user_agent=ua,
    )

    return db_template


@router.post("/from-schedule", response_model=ScheduleTemplateResponse, status_code=201)
def create_template_from_schedule(
    template: ScheduleTemplateFromSchedule,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_admin),
):
    """Create a template from an existing schedule's assignments."""
    # Get the source schedule
    schedule = db.query(Schedule).filter(Schedule.id == template.source_schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Source schedule not found")

    # Get all assignments for this schedule
    assignments = (
        db.query(Assignment)
        .filter(Assignment.schedule_id == template.source_schedule_id)
        .all()
    )

    if not assignments:
        raise HTTPException(status_code=400, detail="Source schedule has no assignments")

    # Get centers and shifts for code lookup
    centers = {c.id: c.code for c in db.query(Center).all()}
    shifts = {s.id: s.code for s in db.query(Shift).all()}

    # Convert assignments to patterns (group by day of week, center, shift)
    from datetime import datetime as dt
    from collections import defaultdict

    pattern_counts = defaultdict(int)
    for assignment in assignments:
        assignment_date = dt.strptime(assignment.date, "%Y-%m-%d") if isinstance(assignment.date, str) else assignment.date
        day_of_week = assignment_date.weekday()
        center_code = centers.get(assignment.center_id, "")
        shift_code = shifts.get(assignment.shift_id, "")

        if center_code and shift_code:
            key = (day_of_week, center_code, shift_code)
            pattern_counts[key] += 1

    # Average the counts across weeks in the month
    import calendar
    num_weeks = len(calendar.monthcalendar(schedule.year, schedule.month))

    patterns = []
    for (day_of_week, center_code, shift_code), count in pattern_counts.items():
        avg_count = max(1, round(count / num_weeks))
        patterns.append({
            "day_of_week": day_of_week,
            "center_code": center_code,
            "shift_code": shift_code,
            "doctor_count": avg_count,
        })

    # Create the template
    db_template = ScheduleTemplate(
        name=template.name,
        description=template.description,
        pattern_data={"patterns": patterns},
        created_by_id=current_user.id,
        source_schedule_id=template.source_schedule_id,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_CREATE,
        entity_type="schedule_template",
        entity_id=db_template.id,
        user_id=current_user.id,
        new_values={"name": template.name, "source_schedule_id": template.source_schedule_id},
        ip_address=ip,
        user_agent=ua,
    )

    return db_template


@router.get("/{template_id}", response_model=ScheduleTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a template by ID."""
    template = db.query(ScheduleTemplate).filter(ScheduleTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=ScheduleTemplateResponse)
def update_template(
    template_id: int,
    template_update: ScheduleTemplateUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_admin),
):
    """Update a template's name or description."""
    db_template = db.query(ScheduleTemplate).filter(ScheduleTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    old_values = {"name": db_template.name, "description": db_template.description}

    if template_update.name is not None:
        db_template.name = template_update.name
    if template_update.description is not None:
        db_template.description = template_update.description

    db.commit()
    db.refresh(db_template)

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_UPDATE,
        entity_type="schedule_template",
        entity_id=db_template.id,
        user_id=current_user.id,
        old_values=old_values,
        new_values={"name": db_template.name, "description": db_template.description},
        ip_address=ip,
        user_agent=ua,
    )

    return db_template


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_admin),
):
    """Delete a template."""
    db_template = db.query(ScheduleTemplate).filter(ScheduleTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Audit log
    ip, ua = get_client_info(request)
    AuditService(db).log(
        action=AuditService.ACTION_DELETE,
        entity_type="schedule_template",
        entity_id=template_id,
        user_id=current_user.id,
        old_values={"name": db_template.name},
        ip_address=ip,
        user_agent=ua,
    )

    db.delete(db_template)
    db.commit()
