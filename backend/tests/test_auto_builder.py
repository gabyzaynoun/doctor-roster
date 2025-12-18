"""Tests for auto-builder service."""
import pytest
from datetime import date
from app.services.auto_builder import AutoBuilder
from app.models.assignment import Assignment
from app.models.leave import Leave, LeaveStatus


class TestAutoBuilder:
    """Tests for auto-build functionality."""

    def test_auto_build_empty_schedule(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors, sample_coverage_templates
    ):
        """Test auto-building an empty schedule creates assignments."""
        builder = AutoBuilder(db_session)
        result = builder.build_schedule(sample_schedule.id, clear_existing=False)

        # Should create some assignments (BuildResult is a dataclass)
        assert result.assignments_created > 0
        assert result.message is not None

        # Verify assignments exist in database
        assignments = db_session.query(Assignment).filter(
            Assignment.schedule_id == sample_schedule.id
        ).all()
        assert len(assignments) > 0

    def test_auto_build_clear_existing(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors, sample_coverage_templates
    ):
        """Test auto-build with clear_existing removes old assignments."""
        # Create multiple existing assignments manually
        existing_ids = []
        for i in range(3):
            existing = Assignment(
                schedule_id=sample_schedule.id,
                doctor_id=sample_doctors[i].id,
                center_id=sample_centers[0].id,
                shift_id=sample_shifts[0].id,
                date=date(2025, 1, i + 10),  # Days 10, 11, 12
            )
            db_session.add(existing)
        db_session.commit()

        # Count assignments before clear
        count_before = db_session.query(Assignment).filter(
            Assignment.schedule_id == sample_schedule.id
        ).count()
        assert count_before == 3

        # Auto-build with clear
        builder = AutoBuilder(db_session)
        result = builder.build_schedule(sample_schedule.id, clear_existing=True)
        db_session.commit()

        # Auto-build should create assignments
        # Note: success may be False if some slots couldn't be filled (doctors hit monthly limits)
        assert result.assignments_created > 0

        # Count should reflect the new assignments (not the old 3)
        # The auto-builder creates assignments based on coverage templates
        count_after = db_session.query(Assignment).filter(
            Assignment.schedule_id == sample_schedule.id
        ).count()

        # The new count should equal what the auto-builder created
        # (the old 3 assignments should have been cleared)
        assert count_after == result.assignments_created

    def test_auto_build_respects_leave(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors, sample_coverage_templates
    ):
        """Test auto-build doesn't assign doctors who are on leave."""
        # Put all but one doctor on leave for the entire month
        for doctor in sample_doctors[:-1]:
            leave = Leave(
                doctor_id=doctor.id,
                leave_type="annual",
                start_date=date(2025, 1, 1),
                end_date=date(2025, 1, 31),
                status=LeaveStatus.APPROVED,
            )
            db_session.add(leave)
        db_session.commit()

        # Auto-build
        builder = AutoBuilder(db_session)
        builder.build_schedule(sample_schedule.id, clear_existing=True)

        # Check assignments - should only have the last doctor (who's not on leave)
        assignments = db_session.query(Assignment).filter(
            Assignment.schedule_id == sample_schedule.id
        ).all()

        available_doctor = sample_doctors[-1]
        for assignment in assignments:
            assert assignment.doctor_id == available_doctor.id

    def test_auto_build_no_double_booking(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors, sample_coverage_templates
    ):
        """Test auto-build doesn't create double bookings."""
        builder = AutoBuilder(db_session)
        builder.build_schedule(sample_schedule.id, clear_existing=True)

        # Get all assignments
        assignments = db_session.query(Assignment).filter(
            Assignment.schedule_id == sample_schedule.id
        ).all()

        # Check for double bookings (same doctor, same day)
        doctor_dates = {}
        for assignment in assignments:
            key = (assignment.doctor_id, assignment.date)
            if key in doctor_dates:
                pytest.fail(f"Double booking found for doctor {assignment.doctor_id} on {assignment.date}")
            doctor_dates[key] = True

    def test_auto_build_fill_only(
        self, db_session, sample_schedule, sample_centers, sample_shifts, sample_doctors, sample_coverage_templates
    ):
        """Test auto-build without clear preserves existing assignments."""
        # Create an existing assignment
        existing = Assignment(
            schedule_id=sample_schedule.id,
            doctor_id=sample_doctors[0].id,
            center_id=sample_centers[0].id,
            shift_id=sample_shifts[0].id,
            date=date(2025, 1, 15),
        )
        db_session.add(existing)
        db_session.commit()
        existing_id = existing.id

        # Auto-build without clear (fill only)
        builder = AutoBuilder(db_session)
        builder.build_schedule(sample_schedule.id, clear_existing=False)

        # Original assignment should still exist
        original = db_session.query(Assignment).filter(
            Assignment.id == existing_id
        ).first()
        assert original is not None
        assert original.doctor_id == sample_doctors[0].id


class TestAutoBuildEndpoint:
    """Tests for auto-build API endpoint."""

    def test_auto_build_endpoint(
        self, client, auth_headers, sample_schedule, sample_centers, sample_shifts, sample_doctors, sample_coverage_templates
    ):
        """Test auto-build via API."""
        response = client.post(
            f"/api/schedules/{sample_schedule.id}/auto-build",
            headers=auth_headers,
            json={"clear_existing": False},
        )
        assert response.status_code == 200
        data = response.json()
        assert "assignments_created" in data
        assert "message" in data

    def test_auto_build_requires_auth(self, client, sample_schedule):
        """Test auto-build requires authentication."""
        response = client.post(
            f"/api/schedules/{sample_schedule.id}/auto-build",
            json={"clear_existing": False},
        )
        assert response.status_code == 401

    def test_auto_build_doctor_forbidden(
        self, client, doctor_auth_headers, sample_schedule
    ):
        """Test doctors cannot trigger auto-build."""
        response = client.post(
            f"/api/schedules/{sample_schedule.id}/auto-build",
            headers=doctor_auth_headers,
            json={"clear_existing": False},
        )
        assert response.status_code == 403

    def test_auto_build_not_found(self, client, auth_headers):
        """Test auto-build with invalid schedule ID."""
        response = client.post(
            "/api/schedules/999/auto-build",
            headers=auth_headers,
            json={"clear_existing": False},
        )
        assert response.status_code == 404
