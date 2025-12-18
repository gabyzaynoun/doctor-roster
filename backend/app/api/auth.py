from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import Token, LoginRequest, RegisterRequest
from app.schemas.user import UserResponse
from app.services.email import get_email_service

router = APIRouter()


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login and get access token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.post("/register", response_model=UserResponse, status_code=201)
def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Register a new user."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
        role=user_data.role,
        nationality=user_data.nationality,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    return current_user


@router.post("/forgot-password")
def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset email."""
    user = db.query(User).filter(User.email == request.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}

    # Invalidate existing tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None)
    ).update({"used_at": datetime.utcnow()})

    # Create new token
    token = PasswordResetToken(
        user_id=user.id,
        token=PasswordResetToken.generate_token(),
        expires_at=PasswordResetToken.get_expiry(hours=1),
    )
    db.add(token)
    db.commit()

    # Send email
    email_service = get_email_service()
    email_service.send_password_reset(user.email, token.token, user.name)

    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(
    request: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    """Reset password using token."""
    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == request.token
    ).first()

    if not token or not token.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Update user password
    user = db.query(User).filter(User.id == token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )

    user.password_hash = get_password_hash(request.new_password)
    token.used_at = datetime.utcnow()
    db.commit()

    return {"message": "Password has been reset successfully"}


@router.get("/verify-reset-token/{token}")
def verify_reset_token(
    token: str,
    db: Session = Depends(get_db),
):
    """Verify if a reset token is valid."""
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token
    ).first()

    if not reset_token or not reset_token.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    return {"valid": True}
