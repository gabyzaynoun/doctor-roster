"""
Constraint Validation Engine for Doctor Roster Scheduling.

This module implements all scheduling rules from the requirements:
- Working hours limits (Saudi: 160h/month, Non-Saudi: 192h/month)
- Consecutive shift restrictions
- Coverage requirements
- Leave conflicts
- Center-specific rules
"""
from dataclasses import dataclass, field
from datetime import date as date_type, timedelta
from enum import Enum
from typing import Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.assignment import Assignment
from app.models.doctor import Doctor
from app.models.leave import Leave, LeaveStatus
from app.models.schedule import Schedule
from app.models.shift import Shift
from app.models.coverage_template import CoverageTemplate
from app.models.center import Center
from app.models.user import User, Nationality


class ViolationType(str, Enum):
    """Types of constraint violations."""
    MONTHLY_HOURS_EXCEEDED = "monthly_hours_exceeded"
    CONSECUTIVE_NIGHTS = "consecutive_nights"
    INSUFFICIENT_COVERAGE = "insufficient_coverage"
    LEAVE_CONFLICT = "leave_conflict"
    DOUBLE_BOOKING = "double_booking"
    INVALID_SHIFT_FOR_CENTER = "invalid_shift_for_center"
    REST_PERIOD_VIOLATION = "rest_period_violation"


class Severity(str, Enum):
    """Severity levels for violations."""
    ERROR = "error"      # Must be fixed before publishing
    WARNING = "warning"  # Should be reviewed
    INFO = "info"        # Informational only


@dataclass
class Violation:
    """Represents a constraint violation."""
    type: ViolationType
    severity: Severity
    message: str
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    center_id: Optional[int] = None
    center_name: Optional[str] = None
    shift_id: Optional[int] = None
    shift_code: Optional[str] = None
    date: Optional[date_type] = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "type": self.type.value,
            "severity": self.severity.value,
            "message": self.message,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor_name,
            "center_id": self.center_id,
            "center_name": self.center_name,
            "shift_id": self.shift_id,
            "shift_code": self.shift_code,
            "date": self.date.isoformat() if self.date else None,
            "details": self.details,
        }


@dataclass
class ValidationResult:
    """Result of validating a schedule."""
    is_valid: bool
    violations: list[Violation]
    error_count: int = 0
    warning_count: int = 0
    info_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "is_valid": self.is_valid,
            "error_count": self.error_count,
            "warning_count": self.warning_count,
            "info_count": self.info_count,
            "violations": [v.to_dict() for v in self.violations],
        }


class ConstraintValidator:
    """Main constraint validation engine."""

    def __init__(self, db: Session):
        self.db = db

    def validate_schedule(self, schedule_id: int) -> ValidationResult:
        """Validate all constraints for a schedule."""
        violations: list[Violation] = []

        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            return ValidationResult(
                is_valid=False,
                violations=[Violation(
                    type=ViolationType.INSUFFICIENT_COVERAGE,
                    severity=Severity.ERROR,
                    message=f"Schedule {schedule_id} not found",
                )],
                error_count=1,
            )

        # Run all validators
        violations.extend(self._validate_monthly_hours(schedule))
        violations.extend(self._validate_consecutive_shifts(schedule))
        violations.extend(self._validate_coverage(schedule))
        violations.extend(self._validate_leave_conflicts(schedule))
        violations.extend(self._validate_double_bookings(schedule))
        violations.extend(self._validate_center_shifts(schedule))

        # Count by severity
        error_count = sum(1 for v in violations if v.severity == Severity.ERROR)
        warning_count = sum(1 for v in violations if v.severity == Severity.WARNING)
        info_count = sum(1 for v in violations if v.severity == Severity.INFO)

        return ValidationResult(
            is_valid=error_count == 0,
            violations=violations,
            error_count=error_count,
            warning_count=warning_count,
            info_count=info_count,
        )

    def validate_assignment(
        self, schedule_id: int, doctor_id: int, center_id: int,
        shift_id: int, assignment_date: date_type
    ) -> ValidationResult:
        """Validate a single assignment before adding it."""
        violations: list[Violation] = []

        # Get required data
        doctor = self.db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            return ValidationResult(
                is_valid=False,
                violations=[Violation(
                    type=ViolationType.INSUFFICIENT_COVERAGE,
                    severity=Severity.ERROR,
                    message=f"Doctor {doctor_id} not found",
                )],
                error_count=1,
            )

        user = doctor.user
        center = self.db.query(Center).filter(Center.id == center_id).first()
        shift = self.db.query(Shift).filter(Shift.id == shift_id).first()

        # Check shift is valid for center
        if center and shift:
            if shift.code not in (center.allowed_shifts or []):
                violations.append(Violation(
                    type=ViolationType.INVALID_SHIFT_FOR_CENTER,
                    severity=Severity.ERROR,
                    message=f"Shift {shift.code} is not allowed at {center.name}",
                    doctor_id=doctor_id,
                    doctor_name=user.name if user else None,
                    center_id=center_id,
                    center_name=center.name,
                    shift_id=shift_id,
                    shift_code=shift.code,
                    date=assignment_date,
                ))

        # Check for leave conflicts
        leave_conflict = (
            self.db.query(Leave)
            .filter(
                Leave.doctor_id == doctor_id,
                Leave.status == LeaveStatus.APPROVED,
                Leave.start_date <= assignment_date,
                Leave.end_date >= assignment_date,
            )
            .first()
        )
        if leave_conflict:
            violations.append(Violation(
                type=ViolationType.LEAVE_CONFLICT,
                severity=Severity.ERROR,
                message=f"Doctor is on approved leave on {assignment_date}",
                doctor_id=doctor_id,
                doctor_name=user.name if user else None,
                date=assignment_date,
                details={"leave_type": leave_conflict.leave_type},
            ))

        # Check for double booking on same day
        existing = (
            self.db.query(Assignment)
            .filter(
                Assignment.schedule_id == schedule_id,
                Assignment.doctor_id == doctor_id,
                Assignment.date == assignment_date,
            )
            .first()
        )
        if existing:
            violations.append(Violation(
                type=ViolationType.DOUBLE_BOOKING,
                severity=Severity.ERROR,
                message=f"Doctor already has an assignment on {assignment_date}",
                doctor_id=doctor_id,
                doctor_name=user.name if user else None,
                date=assignment_date,
            ))

        # Check consecutive night shifts
        if shift and shift.is_overnight:
            prev_day = assignment_date - timedelta(days=1)
            prev_assignment = (
                self.db.query(Assignment)
                .join(Shift)
                .filter(
                    Assignment.schedule_id == schedule_id,
                    Assignment.doctor_id == doctor_id,
                    Assignment.date == prev_day,
                    Shift.is_overnight == True,
                )
                .first()
            )
            if prev_assignment:
                violations.append(Violation(
                    type=ViolationType.CONSECUTIVE_NIGHTS,
                    severity=Severity.WARNING,
                    message=f"Doctor would have consecutive night shifts",
                    doctor_id=doctor_id,
                    doctor_name=user.name if user else None,
                    date=assignment_date,
                ))

        # Check monthly hours
        if shift and user:
            schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
            if schedule:
                current_hours = self._get_doctor_monthly_hours(
                    doctor_id, schedule.year, schedule.month
                )
                new_total = current_hours + shift.hours
                max_hours = 160 if user.nationality == Nationality.SAUDI else 192

                if new_total > max_hours:
                    violations.append(Violation(
                        type=ViolationType.MONTHLY_HOURS_EXCEEDED,
                        severity=Severity.WARNING,
                        message=f"Would exceed monthly hours limit ({new_total}/{max_hours}h)",
                        doctor_id=doctor_id,
                        doctor_name=user.name,
                        details={
                            "current_hours": current_hours,
                            "shift_hours": shift.hours,
                            "new_total": new_total,
                            "max_hours": max_hours,
                        },
                    ))

        error_count = sum(1 for v in violations if v.severity == Severity.ERROR)
        warning_count = sum(1 for v in violations if v.severity == Severity.WARNING)

        return ValidationResult(
            is_valid=error_count == 0,
            violations=violations,
            error_count=error_count,
            warning_count=warning_count,
        )

    def _validate_monthly_hours(self, schedule: Schedule) -> list[Violation]:
        """Check that no doctor exceeds their monthly hours limit."""
        violations: list[Violation] = []

        # Get all doctors with assignments in this schedule
        doctor_hours = (
            self.db.query(
                Assignment.doctor_id,
                func.sum(Shift.hours).label("total_hours")
            )
            .join(Shift)
            .filter(Assignment.schedule_id == schedule.id)
            .group_by(Assignment.doctor_id)
            .all()
        )

        for doctor_id, total_hours in doctor_hours:
            doctor = self.db.query(Doctor).filter(Doctor.id == doctor_id).first()
            if not doctor or not doctor.user:
                continue

            user = doctor.user
            max_hours = 160 if user.nationality == Nationality.SAUDI else 192

            if total_hours > max_hours:
                violations.append(Violation(
                    type=ViolationType.MONTHLY_HOURS_EXCEEDED,
                    severity=Severity.ERROR,
                    message=f"Doctor exceeds monthly hours limit ({total_hours}/{max_hours}h)",
                    doctor_id=doctor_id,
                    doctor_name=user.name,
                    details={
                        "total_hours": total_hours,
                        "max_hours": max_hours,
                        "nationality": user.nationality.value,
                    },
                ))
            elif total_hours > max_hours * 0.9:  # Warning at 90%
                violations.append(Violation(
                    type=ViolationType.MONTHLY_HOURS_EXCEEDED,
                    severity=Severity.WARNING,
                    message=f"Doctor approaching monthly hours limit ({total_hours}/{max_hours}h)",
                    doctor_id=doctor_id,
                    doctor_name=user.name,
                    details={
                        "total_hours": total_hours,
                        "max_hours": max_hours,
                    },
                ))

        return violations

    def _validate_consecutive_shifts(self, schedule: Schedule) -> list[Violation]:
        """Check for consecutive night shifts."""
        violations: list[Violation] = []

        # Get all night shift assignments ordered by doctor and date
        night_assignments = (
            self.db.query(Assignment)
            .join(Shift)
            .filter(
                Assignment.schedule_id == schedule.id,
                Shift.is_overnight == True,
            )
            .order_by(Assignment.doctor_id, Assignment.date)
            .all()
        )

        # Group by doctor
        from itertools import groupby
        for doctor_id, assignments in groupby(night_assignments, key=lambda a: a.doctor_id):
            prev_date = None
            for assignment in assignments:
                if prev_date and (assignment.date - prev_date).days == 1:
                    doctor = self.db.query(Doctor).filter(Doctor.id == doctor_id).first()
                    user_name = doctor.user.name if doctor and doctor.user else None
                    violations.append(Violation(
                        type=ViolationType.CONSECUTIVE_NIGHTS,
                        severity=Severity.WARNING,
                        message=f"Consecutive night shifts on {prev_date} and {assignment.date}",
                        doctor_id=doctor_id,
                        doctor_name=user_name,
                        date=assignment.date,
                    ))
                prev_date = assignment.date

        return violations

    def _validate_coverage(self, schedule: Schedule) -> list[Violation]:
        """Check that coverage requirements are met for all days."""
        violations: list[Violation] = []

        # Get all coverage templates
        templates = self.db.query(CoverageTemplate).filter(
            CoverageTemplate.is_mandatory == True
        ).all()

        # Get the date range for this schedule
        start_date = date_type(schedule.year, schedule.month, 1)
        if schedule.month == 12:
            end_date = date_type(schedule.year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date_type(schedule.year, schedule.month + 1, 1) - timedelta(days=1)

        # Check each day
        current_date = start_date
        while current_date <= end_date:
            for template in templates:
                # Count assignments for this center/shift/day
                count = (
                    self.db.query(func.count(Assignment.id))
                    .filter(
                        Assignment.schedule_id == schedule.id,
                        Assignment.center_id == template.center_id,
                        Assignment.shift_id == template.shift_id,
                        Assignment.date == current_date,
                    )
                    .scalar()
                )

                if count < template.min_doctors:
                    center = self.db.query(Center).filter(
                        Center.id == template.center_id
                    ).first()
                    shift = self.db.query(Shift).filter(
                        Shift.id == template.shift_id
                    ).first()

                    violations.append(Violation(
                        type=ViolationType.INSUFFICIENT_COVERAGE,
                        severity=Severity.ERROR,
                        message=f"Insufficient coverage: {count}/{template.min_doctors} doctors",
                        center_id=template.center_id,
                        center_name=center.name if center else None,
                        shift_id=template.shift_id,
                        shift_code=shift.code if shift else None,
                        date=current_date,
                        details={
                            "assigned": count,
                            "required": template.min_doctors,
                        },
                    ))

            current_date += timedelta(days=1)

        return violations

    def _validate_leave_conflicts(self, schedule: Schedule) -> list[Violation]:
        """Check for assignments during approved leave."""
        violations: list[Violation] = []

        # Find assignments that conflict with approved leaves
        assignments = (
            self.db.query(Assignment)
            .filter(Assignment.schedule_id == schedule.id)
            .all()
        )

        for assignment in assignments:
            leave_conflict = (
                self.db.query(Leave)
                .filter(
                    Leave.doctor_id == assignment.doctor_id,
                    Leave.status == LeaveStatus.APPROVED,
                    Leave.start_date <= assignment.date,
                    Leave.end_date >= assignment.date,
                )
                .first()
            )

            if leave_conflict:
                doctor = self.db.query(Doctor).filter(
                    Doctor.id == assignment.doctor_id
                ).first()
                violations.append(Violation(
                    type=ViolationType.LEAVE_CONFLICT,
                    severity=Severity.ERROR,
                    message=f"Assignment conflicts with approved leave",
                    doctor_id=assignment.doctor_id,
                    doctor_name=doctor.user.name if doctor and doctor.user else None,
                    date=assignment.date,
                    details={"leave_type": leave_conflict.leave_type},
                ))

        return violations

    def _validate_double_bookings(self, schedule: Schedule) -> list[Violation]:
        """Check for doctors assigned to multiple shifts on the same day."""
        violations: list[Violation] = []

        # Find duplicate assignments
        duplicates = (
            self.db.query(
                Assignment.doctor_id,
                Assignment.date,
                func.count(Assignment.id).label("count")
            )
            .filter(Assignment.schedule_id == schedule.id)
            .group_by(Assignment.doctor_id, Assignment.date)
            .having(func.count(Assignment.id) > 1)
            .all()
        )

        for doctor_id, assignment_date, count in duplicates:
            doctor = self.db.query(Doctor).filter(Doctor.id == doctor_id).first()
            violations.append(Violation(
                type=ViolationType.DOUBLE_BOOKING,
                severity=Severity.ERROR,
                message=f"Doctor has {count} assignments on same day",
                doctor_id=doctor_id,
                doctor_name=doctor.user.name if doctor and doctor.user else None,
                date=assignment_date,
            ))

        return violations

    def _validate_center_shifts(self, schedule: Schedule) -> list[Violation]:
        """Check that shifts are valid for their assigned centers."""
        violations: list[Violation] = []

        assignments = (
            self.db.query(Assignment)
            .filter(Assignment.schedule_id == schedule.id)
            .all()
        )

        for assignment in assignments:
            center = self.db.query(Center).filter(
                Center.id == assignment.center_id
            ).first()
            shift = self.db.query(Shift).filter(
                Shift.id == assignment.shift_id
            ).first()

            if center and shift:
                if shift.code not in (center.allowed_shifts or []):
                    doctor = self.db.query(Doctor).filter(
                        Doctor.id == assignment.doctor_id
                    ).first()
                    violations.append(Violation(
                        type=ViolationType.INVALID_SHIFT_FOR_CENTER,
                        severity=Severity.ERROR,
                        message=f"Shift {shift.code} is not allowed at {center.name}",
                        doctor_id=assignment.doctor_id,
                        doctor_name=doctor.user.name if doctor and doctor.user else None,
                        center_id=center.id,
                        center_name=center.name,
                        shift_id=shift.id,
                        shift_code=shift.code,
                        date=assignment.date,
                    ))

        return violations

    def _get_doctor_monthly_hours(
        self, doctor_id: int, year: int, month: int
    ) -> int:
        """Get total hours assigned to a doctor for a month."""
        total = (
            self.db.query(func.sum(Shift.hours))
            .join(Assignment)
            .join(Schedule)
            .filter(
                Assignment.doctor_id == doctor_id,
                Schedule.year == year,
                Schedule.month == month,
            )
            .scalar()
        )
        return total or 0
