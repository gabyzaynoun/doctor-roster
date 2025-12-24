from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.schedule import Schedule
from app.services.fairness import FairnessService
from app.schemas.fairness import FairnessMetricsResponse

router = APIRouter()


@router.get("/{schedule_id}", response_model=FairnessMetricsResponse)
def get_fairness_metrics(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get fairness metrics for a schedule."""
    # Verify schedule exists
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Calculate fairness metrics
    service = FairnessService(db)
    try:
        metrics = service.calculate_fairness(schedule_id)
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/by-month/{year}/{month}", response_model=FairnessMetricsResponse)
def get_fairness_by_month(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get fairness metrics for a specific month."""
    schedule = (
        db.query(Schedule)
        .filter(Schedule.year == year, Schedule.month == month)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule for {year}-{month:02d} not found")

    service = FairnessService(db)
    try:
        metrics = service.calculate_fairness(schedule.id)
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
