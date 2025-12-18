"""Tests for constraint validator."""
import pytest
from datetime import date
from app.services.constraints import ConstraintValidator
from app.models.assignment import Assignment
from app.models.leave import Leave, LeaveStatus


class TestConstraintValidator:
    """Tests for constraint validation."""

    def test_validate_empty_schedule(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_coverage_templates
    ):
        """Test validating empty schedule detects coverage gaps."""
        validator = ConstraintValidator(db_session)
        result = validator.validate_schedule(sample_schedule.id)

        # Should have coverage violations for empty schedule
        assert not result.is_valid or len(result.violations) > 0

    def test_validate_double_booking(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors
    ):
        """Test detecting double booking attempt via assignment preview."""
        # Create an existing assignment
        assignment1 = Assignment(
            schedule_id=sample_schedule.id,
            doctor_id=sample_doctors[0].id,
            center_id=sample_centers[0].id,
            shift_id=sample_shifts[0].id,
            date=date(2025, 1, 15),
        )
        db_session.add(assignment1)
        db_session.commit()

        # Now try to validate adding another assignment for same doctor on same day
        validator = ConstraintValidator(db_session)
        result = validator.validate_assignment(
            schedule_id=sample_schedule.id,
            doctor_id=sample_doctors[0].id,
            center_id=sample_centers[1].id,
            shift_id=sample_shifts[1].id,
            assignment_date=date(2025, 1, 15),  # Same day as existing
        )

        # Should detect double booking
        double_bookings = [
            v for v in result.violations if v.type.value == "double_booking"
        ]
        assert len(double_bookings) > 0

    def test_validate_leave_conflict(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors
    ):
        """Test detecting assignment during leave."""
        # Create leave for doctor
        leave = Leave(
            doctor_id=sample_doctors[0].id,
            leave_type="annual",
            start_date=date(2025, 1, 10),
            end_date=date(2025, 1, 20),
            status=LeaveStatus.APPROVED,
        )
        db_session.add(leave)
        db_session.commit()

        # Create assignment during leave period
        assignment = Assignment(
            schedule_id=sample_schedule.id,
            doctor_id=sample_doctors[0].id,
            center_id=sample_centers[0].id,
            shift_id=sample_shifts[0].id,
            date=date(2025, 1, 15),  # During leave
        )
        db_session.add(assignment)
        db_session.commit()

        validator = ConstraintValidator(db_session)
        result = validator.validate_schedule(sample_schedule.id)

        # Should detect leave conflict
        leave_conflicts = [
            v for v in result.violations if v.type.value == "leave_conflict"
        ]
        assert len(leave_conflicts) > 0

    def test_validate_monthly_hours_warning(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors
    ):
        """Test detecting when doctor exceeds monthly hours limit."""
        # Create many assignments to exceed 160h limit for Saudi doctor
        # Using 8-hour shifts, need 21+ shifts to exceed 160h
        for day in range(1, 25):  # 24 days * 8h = 192h (exceeds 160h for Saudi)
            assignment = Assignment(
                schedule_id=sample_schedule.id,
                doctor_id=sample_doctors[0].id,  # Saudi doctor
                center_id=sample_centers[0].id,
                shift_id=sample_shifts[0].id,  # 8h shift
                date=date(2025, 1, day),
            )
            db_session.add(assignment)
        db_session.commit()

        validator = ConstraintValidator(db_session)
        result = validator.validate_schedule(sample_schedule.id)

        # Should have hours warning
        hours_violations = [
            v for v in result.violations if v.type.value == "monthly_hours_exceeded"
        ]
        assert len(hours_violations) > 0

    def test_validate_assignment_preview(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors
    ):
        """Test validating a single assignment before adding."""
        validator = ConstraintValidator(db_session)

        # Validate a valid assignment
        result = validator.validate_assignment(
            schedule_id=sample_schedule.id,
            doctor_id=sample_doctors[0].id,
            center_id=sample_centers[0].id,
            shift_id=sample_shifts[0].id,
            assignment_date=date(2025, 1, 15),
        )

        # Should be valid
        assert result.is_valid

    def test_validate_assignment_during_leave(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors
    ):
        """Test validating assignment during doctor's leave."""
        # Create approved leave
        leave = Leave(
            doctor_id=sample_doctors[0].id,
            leave_type="sick",
            start_date=date(2025, 1, 10),
            end_date=date(2025, 1, 15),
            status=LeaveStatus.APPROVED,
        )
        db_session.add(leave)
        db_session.commit()

        validator = ConstraintValidator(db_session)

        # Validate assignment during leave
        result = validator.validate_assignment(
            schedule_id=sample_schedule.id,
            doctor_id=sample_doctors[0].id,
            center_id=sample_centers[0].id,
            shift_id=sample_shifts[0].id,
            assignment_date=date(2025, 1, 12),  # During leave
        )

        # Should have leave conflict
        leave_conflicts = [
            v for v in result.violations if v.type.value == "leave_conflict"
        ]
        assert len(leave_conflicts) > 0
