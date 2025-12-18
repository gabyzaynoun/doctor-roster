from pydantic import BaseModel, EmailStr
from app.schemas.user import UserRole, Nationality


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.DOCTOR
    nationality: Nationality = Nationality.NON_SAUDI
