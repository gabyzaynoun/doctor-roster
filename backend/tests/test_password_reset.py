"""Tests for password reset functionality."""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta


class TestForgotPassword:
    """Tests for POST /auth/forgot-password."""

    def test_forgot_password_valid_email(self, client: TestClient, admin_user):
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": admin_user.email},
        )
        assert response.status_code == 200
        assert "reset link has been sent" in response.json()["message"]

    def test_forgot_password_invalid_email(self, client: TestClient):
        # Should return success even for invalid email (prevent enumeration)
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "nonexistent@example.com"},
        )
        assert response.status_code == 200
        assert "reset link has been sent" in response.json()["message"]

    def test_forgot_password_creates_token(self, client: TestClient, db_session, admin_user):
        from app.models.password_reset import PasswordResetToken

        # Count existing tokens
        initial_count = (
            db_session.query(PasswordResetToken)
            .filter(PasswordResetToken.user_id == admin_user.id)
            .count()
        )

        client.post(
            "/api/auth/forgot-password",
            json={"email": admin_user.email},
        )

        # New token should be created
        new_count = (
            db_session.query(PasswordResetToken)
            .filter(PasswordResetToken.user_id == admin_user.id)
            .count()
        )
        assert new_count > initial_count


class TestResetPassword:
    """Tests for POST /auth/reset-password."""

    def test_reset_password_valid_token(self, client: TestClient, db_session, admin_user):
        from app.models.password_reset import PasswordResetToken
        from app.core.security import verify_password

        # Create a valid token
        token = PasswordResetToken(
            user_id=admin_user.id,
            token=PasswordResetToken.generate_token(),
            expires_at=PasswordResetToken.get_expiry(hours=1),
        )
        db_session.add(token)
        db_session.commit()

        new_password = "newpassword123"
        response = client.post(
            "/api/auth/reset-password",
            json={"token": token.token, "new_password": new_password},
        )
        assert response.status_code == 200

        # Verify password was changed
        db_session.refresh(admin_user)
        assert verify_password(new_password, admin_user.password_hash)

    def test_reset_password_invalid_token(self, client: TestClient):
        response = client.post(
            "/api/auth/reset-password",
            json={"token": "invalid-token", "new_password": "newpassword123"},
        )
        assert response.status_code == 400
        assert "Invalid or expired" in response.json()["detail"]

    def test_reset_password_expired_token(self, client: TestClient, db_session, admin_user):
        from app.models.password_reset import PasswordResetToken

        # Create an expired token
        token = PasswordResetToken(
            user_id=admin_user.id,
            token=PasswordResetToken.generate_token(),
            expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
        )
        db_session.add(token)
        db_session.commit()

        response = client.post(
            "/api/auth/reset-password",
            json={"token": token.token, "new_password": "newpassword123"},
        )
        assert response.status_code == 400

    def test_reset_password_already_used_token(self, client: TestClient, db_session, admin_user):
        from app.models.password_reset import PasswordResetToken

        # Create a used token
        token = PasswordResetToken(
            user_id=admin_user.id,
            token=PasswordResetToken.generate_token(),
            expires_at=PasswordResetToken.get_expiry(hours=1),
            used_at=datetime.utcnow(),  # Already used
        )
        db_session.add(token)
        db_session.commit()

        response = client.post(
            "/api/auth/reset-password",
            json={"token": token.token, "new_password": "newpassword123"},
        )
        assert response.status_code == 400


class TestVerifyResetToken:
    """Tests for GET /auth/verify-reset-token/{token}."""

    def test_verify_valid_token(self, client: TestClient, db_session, admin_user):
        from app.models.password_reset import PasswordResetToken

        token = PasswordResetToken(
            user_id=admin_user.id,
            token=PasswordResetToken.generate_token(),
            expires_at=PasswordResetToken.get_expiry(hours=1),
        )
        db_session.add(token)
        db_session.commit()

        response = client.get(f"/api/auth/verify-reset-token/{token.token}")
        assert response.status_code == 200
        assert response.json()["valid"] is True

    def test_verify_invalid_token(self, client: TestClient):
        response = client.get("/api/auth/verify-reset-token/invalid-token")
        assert response.status_code == 400
