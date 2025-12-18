"""Pytest fixtures for testing."""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole, Nationality
from app.models.doctor import Doctor
from app.models.center import Center
from app.models.shift import Shift, ShiftType
from app.models.schedule import Schedule, ScheduleStatus
from app.models.assignment import Assignment
from app.models.coverage_template import CoverageTemplate
from app.models.leave import Leave, LeaveStatus


# Test database URL - in-memory SQLite
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    """Create a test database engine."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a test database session."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    """Create an admin user."""
    user = User(
        email="admin@test.com",
        name="Test Admin",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        nationality=Nationality.SAUDI,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def doctor_user(db_session):
    """Create a doctor user with Doctor record."""
    user = User(
        email="doctor@test.com",
        name="Test Doctor",
        password_hash=get_password_hash("doctor123"),
        role=UserRole.DOCTOR,
        nationality=Nationality.SAUDI,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    doctor = Doctor(
        user_id=user.id,
        employee_id="DOC001",
        is_active=True,
    )
    db_session.add(doctor)
    db_session.commit()
    db_session.refresh(doctor)

    return user, doctor


@pytest.fixture
def auth_headers(client, admin_user):
    """Get authentication headers for admin user."""
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@test.com", "password": "admin123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_token(client, admin_user):
    """Get JWT token for admin user."""
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@test.com", "password": "admin123"},
    )
    return response.json()["access_token"]


@pytest.fixture
def doctor_auth_headers(client, doctor_user):
    """Get authentication headers for doctor user."""
    user, _ = doctor_user
    response = client.post(
        "/api/auth/login",
        data={"username": "doctor@test.com", "password": "doctor123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def doctor_token(client, doctor_user):
    """Get JWT token for doctor user."""
    user, _ = doctor_user
    response = client.post(
        "/api/auth/login",
        data={"username": "doctor@test.com", "password": "doctor123"},
    )
    return response.json()["access_token"]


@pytest.fixture
def sample_centers(db_session):
    """Create sample centers."""
    centers = [
        Center(
            code="C1",
            name="Center 1",
            name_ar="المركز 1",
            allowed_shifts=["M8", "E8", "N12"],
            is_active=True,
        ),
        Center(
            code="C2",
            name="Center 2",
            name_ar="المركز 2",
            allowed_shifts=["M8", "E8"],
            is_active=True,
        ),
    ]
    for center in centers:
        db_session.add(center)
    db_session.commit()
    for center in centers:
        db_session.refresh(center)
    return centers


@pytest.fixture
def sample_shifts(db_session):
    """Create sample shifts."""
    from datetime import time
    shifts = [
        Shift(
            code="M8",
            name="Morning 8h",
            shift_type=ShiftType.EIGHT_HOUR,
            start_time=time(7, 0),
            end_time=time(15, 0),
            hours=8,
            is_overnight=False,
        ),
        Shift(
            code="E8",
            name="Evening 8h",
            shift_type=ShiftType.EIGHT_HOUR,
            start_time=time(15, 0),
            end_time=time(23, 0),
            hours=8,
            is_overnight=False,
        ),
        Shift(
            code="N12",
            name="Night 12h",
            shift_type=ShiftType.TWELVE_HOUR,
            start_time=time(19, 0),
            end_time=time(7, 0),
            hours=12,
            is_overnight=True,
        ),
    ]
    for shift in shifts:
        db_session.add(shift)
    db_session.commit()
    for shift in shifts:
        db_session.refresh(shift)
    return shifts


@pytest.fixture
def sample_schedule(db_session):
    """Create a sample schedule."""
    schedule = Schedule(
        year=2025,
        month=1,
        status=ScheduleStatus.DRAFT,
    )
    db_session.add(schedule)
    db_session.commit()
    db_session.refresh(schedule)
    return schedule


@pytest.fixture
def sample_doctors(db_session):
    """Create sample doctors."""
    doctors = []
    for i in range(5):
        nationality = Nationality.SAUDI if i < 3 else Nationality.NON_SAUDI
        user = User(
            email=f"doctor{i}@test.com",
            name=f"Doctor {i}",
            password_hash=get_password_hash("password"),
            role=UserRole.DOCTOR,
            nationality=nationality,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        doctor = Doctor(
            user_id=user.id,
            employee_id=f"DOC{i:03d}",
            is_active=True,
        )
        db_session.add(doctor)
        db_session.commit()
        db_session.refresh(doctor)
        doctors.append(doctor)

    return doctors


@pytest.fixture
def sample_coverage_templates(db_session, sample_centers, sample_shifts):
    """Create sample coverage templates."""
    templates = []
    for center in sample_centers:
        for shift in sample_shifts[:2]:  # M8 and E8
            template = CoverageTemplate(
                center_id=center.id,
                shift_id=shift.id,
                min_doctors=1,
                is_mandatory=True,
            )
            db_session.add(template)
            templates.append(template)
    db_session.commit()
    for t in templates:
        db_session.refresh(t)
    return templates
