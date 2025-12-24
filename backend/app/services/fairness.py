from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from collections import defaultdict
from typing import TypedDict

from app.models.assignment import Assignment
from app.models.doctor import Doctor
from app.models.shift import Shift
from app.models.schedule import Schedule


class DoctorFairnessStats(TypedDict):
    doctor_id: int
    doctor_name: str
    night_shifts: int
    weekend_shifts: int
    holiday_shifts: int
    total_hours: float
    fairness_score: float  # 0-100, higher is more fair/balanced


class FairnessMetrics(TypedDict):
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


class FairnessService:
    """
    Service for calculating fairness metrics in schedule distribution.
    Tracks night shifts, weekends, holidays, and overall workload balance.
    """

    # Saudi holidays (approximate dates, would need to be configurable)
    HOLIDAYS_2025 = [
        "2025-01-01",  # New Year
        "2025-02-22",  # Founding Day
        "2025-03-29", "2025-03-30", "2025-03-31",  # Eid al-Fitr (approximate)
        "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09",  # Eid al-Adha (approximate)
        "2025-09-23",  # National Day
    ]

    def __init__(self, db: Session):
        self.db = db

    def calculate_fairness(self, schedule_id: int) -> FairnessMetrics:
        """Calculate fairness metrics for a schedule."""
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            raise ValueError("Schedule not found")

        # Get all assignments for this schedule
        assignments = (
            self.db.query(Assignment)
            .filter(Assignment.schedule_id == schedule_id)
            .all()
        )

        # Get all doctors and shifts
        doctors = {d.id: d for d in self.db.query(Doctor).filter(Doctor.is_active == True).all()}
        shifts = {s.id: s for s in self.db.query(Shift).all()}

        # Calculate stats per doctor
        doctor_stats: dict[int, dict] = defaultdict(lambda: {
            "night_shifts": 0,
            "weekend_shifts": 0,
            "holiday_shifts": 0,
            "total_hours": 0.0,
        })

        for assignment in assignments:
            doctor_id = assignment.doctor_id
            shift = shifts.get(assignment.shift_id)
            if not shift:
                continue

            # Count night shifts
            if shift.is_overnight:
                doctor_stats[doctor_id]["night_shifts"] += 1

            # Count weekend shifts (Friday/Saturday in Saudi)
            assignment_date = datetime.strptime(assignment.date, "%Y-%m-%d") if isinstance(assignment.date, str) else assignment.date
            day_of_week = assignment_date.weekday()
            if day_of_week in [4, 5]:  # Friday, Saturday
                doctor_stats[doctor_id]["weekend_shifts"] += 1

            # Count holiday shifts
            date_str = assignment.date if isinstance(assignment.date, str) else assignment.date.strftime("%Y-%m-%d")
            if date_str in self.HOLIDAYS_2025:
                doctor_stats[doctor_id]["holiday_shifts"] += 1

            # Count hours
            doctor_stats[doctor_id]["total_hours"] += shift.hours or 8

        # Calculate balance scores
        active_doctors = [d_id for d_id in doctor_stats.keys() if d_id in doctors]
        if not active_doctors:
            return self._empty_metrics(schedule_id, schedule.year, schedule.month)

        night_balance = self._calculate_balance([doctor_stats[d]["night_shifts"] for d in active_doctors])
        weekend_balance = self._calculate_balance([doctor_stats[d]["weekend_shifts"] for d in active_doctors])
        holiday_balance = self._calculate_balance([doctor_stats[d]["holiday_shifts"] for d in active_doctors])
        hours_balance = self._calculate_balance([doctor_stats[d]["total_hours"] for d in active_doctors])

        overall_fairness = (night_balance + weekend_balance + holiday_balance + hours_balance) / 4

        # Generate recommendations
        recommendations = self._generate_recommendations(
            doctor_stats, doctors, night_balance, weekend_balance, holiday_balance, hours_balance
        )

        # Build doctor stats list
        doctor_stats_list: list[DoctorFairnessStats] = []
        for doctor_id in active_doctors:
            doctor = doctors.get(doctor_id)
            if not doctor:
                continue

            stats = doctor_stats[doctor_id]
            # Individual fairness score based on deviation from average
            individual_score = self._calculate_individual_fairness(
                stats, doctor_stats, active_doctors
            )

            doctor_stats_list.append({
                "doctor_id": doctor_id,
                "doctor_name": doctor.user.name if doctor.user else f"Doctor {doctor_id}",
                "night_shifts": stats["night_shifts"],
                "weekend_shifts": stats["weekend_shifts"],
                "holiday_shifts": stats["holiday_shifts"],
                "total_hours": stats["total_hours"],
                "fairness_score": individual_score,
            })

        # Sort by fairness score (lowest first = most overworked)
        doctor_stats_list.sort(key=lambda x: x["fairness_score"])

        return {
            "schedule_id": schedule_id,
            "year": schedule.year,
            "month": schedule.month,
            "night_shift_balance": round(night_balance, 1),
            "weekend_balance": round(weekend_balance, 1),
            "holiday_balance": round(holiday_balance, 1),
            "hours_balance": round(hours_balance, 1),
            "overall_fairness": round(overall_fairness, 1),
            "doctor_stats": doctor_stats_list,
            "recommendations": recommendations,
        }

    def _calculate_balance(self, values: list) -> float:
        """
        Calculate balance score (0-100) based on coefficient of variation.
        Lower CV = higher balance score.
        """
        if not values or all(v == 0 for v in values):
            return 100.0  # Perfect balance if no assignments

        import statistics
        mean = statistics.mean(values)
        if mean == 0:
            return 100.0

        stdev = statistics.stdev(values) if len(values) > 1 else 0
        cv = (stdev / mean) * 100  # Coefficient of variation as percentage

        # Convert CV to balance score (lower CV = higher score)
        # CV of 0 = 100 score, CV of 50+ = 0 score
        balance = max(0, 100 - (cv * 2))
        return balance

    def _calculate_individual_fairness(
        self, stats: dict, all_stats: dict, doctor_ids: list
    ) -> float:
        """Calculate individual fairness score for a doctor."""
        if not doctor_ids:
            return 100.0

        import statistics

        # Calculate averages
        avg_nights = statistics.mean([all_stats[d]["night_shifts"] for d in doctor_ids])
        avg_weekends = statistics.mean([all_stats[d]["weekend_shifts"] for d in doctor_ids])
        avg_holidays = statistics.mean([all_stats[d]["holiday_shifts"] for d in doctor_ids])
        avg_hours = statistics.mean([all_stats[d]["total_hours"] for d in doctor_ids])

        # Calculate deviations (higher than average = lower score)
        deviations = []
        if avg_nights > 0:
            deviations.append((stats["night_shifts"] - avg_nights) / avg_nights)
        if avg_weekends > 0:
            deviations.append((stats["weekend_shifts"] - avg_weekends) / avg_weekends)
        if avg_holidays > 0:
            deviations.append((stats["holiday_shifts"] - avg_holidays) / avg_holidays)
        if avg_hours > 0:
            deviations.append((stats["total_hours"] - avg_hours) / avg_hours)

        if not deviations:
            return 100.0

        # Average deviation (positive = above average = less fair for this doctor)
        avg_deviation = statistics.mean(deviations)

        # Convert to score (0 deviation = 100, +50% deviation = 50, etc.)
        score = max(0, min(100, 100 - (avg_deviation * 100)))
        return round(score, 1)

    def _generate_recommendations(
        self,
        doctor_stats: dict,
        doctors: dict,
        night_balance: float,
        weekend_balance: float,
        holiday_balance: float,
        hours_balance: float,
    ) -> list[str]:
        """Generate actionable recommendations to improve fairness."""
        recommendations = []

        if night_balance < 70:
            # Find who has too many/few night shifts
            night_counts = [(d_id, stats["night_shifts"]) for d_id, stats in doctor_stats.items()]
            night_counts.sort(key=lambda x: x[1], reverse=True)
            if len(night_counts) >= 2:
                top = doctors.get(night_counts[0][0])
                bottom = doctors.get(night_counts[-1][0])
                if top and bottom and night_counts[0][1] > night_counts[-1][1] + 2:
                    top_name = top.user.name if top.user else f"Doctor {night_counts[0][0]}"
                    bottom_name = bottom.user.name if bottom.user else f"Doctor {night_counts[-1][0]}"
                    recommendations.append(
                        f"Consider reassigning night shifts from {top_name} ({night_counts[0][1]}) "
                        f"to {bottom_name} ({night_counts[-1][1]})"
                    )

        if weekend_balance < 70:
            recommendations.append(
                "Weekend shift distribution is uneven. Review weekend assignments to balance workload."
            )

        if holiday_balance < 70:
            recommendations.append(
                "Holiday shift distribution needs attention. Consider rotating holiday assignments more evenly."
            )

        if hours_balance < 70:
            recommendations.append(
                "Total hours vary significantly between doctors. Review assignment distribution."
            )

        if not recommendations:
            recommendations.append("Schedule fairness is good! No immediate action needed.")

        return recommendations

    def _empty_metrics(self, schedule_id: int, year: int, month: int) -> FairnessMetrics:
        """Return empty metrics when no data available."""
        return {
            "schedule_id": schedule_id,
            "year": year,
            "month": month,
            "night_shift_balance": 100.0,
            "weekend_balance": 100.0,
            "holiday_balance": 100.0,
            "hours_balance": 100.0,
            "overall_fairness": 100.0,
            "doctor_stats": [],
            "recommendations": ["No assignments found for this schedule."],
        }
