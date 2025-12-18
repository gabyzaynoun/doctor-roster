"""Tests for user management endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestCreateUser:
    """Tests for POST /users/."""

    def test_create_user_success(self, client: TestClient, admin_token: str):
        response = client.post(
            "/api/users/",
            json={
                "email": "newuser@test.dev",
                "name": "New User",
                "password": "password123",
                "role": "doctor",
                "nationality": "saudi",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@test.dev"
        assert data["name"] == "New User"
        assert data["role"] == "doctor"
        assert data["nationality"] == "saudi"
        assert "password" not in data
        assert "password_hash" not in data

    def test_create_user_duplicate_email(self, client: TestClient, admin_token: str):
        # First create a user
        client.post(
            "/api/users/",
            json={
                "email": "duplicate@test.dev",
                "name": "First User",
                "password": "password123",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Try to create another with same email
        response = client.post(
            "/api/users/",
            json={
                "email": "duplicate@test.dev",
                "name": "Second User",
                "password": "password456",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_create_user_requires_admin(self, client: TestClient, doctor_token: str):
        response = client.post(
            "/api/users/",
            json={
                "email": "newuser@test.dev",
                "name": "New User",
                "password": "password123",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 403


class TestCreateUserWithDoctor:
    """Tests for POST /users/with-doctor."""

    def test_create_user_with_doctor_success(self, client: TestClient, admin_token: str):
        response = client.post(
            "/api/users/with-doctor",
            params={"employee_id": "DR999", "specialty": "Cardiology"},
            json={
                "email": "newdoctor@test.dev",
                "name": "New Doctor",
                "password": "password123",
                "role": "doctor",
                "nationality": "non_saudi",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newdoctor@test.dev"
        assert data["name"] == "New Doctor"


class TestListUsers:
    """Tests for GET /users/."""

    def test_list_users_admin(self, client: TestClient, admin_token: str):
        response = client.get(
            "/api/users/",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_users_requires_admin(self, client: TestClient, doctor_token: str):
        response = client.get(
            "/api/users/",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 403


class TestUpdateUser:
    """Tests for PATCH /users/{id}."""

    def test_update_user_success(self, client: TestClient, admin_token: str, doctor_user):
        user, _ = doctor_user  # Get the user from the fixture tuple

        response = client.patch(
            f"/api/users/{user.id}",
            json={"name": "Updated Name"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    def test_update_user_not_found(self, client: TestClient, admin_token: str):
        response = client.patch(
            "/api/users/99999",
            json={"name": "Updated Name"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404
