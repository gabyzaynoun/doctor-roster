"""Tests for schedule endpoints."""
import pytest


class TestListSchedules:
    """Tests for list schedules endpoint."""

    def test_list_schedules_empty(self, client, auth_headers):
        """Test listing schedules when none exist."""
        response = client.get("/api/schedules/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_list_schedules(self, client, auth_headers, sample_schedule):
        """Test listing schedules."""
        response = client.get("/api/schedules/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["year"] == 2025
        assert data[0]["month"] == 1

    def test_list_schedules_no_auth(self, client):
        """Test listing schedules without authentication."""
        response = client.get("/api/schedules/")
        assert response.status_code == 401


class TestCreateSchedule:
    """Tests for create schedule endpoint."""

    def test_create_schedule(self, client, auth_headers):
        """Test creating a new schedule."""
        response = client.post(
            "/api/schedules/",
            headers=auth_headers,
            json={"year": 2025, "month": 2},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["year"] == 2025
        assert data["month"] == 2
        assert data["status"] == "draft"

    def test_create_duplicate_schedule(self, client, auth_headers, sample_schedule):
        """Test creating duplicate schedule fails."""
        response = client.post(
            "/api/schedules/",
            headers=auth_headers,
            json={"year": 2025, "month": 1},  # Same as sample_schedule
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_schedule_doctor_forbidden(self, client, doctor_auth_headers):
        """Test doctors cannot create schedules."""
        response = client.post(
            "/api/schedules/",
            headers=doctor_auth_headers,
            json={"year": 2025, "month": 3},
        )
        assert response.status_code == 403


class TestGetSchedule:
    """Tests for get schedule endpoint."""

    def test_get_schedule(self, client, auth_headers, sample_schedule):
        """Test getting a schedule by ID."""
        response = client.get(
            f"/api/schedules/{sample_schedule.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_schedule.id
        assert data["year"] == 2025

    def test_get_schedule_not_found(self, client, auth_headers):
        """Test getting non-existent schedule."""
        response = client.get("/api/schedules/999", headers=auth_headers)
        assert response.status_code == 404

    def test_get_schedule_by_month(self, client, auth_headers, sample_schedule):
        """Test getting schedule by year/month."""
        response = client.get(
            "/api/schedules/by-month/2025/1",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["id"] == sample_schedule.id


class TestPublishSchedule:
    """Tests for publish workflow endpoints."""

    def test_publish_schedule(self, client, auth_headers, sample_schedule):
        """Test publishing a draft schedule."""
        response = client.post(
            f"/api/schedules/{sample_schedule.id}/publish",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "published"
        assert data["published_at"] is not None

    def test_publish_already_published(self, client, auth_headers, db_session, sample_schedule):
        """Test publishing already published schedule fails."""
        from app.models.schedule import ScheduleStatus
        sample_schedule.status = ScheduleStatus.PUBLISHED
        db_session.commit()

        response = client.post(
            f"/api/schedules/{sample_schedule.id}/publish",
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "Only draft" in response.json()["detail"]

    def test_unpublish_schedule(self, client, auth_headers, db_session, sample_schedule):
        """Test unpublishing a published schedule."""
        from app.models.schedule import ScheduleStatus
        from datetime import datetime
        sample_schedule.status = ScheduleStatus.PUBLISHED
        sample_schedule.published_at = datetime.utcnow()
        db_session.commit()

        response = client.post(
            f"/api/schedules/{sample_schedule.id}/unpublish",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "draft"
        assert data["published_at"] is None

    def test_archive_schedule(self, client, auth_headers, sample_schedule):
        """Test archiving a schedule."""
        response = client.post(
            f"/api/schedules/{sample_schedule.id}/archive",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "archived"

    def test_unarchive_schedule(self, client, auth_headers, db_session, sample_schedule):
        """Test unarchiving a schedule."""
        from app.models.schedule import ScheduleStatus
        sample_schedule.status = ScheduleStatus.ARCHIVED
        db_session.commit()

        response = client.post(
            f"/api/schedules/{sample_schedule.id}/unarchive",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "draft"


class TestScheduleValidation:
    """Tests for schedule validation endpoint."""

    def test_validate_empty_schedule(self, client, auth_headers, sample_schedule, sample_centers, sample_shifts, sample_coverage_templates):
        """Test validating an empty schedule shows coverage gaps."""
        response = client.get(
            f"/api/schedules/{sample_schedule.id}/validate",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        # Empty schedule should have coverage violations
        assert data["error_count"] > 0 or len(data["violations"]) > 0
