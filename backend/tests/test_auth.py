"""Tests for authentication endpoints."""
import pytest


class TestLogin:
    """Tests for login endpoint."""

    def test_login_success(self, client, admin_user):
        """Test successful login."""
        response = client.post(
            "/api/auth/login",
            data={"username": "admin@test.com", "password": "admin123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, admin_user):
        """Test login with wrong password."""
        response = client.post(
            "/api/auth/login",
            data={"username": "admin@test.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_wrong_email(self, client, admin_user):
        """Test login with non-existent email."""
        response = client.post(
            "/api/auth/login",
            data={"username": "nonexistent@test.com", "password": "admin123"},
        )
        assert response.status_code == 401

    def test_login_inactive_user(self, client, db_session, admin_user):
        """Test login with inactive user."""
        admin_user.is_active = False
        db_session.commit()

        response = client.post(
            "/api/auth/login",
            data={"username": "admin@test.com", "password": "admin123"},
        )
        # API returns 403 Forbidden for inactive users
        assert response.status_code == 403


class TestGetCurrentUser:
    """Tests for get current user endpoint."""

    def test_get_current_user(self, client, auth_headers, admin_user):
        """Test getting current authenticated user."""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["name"] == "Test Admin"
        assert data["role"] == "admin"

    def test_get_current_user_no_auth(self, client):
        """Test getting current user without authentication."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401
