"""API routes for doctor availability preferences."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.doctor import Doctor
from app.models.availability import (
    AvailabilityPreference,
    SpecificDatePreference,
    PreferenceLevel,
)

router = APIRouter()


class WeeklyPreferenceCreate(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    preference: str  # preferred, neutral, avoid, unavailable
    shift_id: int | None = None


class WeeklyPreferenceResponse(BaseModel):
    id: int
    day_of_week: int
    day_name: str
    preference: str
    shift_id: int | None
    shift_code: str | None

    class Config:
        from_attributes = True


class DatePreferenceCreate(BaseModel):
    date: date
    preference: str
    shift_id: int | None = None
    reason: str | None = None


class DatePreferenceResponse(BaseModel):
    id: int
    date: date
    preference: str
    shift_id: int | None
    shift_code: str | None
    reason: str | None

    class Config:
        from_attributes = True


class AvailabilityOverview(BaseModel):
    weekly: list[WeeklyPreferenceResponse]
    specific_dates: list[DatePreferenceResponse]


DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@router.get("/", response_model=AvailabilityOverview)
def get_my_availability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's availability preferences."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")

    # Get weekly preferences
    weekly = (
        db.query(AvailabilityPreference)
        .filter(
            AvailabilityPreference.doctor_id == doctor.id,
            (AvailabilityPreference.effective_until.is_(None))
            | (AvailabilityPreference.effective_until >= date.today()),
        )
        .order_by(AvailabilityPreference.day_of_week)
        .all()
    )

    # Get specific date preferences (future only)
    specific = (
        db.query(SpecificDatePreference)
        .filter(
            SpecificDatePreference.doctor_id == doctor.id,
            SpecificDatePreference.date >= date.today(),
        )
        .order_by(SpecificDatePreference.date)
        .all()
    )

    return AvailabilityOverview(
        weekly=[
            WeeklyPreferenceResponse(
                id=w.id,
                day_of_week=w.day_of_week,
                day_name=DAY_NAMES[w.day_of_week],
                preference=w.preference.value,
                shift_id=w.shift_id,
                shift_code=w.shift.code if w.shift else None,
            )
            for w in weekly
        ],
        specific_dates=[
            DatePreferenceResponse(
                id=s.id,
                date=s.date,
                preference=s.preference.value,
                shift_id=s.shift_id,
                shift_code=s.shift.code if s.shift else None,
                reason=s.reason,
            )
            for s in specific
        ],
    )


@router.post("/weekly", response_model=WeeklyPreferenceResponse, status_code=201)
def set_weekly_preference(
    data: WeeklyPreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a weekly recurring preference."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")

    if data.day_of_week < 0 or data.day_of_week > 6:
        raise HTTPException(status_code=400, detail="Invalid day of week")

    # Check for existing preference for this day/shift combo
    existing = (
        db.query(AvailabilityPreference)
        .filter(
            AvailabilityPreference.doctor_id == doctor.id,
            AvailabilityPreference.day_of_week == data.day_of_week,
            AvailabilityPreference.shift_id == data.shift_id,
            (AvailabilityPreference.effective_until.is_(None))
            | (AvailabilityPreference.effective_until >= date.today()),
        )
        .first()
    )

    if existing:
        # Update existing
        existing.preference = PreferenceLevel(data.preference)
        db.commit()
        db.refresh(existing)
        pref = existing
    else:
        # Create new
        pref = AvailabilityPreference(
            doctor_id=doctor.id,
            day_of_week=data.day_of_week,
            preference=PreferenceLevel(data.preference),
            shift_id=data.shift_id,
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return WeeklyPreferenceResponse(
        id=pref.id,
        day_of_week=pref.day_of_week,
        day_name=DAY_NAMES[pref.day_of_week],
        preference=pref.preference.value,
        shift_id=pref.shift_id,
        shift_code=pref.shift.code if pref.shift else None,
    )


@router.put("/weekly/bulk")
def set_weekly_preferences_bulk(
    preferences: list[WeeklyPreferenceCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set all weekly preferences at once."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")

    # Clear existing weekly preferences
    db.query(AvailabilityPreference).filter(
        AvailabilityPreference.doctor_id == doctor.id
    ).delete()

    # Create new preferences
    for data in preferences:
        if data.day_of_week < 0 or data.day_of_week > 6:
            continue
        pref = AvailabilityPreference(
            doctor_id=doctor.id,
            day_of_week=data.day_of_week,
            preference=PreferenceLevel(data.preference),
            shift_id=data.shift_id,
        )
        db.add(pref)

    db.commit()

    return {"status": "ok", "count": len(preferences)}


@router.delete("/weekly/{preference_id}")
def delete_weekly_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a weekly preference."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")

    pref = (
        db.query(AvailabilityPreference)
        .filter(
            AvailabilityPreference.id == preference_id,
            AvailabilityPreference.doctor_id == doctor.id,
        )
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")

    db.delete(pref)
    db.commit()

    return {"status": "ok"}


@router.post("/dates", response_model=DatePreferenceResponse, status_code=201)
def set_date_preference(
    data: DatePreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set preference for a specific date."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")

    if data.date < date.today():
        raise HTTPException(status_code=400, detail="Cannot set preferences for past dates")

    # Check for existing preference for this date/shift
    existing = (
        db.query(SpecificDatePreference)
        .filter(
            SpecificDatePreference.doctor_id == doctor.id,
            SpecificDatePreference.date == data.date,
            SpecificDatePreference.shift_id == data.shift_id,
        )
        .first()
    )

    if existing:
        existing.preference = PreferenceLevel(data.preference)
        existing.reason = data.reason
        db.commit()
        db.refresh(existing)
        pref = existing
    else:
        pref = SpecificDatePreference(
            doctor_id=doctor.id,
            date=data.date,
            preference=PreferenceLevel(data.preference),
            shift_id=data.shift_id,
            reason=data.reason,
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return DatePreferenceResponse(
        id=pref.id,
        date=pref.date,
        preference=pref.preference.value,
        shift_id=pref.shift_id,
        shift_code=pref.shift.code if pref.shift else None,
        reason=pref.reason,
    )


@router.delete("/dates/{preference_id}")
def delete_date_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a specific date preference."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")

    pref = (
        db.query(SpecificDatePreference)
        .filter(
            SpecificDatePreference.id == preference_id,
            SpecificDatePreference.doctor_id == doctor.id,
        )
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")

    db.delete(pref)
    db.commit()

    return {"status": "ok"}


@router.get("/doctor/{doctor_id}", response_model=AvailabilityOverview)
def get_doctor_availability(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific doctor's availability (for admins/team leads)."""
    if current_user.role.value not in ["admin", "team_lead"]:
        raise HTTPException(status_code=403, detail="Admin or team lead required")

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    weekly = (
        db.query(AvailabilityPreference)
        .filter(
            AvailabilityPreference.doctor_id == doctor.id,
            (AvailabilityPreference.effective_until.is_(None))
            | (AvailabilityPreference.effective_until >= date.today()),
        )
        .order_by(AvailabilityPreference.day_of_week)
        .all()
    )

    specific = (
        db.query(SpecificDatePreference)
        .filter(
            SpecificDatePreference.doctor_id == doctor.id,
            SpecificDatePreference.date >= date.today(),
        )
        .order_by(SpecificDatePreference.date)
        .all()
    )

    return AvailabilityOverview(
        weekly=[
            WeeklyPreferenceResponse(
                id=w.id,
                day_of_week=w.day_of_week,
                day_name=DAY_NAMES[w.day_of_week],
                preference=w.preference.value,
                shift_id=w.shift_id,
                shift_code=w.shift.code if w.shift else None,
            )
            for w in weekly
        ],
        specific_dates=[
            DatePreferenceResponse(
                id=s.id,
                date=s.date,
                preference=s.preference.value,
                shift_id=s.shift_id,
                shift_code=s.shift.code if s.shift else None,
                reason=s.reason,
            )
            for s in specific
        ],
    )
