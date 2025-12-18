"""Statistics service for schedule analytics."""
from datetime import date
from calendar import monthrange
from collections import defaultdict
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models.assignment import Assignment
from app.models.doctor import Doctor
from app.models.user import User
from app.models.shift import Shift
from app.models.center import Center
from app.models.coverage_template import CoverageTemplate
from app.models.schedule import Schedule


class StatisticsService:
    """Service for computing schedule statistics."""

    def __init__(self, db: Session):
        self.db = db

    def get_schedule_stats(self, schedule_id: int) -> dict:
        """Get comprehensive statistics for a schedule."""
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            return {"error": "Schedule not found"}

        # Get all assignments for this schedule
        assignments = (
            self.db.query(Assignment)
            .options(
                joinedload(Assignment.doctor).joinedload(Doctor.user),
                joinedload(Assignment.shift),
                joinedload(Assignment.center),
            )
            .filter(Assignment.schedule_id == schedule_id)
            .all()
        )

        # Calculate statistics
        doctor_stats = self._calculate_doctor_stats(assignments, schedule)
        coverage_stats = self._calculate_coverage_stats(schedule, assignments)
        center_stats = self._calculate_center_stats(assignments)
        shift_stats = self._calculate_shift_stats(assignments)
        summary = self._calculate_summary(schedule, assignments, doctor_stats, coverage_stats)

        return {
            "schedule_id": schedule_id,
            "year": schedule.year,
            "month": schedule.month,
            "status": schedule.status,
            "summary": summary,
            "doctor_stats": doctor_stats,
            "coverage_stats": coverage_stats,
            "center_stats": center_stats,
            "shift_stats": shift_stats,
        }

    def _calculate_doctor_stats(self, assignments: list, schedule: Schedule) -> list:
        """Calculate hours and assignment counts per doctor."""
        # Get all active doctors
        doctors = (
            self.db.query(Doctor)
            .options(joinedload(Doctor.user))
            .filter(Doctor.is_active == True)
            .all()
        )

        # Create a mapping of doctor_id -> assignments
        doctor_assignments = defaultdict(list)
        for a in assignments:
            doctor_assignments[a.doctor_id].append(a)

        doctor_stats = []
        for doctor in doctors:
            doc_assignments = doctor_assignments.get(doctor.id, [])

            # Calculate total hours
            total_hours = sum(a.shift.hours for a in doc_assignments)

            # Calculate hours limit based on nationality
            nationality = doctor.user.nationality if doctor.user else "non_saudi"
            max_hours = 160 if nationality == "saudi" else 192
            hours_percentage = (total_hours / max_hours * 100) if max_hours > 0 else 0

            # Count assignments by shift type
            shift_counts = defaultdict(int)
            for a in doc_assignments:
                shift_counts[a.shift.code] += 1

            # Count overnight shifts
            overnight_count = sum(1 for a in doc_assignments if a.shift.is_overnight)

            doctor_stats.append({
                "doctor_id": doctor.id,
                "doctor_name": doctor.user.name if doctor.user else f"Doctor {doctor.id}",
                "nationality": nationality,
                "total_hours": total_hours,
                "max_hours": max_hours,
                "hours_percentage": round(hours_percentage, 1),
                "assignment_count": len(doc_assignments),
                "overnight_count": overnight_count,
                "shift_breakdown": dict(shift_counts),
                "is_over_limit": total_hours > max_hours,
            })

        # Sort by hours (descending)
        doctor_stats.sort(key=lambda x: x["total_hours"], reverse=True)
        return doctor_stats

    def _calculate_coverage_stats(self, schedule: Schedule, assignments: list) -> dict:
        """Calculate coverage completion statistics."""
        # Get coverage requirements
        templates = (
            self.db.query(CoverageTemplate)
            .options(
                joinedload(CoverageTemplate.center),
                joinedload(CoverageTemplate.shift),
            )
            .filter(CoverageTemplate.is_mandatory == True)
            .all()
        )

        # Calculate days in month
        _, days_in_month = monthrange(schedule.year, schedule.month)

        # Build assignment lookup: (date, center_id, shift_id) -> count
        assignment_counts = defaultdict(int)
        for a in assignments:
            key = (a.date, a.center_id, a.shift_id)
            assignment_counts[key] += 1

        # Calculate coverage for each day
        total_slots = 0
        filled_slots = 0
        gaps = []

        for day in range(1, days_in_month + 1):
            current_date = date(schedule.year, schedule.month, day)

            for template in templates:
                required = template.min_doctors
                key = (current_date, template.center_id, template.shift_id)
                actual = assignment_counts.get(key, 0)

                total_slots += required
                filled_slots += min(actual, required)

                if actual < required:
                    gaps.append({
                        "date": current_date.isoformat(),
                        "center": template.center.name if template.center else "Unknown",
                        "shift": template.shift.code if template.shift else "Unknown",
                        "required": required,
                        "actual": actual,
                        "gap": required - actual,
                    })

        coverage_percentage = (filled_slots / total_slots * 100) if total_slots > 0 else 0

        return {
            "total_slots": total_slots,
            "filled_slots": filled_slots,
            "coverage_percentage": round(coverage_percentage, 1),
            "gaps_count": len(gaps),
            "gaps": gaps[:20],  # Limit to first 20 gaps for performance
        }

    def _calculate_center_stats(self, assignments: list) -> list:
        """Calculate assignment counts per center."""
        center_counts = defaultdict(lambda: {"count": 0, "hours": 0})
        center_names = {}

        for a in assignments:
            center_counts[a.center_id]["count"] += 1
            center_counts[a.center_id]["hours"] += a.shift.hours
            if a.center:
                center_names[a.center_id] = a.center.name

        return [
            {
                "center_id": cid,
                "center_name": center_names.get(cid, f"Center {cid}"),
                "assignment_count": stats["count"],
                "total_hours": stats["hours"],
            }
            for cid, stats in sorted(center_counts.items(), key=lambda x: x[1]["count"], reverse=True)
        ]

    def _calculate_shift_stats(self, assignments: list) -> list:
        """Calculate assignment counts per shift."""
        shift_counts = defaultdict(int)
        shift_info = {}

        for a in assignments:
            shift_counts[a.shift_id] += 1
            if a.shift:
                shift_info[a.shift_id] = {
                    "code": a.shift.code,
                    "name": a.shift.name,
                    "hours": a.shift.hours,
                    "is_overnight": a.shift.is_overnight,
                }

        return [
            {
                "shift_id": sid,
                "shift_code": shift_info.get(sid, {}).get("code", f"Shift {sid}"),
                "shift_name": shift_info.get(sid, {}).get("name", ""),
                "hours": shift_info.get(sid, {}).get("hours", 0),
                "is_overnight": shift_info.get(sid, {}).get("is_overnight", False),
                "assignment_count": count,
            }
            for sid, count in sorted(shift_counts.items(), key=lambda x: x[1], reverse=True)
        ]

    def _calculate_summary(
        self,
        schedule: Schedule,
        assignments: list,
        doctor_stats: list,
        coverage_stats: dict,
    ) -> dict:
        """Calculate summary statistics."""
        _, days_in_month = monthrange(schedule.year, schedule.month)

        # Count doctors with assignments
        doctors_with_assignments = len([d for d in doctor_stats if d["assignment_count"] > 0])
        total_doctors = len(doctor_stats)

        # Calculate average hours
        total_hours = sum(d["total_hours"] for d in doctor_stats)
        avg_hours = total_hours / doctors_with_assignments if doctors_with_assignments > 0 else 0

        # Count doctors over limit
        doctors_over_limit = len([d for d in doctor_stats if d["is_over_limit"]])

        # Calculate workload balance (standard deviation)
        if doctors_with_assignments > 1:
            hours_list = [d["total_hours"] for d in doctor_stats if d["assignment_count"] > 0]
            mean_hours = sum(hours_list) / len(hours_list)
            variance = sum((h - mean_hours) ** 2 for h in hours_list) / len(hours_list)
            std_dev = variance ** 0.5
            workload_balance = max(0, 100 - (std_dev / mean_hours * 100)) if mean_hours > 0 else 0
        else:
            workload_balance = 100

        return {
            "total_assignments": len(assignments),
            "total_hours": total_hours,
            "days_in_month": days_in_month,
            "total_doctors": total_doctors,
            "doctors_with_assignments": doctors_with_assignments,
            "doctors_over_limit": doctors_over_limit,
            "average_hours_per_doctor": round(avg_hours, 1),
            "coverage_percentage": coverage_stats["coverage_percentage"],
            "gaps_count": coverage_stats["gaps_count"],
            "workload_balance_score": round(workload_balance, 1),
        }
