"""
Auto-Builder Service for Doctor Roster Scheduling.

This module implements automatic schedule generation using constraint satisfaction.
It fills coverage requirements while respecting all scheduling rules.
"""
from dataclasses import dataclass
from datetime import date as date_type, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.assignment import Assignment
from app.models.doctor import Doctor
from app.models.leave import Leave, LeaveStatus
from app.models.schedule import Schedule
from app.models.shift import Shift
from app.models.coverage_template import CoverageTemplate
from app.models.center import Center
from app.models.user import Nationality


@dataclass
class BuildResult:
    """Result of auto-building a schedule."""
    success: bool
    message: str
    assignments_created: int = 0
    slots_unfilled: int = 0
    warnings: list[str] = None

    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "message": self.message,
            "assignments_created": self.assignments_created,
            "slots_unfilled": self.slots_unfilled,
            "warnings": self.warnings,
        }


class AutoBuilder:
    """Automatic schedule builder using constraint satisfaction."""

    def __init__(self, db: Session):
        self.db = db
        self._doctor_hours: dict[int, int] = {}  # Cache for doctor hours
        self._doctor_assignments: dict[int, set[date_type]] = {}  # Track assigned dates
        self._doctor_night_dates: dict[int, set[date_type]] = {}  # Track night shift dates

    def build_schedule(
        self,
        schedule_id: int,
        clear_existing: bool = False
    ) -> BuildResult:
        """
        Auto-generate assignments for a schedule.

        Args:
            schedule_id: The schedule to build
            clear_existing: Whether to clear existing assignments first

        Returns:
            BuildResult with success status and statistics
        """
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            return BuildResult(
                success=False,
                message=f"Schedule {schedule_id} not found"
            )

        # Clear existing assignments if requested
        if clear_existing:
            self.db.query(Assignment).filter(
                Assignment.schedule_id == schedule_id
            ).delete()
            self.db.flush()

        # Initialize tracking
        self._init_tracking(schedule)

        # Get all coverage templates
        templates = self.db.query(CoverageTemplate).filter(
            CoverageTemplate.is_mandatory == True
        ).all()

        if not templates:
            return BuildResult(
                success=False,
                message="No coverage templates defined"
            )

        # Get all active doctors
        doctors = self.db.query(Doctor).filter(Doctor.is_active == True).all()
        if not doctors:
            return BuildResult(
                success=False,
                message="No active doctors available"
            )

        # Get date range for the month
        start_date = date_type(schedule.year, schedule.month, 1)
        if schedule.month == 12:
            end_date = date_type(schedule.year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date_type(schedule.year, schedule.month + 1, 1) - timedelta(days=1)

        # Build schedule day by day
        assignments_created = 0
        slots_unfilled = 0
        warnings = []

        current_date = start_date
        while current_date <= end_date:
            for template in templates:
                # Get existing assignment count for this slot
                existing_count = (
                    self.db.query(func.count(Assignment.id))
                    .filter(
                        Assignment.schedule_id == schedule_id,
                        Assignment.center_id == template.center_id,
                        Assignment.shift_id == template.shift_id,
                        Assignment.date == current_date,
                    )
                    .scalar()
                )

                # How many more do we need?
                needed = template.min_doctors - existing_count

                for _ in range(needed):
                    # Find best available doctor
                    doctor = self._find_best_doctor(
                        doctors=doctors,
                        center_id=template.center_id,
                        shift_id=template.shift_id,
                        assignment_date=current_date,
                        schedule=schedule,
                    )

                    if doctor:
                        # Create assignment
                        shift = self.db.query(Shift).filter(
                            Shift.id == template.shift_id
                        ).first()

                        assignment = Assignment(
                            schedule_id=schedule_id,
                            doctor_id=doctor.id,
                            center_id=template.center_id,
                            shift_id=template.shift_id,
                            date=current_date,
                        )
                        self.db.add(assignment)
                        assignments_created += 1

                        # Update tracking
                        self._doctor_hours[doctor.id] += shift.hours if shift else 0
                        self._doctor_assignments[doctor.id].add(current_date)
                        if shift and shift.is_overnight:
                            self._doctor_night_dates[doctor.id].add(current_date)
                    else:
                        slots_unfilled += 1
                        center = self.db.query(Center).filter(
                            Center.id == template.center_id
                        ).first()
                        shift = self.db.query(Shift).filter(
                            Shift.id == template.shift_id
                        ).first()
                        warnings.append(
                            f"Could not fill {center.code if center else '?'}-"
                            f"{shift.code if shift else '?'} on {current_date}"
                        )

            current_date += timedelta(days=1)

        self.db.commit()

        success = slots_unfilled == 0
        message = (
            f"Created {assignments_created} assignments"
            if success else
            f"Created {assignments_created} assignments, {slots_unfilled} slots unfilled"
        )

        return BuildResult(
            success=success,
            message=message,
            assignments_created=assignments_created,
            slots_unfilled=slots_unfilled,
            warnings=warnings[:50],  # Limit warnings
        )

    def _init_tracking(self, schedule: Schedule) -> None:
        """Initialize tracking dictionaries for the build."""
        self._doctor_hours = {}
        self._doctor_assignments = {}
        self._doctor_night_dates = {}

        # Get all doctors
        doctors = self.db.query(Doctor).filter(Doctor.is_active == True).all()

        for doctor in doctors:
            # Calculate existing hours for this month
            total_hours = (
                self.db.query(func.sum(Shift.hours))
                .join(Assignment)
                .filter(
                    Assignment.doctor_id == doctor.id,
                    Assignment.schedule_id == schedule.id,
                )
                .scalar()
            ) or 0
            self._doctor_hours[doctor.id] = total_hours

            # Get existing assignment dates
            existing_dates = (
                self.db.query(Assignment.date)
                .filter(
                    Assignment.doctor_id == doctor.id,
                    Assignment.schedule_id == schedule.id,
                )
                .all()
            )
            self._doctor_assignments[doctor.id] = {d[0] for d in existing_dates}

            # Get existing night shift dates
            night_dates = (
                self.db.query(Assignment.date)
                .join(Shift)
                .filter(
                    Assignment.doctor_id == doctor.id,
                    Assignment.schedule_id == schedule.id,
                    Shift.is_overnight == True,
                )
                .all()
            )
            self._doctor_night_dates[doctor.id] = {d[0] for d in night_dates}

    def _find_best_doctor(
        self,
        doctors: list[Doctor],
        center_id: int,
        shift_id: int,
        assignment_date: date_type,
        schedule: Schedule,
    ) -> Optional[Doctor]:
        """
        Find the best available doctor for an assignment.

        Selection criteria (in order):
        1. Not already assigned on this date
        2. Not on leave
        3. Shift is valid for center
        4. Won't exceed monthly hours
        5. Prefers avoiding consecutive night shifts
        6. Balances workload (fewer hours = higher priority)
        """
        shift = self.db.query(Shift).filter(Shift.id == shift_id).first()
        center = self.db.query(Center).filter(Center.id == center_id).first()

        if not shift or not center:
            return None

        # Check shift is valid for this center
        if shift.code not in (center.allowed_shifts or []):
            return None

        candidates = []

        for doctor in doctors:
            # Skip if already assigned today
            if assignment_date in self._doctor_assignments.get(doctor.id, set()):
                continue

            # Skip if on leave
            if self._is_on_leave(doctor.id, assignment_date):
                continue

            # Calculate projected hours
            current_hours = self._doctor_hours.get(doctor.id, 0)
            projected_hours = current_hours + shift.hours

            # Get max hours for this doctor
            max_hours = self._get_max_hours(doctor)

            # Skip if would exceed hours limit
            if projected_hours > max_hours:
                continue

            # Calculate priority score (lower is better)
            score = current_hours  # Base score is current hours (load balancing)

            # Penalize consecutive night shifts
            if shift.is_overnight:
                prev_day = assignment_date - timedelta(days=1)
                next_day = assignment_date + timedelta(days=1)
                night_dates = self._doctor_night_dates.get(doctor.id, set())

                if prev_day in night_dates or next_day in night_dates:
                    score += 1000  # Heavy penalty for consecutive nights

            candidates.append((doctor, score))

        if not candidates:
            return None

        # Sort by score (lowest first) and return best candidate
        candidates.sort(key=lambda x: x[1])
        return candidates[0][0]

    def _is_on_leave(self, doctor_id: int, check_date: date_type) -> bool:
        """Check if doctor is on approved leave."""
        leave = (
            self.db.query(Leave)
            .filter(
                Leave.doctor_id == doctor_id,
                Leave.status == LeaveStatus.APPROVED,
                Leave.start_date <= check_date,
                Leave.end_date >= check_date,
            )
            .first()
        )
        return leave is not None

    def _get_max_hours(self, doctor: Doctor) -> int:
        """Get maximum monthly hours for a doctor."""
        if doctor.user:
            return 160 if doctor.user.nationality == Nationality.SAUDI else 192
        return 160  # Default to Saudi limit if unknown
