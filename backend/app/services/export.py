"""Export service for schedule data in various formats."""
import csv
import io
from datetime import date
from calendar import monthrange
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.assignment import Assignment
from app.models.doctor import Doctor
from app.models.shift import Shift
from app.models.center import Center
from app.models.schedule import Schedule


class ExportService:
    """Service for exporting schedule data."""

    def __init__(self, db: Session):
        self.db = db

    def export_schedule_csv(self, schedule_id: int) -> str:
        """Export schedule assignments to CSV format."""
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            raise ValueError("Schedule not found")

        # Get all assignments for this schedule
        assignments = (
            self.db.query(Assignment)
            .options(
                joinedload(Assignment.doctor).joinedload(Doctor.user),
                joinedload(Assignment.shift),
                joinedload(Assignment.center),
            )
            .filter(Assignment.schedule_id == schedule_id)
            .order_by(Assignment.date, Assignment.center_id, Assignment.shift_id)
            .all()
        )

        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            "Date",
            "Day",
            "Center",
            "Shift",
            "Shift Hours",
            "Doctor Name",
            "Doctor ID",
            "Nationality",
        ])

        # Write data
        for a in assignments:
            day_name = a.date.strftime("%A")
            doctor_name = a.doctor.user.name if a.doctor and a.doctor.user else f"Doctor {a.doctor_id}"
            nationality = a.doctor.user.nationality if a.doctor and a.doctor.user else "unknown"

            writer.writerow([
                a.date.isoformat(),
                day_name,
                a.center.name if a.center else f"Center {a.center_id}",
                a.shift.code if a.shift else f"Shift {a.shift_id}",
                a.shift.hours if a.shift else 0,
                doctor_name,
                a.doctor.employee_id or a.doctor_id if a.doctor else a.doctor_id,
                nationality,
            ])

        return output.getvalue()

    def export_doctor_hours_csv(self, schedule_id: int) -> str:
        """Export doctor hours summary to CSV format."""
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            raise ValueError("Schedule not found")

        # Get all assignments for this schedule
        assignments = (
            self.db.query(Assignment)
            .options(
                joinedload(Assignment.doctor).joinedload(Doctor.user),
                joinedload(Assignment.shift),
            )
            .filter(Assignment.schedule_id == schedule_id)
            .all()
        )

        # Calculate hours per doctor
        doctor_hours = {}
        for a in assignments:
            if a.doctor_id not in doctor_hours:
                doctor = a.doctor
                nationality = doctor.user.nationality if doctor and doctor.user else "non_saudi"
                max_hours = 160 if nationality == "saudi" else 192
                doctor_hours[a.doctor_id] = {
                    "name": doctor.user.name if doctor and doctor.user else f"Doctor {a.doctor_id}",
                    "employee_id": doctor.employee_id if doctor else None,
                    "nationality": nationality,
                    "max_hours": max_hours,
                    "total_hours": 0,
                    "assignment_count": 0,
                    "overnight_count": 0,
                }

            doctor_hours[a.doctor_id]["total_hours"] += a.shift.hours if a.shift else 0
            doctor_hours[a.doctor_id]["assignment_count"] += 1
            if a.shift and a.shift.is_overnight:
                doctor_hours[a.doctor_id]["overnight_count"] += 1

        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            "Doctor Name",
            "Employee ID",
            "Nationality",
            "Total Hours",
            "Max Hours",
            "Hours %",
            "Assignments",
            "Night Shifts",
            "Over Limit",
        ])

        # Write data sorted by hours descending
        for doctor_id, data in sorted(doctor_hours.items(), key=lambda x: x[1]["total_hours"], reverse=True):
            hours_pct = (data["total_hours"] / data["max_hours"] * 100) if data["max_hours"] > 0 else 0
            over_limit = "Yes" if data["total_hours"] > data["max_hours"] else "No"

            writer.writerow([
                data["name"],
                data["employee_id"] or "",
                data["nationality"],
                data["total_hours"],
                data["max_hours"],
                f"{hours_pct:.1f}%",
                data["assignment_count"],
                data["overnight_count"],
                over_limit,
            ])

        return output.getvalue()

    def export_coverage_matrix_csv(self, schedule_id: int) -> str:
        """Export coverage matrix (centers x days) to CSV format."""
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            raise ValueError("Schedule not found")

        # Get all assignments
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

        # Get all centers
        centers = self.db.query(Center).filter(Center.is_active == True).order_by(Center.code).all()

        # Build matrix: center -> date -> list of doctor names
        _, days_in_month = monthrange(schedule.year, schedule.month)
        matrix = {}
        for center in centers:
            matrix[center.id] = {
                "name": center.name,
                "code": center.code,
                "days": {day: [] for day in range(1, days_in_month + 1)}
            }

        for a in assignments:
            if a.center_id in matrix:
                day = a.date.day
                doctor_name = a.doctor.user.name if a.doctor and a.doctor.user else f"D{a.doctor_id}"
                shift_code = a.shift.code if a.shift else "?"
                matrix[a.center_id]["days"][day].append(f"{doctor_name[:10]}({shift_code})")

        output = io.StringIO()
        writer = csv.writer(output)

        # Write header with days
        header = ["Center"]
        for day in range(1, days_in_month + 1):
            d = date(schedule.year, schedule.month, day)
            header.append(f"{day} {d.strftime('%a')}")
        writer.writerow(header)

        # Write center rows
        for center_id, data in matrix.items():
            row = [f"{data['code']} - {data['name']}"]
            for day in range(1, days_in_month + 1):
                assignments_str = ", ".join(data["days"][day]) if data["days"][day] else "-"
                row.append(assignments_str)
            writer.writerow(row)

        return output.getvalue()
