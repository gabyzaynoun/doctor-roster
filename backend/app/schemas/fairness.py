from pydantic import BaseModel
from typing import Optional


class DoctorFairnessStats(BaseModel):
    """Fairness stats for an individual doctor."""
    doctor_id: int
    doctor_name: str
    night_shifts: int
    weekend_shifts: int
    holiday_shifts: int
    total_hours: float
    fairness_score: float  # 0-100


class FairnessMetricsResponse(BaseModel):
    """Complete fairness metrics for a schedule."""
    schedule_id: int
    year: int
    month: int
    night_shift_balance: float  # 0-100
    weekend_balance: float  # 0-100
    holiday_balance: float  # 0-100
    hours_balance: float  # 0-100
    overall_fairness: float  # 0-100
    doctor_stats: list[DoctorFairnessStats]
    recommendations: list[str]
