"""
Seed script to initialize database with centers, shifts, and coverage templates.
Run with: python -m app.scripts.seed_data
"""
from datetime import time
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.center import Center
from app.models.shift import Shift, ShiftType
from app.models.coverage_template import CoverageTemplate
from app.models.user import User, UserRole, Nationality
from app.models.doctor import Doctor


def seed_users(db: Session):
    """Seed default users including admin."""
    users_data = [
        {
            "email": "admin@roster.dev",
            "name": "System Admin",
            "password": "admin123",
            "role": UserRole.ADMIN,
        },
        {
            "email": "lead@roster.dev",
            "name": "Team Lead",
            "password": "lead123",
            "role": UserRole.TEAM_LEAD,
        },
        {
            "email": "doctor@roster.dev",
            "name": "Doctor User",
            "password": "doctor123",
            "role": UserRole.DOCTOR,
        },
    ]

    for data in users_data:
        existing = db.query(User).filter(User.email == data["email"]).first()
        if not existing:
            user = User(
                email=data["email"],
                name=data["name"],
                password_hash=get_password_hash(data["password"]),
                role=data["role"],
            )
            db.add(user)
            print(f"Created user: {data['email']} ({data['role'].value})")
        else:
            print(f"User already exists: {data['email']}")

    db.commit()


def seed_centers(db: Session):
    """Seed the 5 centers from requirements."""
    centers_data = [
        {
            "code": "J",
            "name": "Al Narjis Center",
            "name_ar": "مركز النرجس",
            "allowed_shifts": ["A", "B", "C", "D", "E", "N", "H", "S"],
        },
        {
            "code": "G",
            "name": "Al Ghadir Center",
            "name_ar": "مركز الغدير",
            "allowed_shifts": ["A", "B", "C", "D", "E", "N", "H", "S"],
        },
        {
            "code": "C",
            "name": "Digital City",
            "name_ar": None,
            "allowed_shifts": ["D", "N"],
        },
        {
            "code": "Q",
            "name": "Diplomatic Quarter",
            "name_ar": None,
            "allowed_shifts": ["D", "N"],
        },
        {
            "code": "K",
            "name": "Khaled International Airport",
            "name_ar": None,
            "allowed_shifts": ["KD", "KN"],
        },
    ]

    for data in centers_data:
        existing = db.query(Center).filter(Center.code == data["code"]).first()
        if not existing:
            center = Center(**data)
            db.add(center)
            print(f"Created center: {data['code']} - {data['name']}")
        else:
            print(f"Center already exists: {data['code']}")

    db.commit()


def seed_shifts(db: Session):
    """Seed all shift types from requirements."""
    shifts_data = [
        # 12-hour shifts
        {"code": "D", "name": "Day Shift (12h)", "shift_type": ShiftType.TWELVE_HOUR,
         "start_time": time(6, 0), "end_time": time(18, 0), "hours": 12, "is_overnight": False},
        {"code": "E", "name": "Evening Shift (12h)", "shift_type": ShiftType.TWELVE_HOUR,
         "start_time": time(10, 0), "end_time": time(22, 0), "hours": 12, "is_overnight": False},
        {"code": "N", "name": "Night Shift (12h)", "shift_type": ShiftType.TWELVE_HOUR,
         "start_time": time(18, 0), "end_time": time(6, 0), "hours": 12, "is_overnight": True},
        # 8-hour shifts
        {"code": "A", "name": "Morning Shift (8h)", "shift_type": ShiftType.EIGHT_HOUR,
         "start_time": time(6, 0), "end_time": time(14, 0), "hours": 8, "is_overnight": False},
        {"code": "B", "name": "Afternoon Shift (8h)", "shift_type": ShiftType.EIGHT_HOUR,
         "start_time": time(14, 0), "end_time": time(22, 0), "hours": 8, "is_overnight": False},
        {"code": "C", "name": "Night Shift (8h)", "shift_type": ShiftType.EIGHT_HOUR,
         "start_time": time(22, 0), "end_time": time(6, 0), "hours": 8, "is_overnight": True},
        # Optional shifts
        {"code": "H", "name": "Mid-day Shift (8h)", "shift_type": ShiftType.EIGHT_HOUR,
         "start_time": time(10, 0), "end_time": time(18, 0), "hours": 8, "is_overnight": False, "is_optional": True},
        {"code": "S", "name": "Evening-Night Shift (8h)", "shift_type": ShiftType.EIGHT_HOUR,
         "start_time": time(18, 0), "end_time": time(2, 0), "hours": 8, "is_overnight": True, "is_optional": True},
        # Airport shifts
        {"code": "KD", "name": "Airport Day Shift", "shift_type": ShiftType.TWELVE_HOUR,
         "start_time": time(7, 0), "end_time": time(19, 0), "hours": 12, "is_overnight": False},
        {"code": "KN", "name": "Airport Night Shift", "shift_type": ShiftType.TWELVE_HOUR,
         "start_time": time(19, 0), "end_time": time(7, 0), "hours": 12, "is_overnight": True},
    ]

    for data in shifts_data:
        existing = db.query(Shift).filter(Shift.code == data["code"]).first()
        if not existing:
            shift = Shift(**data)
            db.add(shift)
            print(f"Created shift: {data['code']} - {data['name']}")
        else:
            print(f"Shift already exists: {data['code']}")

    db.commit()


def seed_coverage_templates(db: Session):
    """Seed daily coverage requirements per center/shift."""
    # Get centers and shifts
    centers = {c.code: c for c in db.query(Center).all()}
    shifts = {s.code: s for s in db.query(Shift).all()}

    # Coverage requirements from requirements document
    coverage_data = [
        # J (Al Narjis) - 2A, 1B, 1C, 3D, 3E, 3N
        ("J", "A", 2), ("J", "B", 1), ("J", "C", 1),
        ("J", "D", 3), ("J", "E", 3), ("J", "N", 3),
        # G (Al Ghadir) - 1A, 1B, 1C, 3D, 2E, 2N
        ("G", "A", 1), ("G", "B", 1), ("G", "C", 1),
        ("G", "D", 3), ("G", "E", 2), ("G", "N", 2),
        # C (Digital City) - 1D, 1N
        ("C", "D", 1), ("C", "N", 1),
        # Q (Diplomatic Quarter) - 1D, 1N
        ("Q", "D", 1), ("Q", "N", 1),
        # K (Airport) - 1KD, 1KN
        ("K", "KD", 1), ("K", "KN", 1),
    ]

    for center_code, shift_code, min_doctors in coverage_data:
        center = centers.get(center_code)
        shift = shifts.get(shift_code)

        if not center or not shift:
            print(f"Skipping coverage: {center_code}-{shift_code} (missing data)")
            continue

        existing = (
            db.query(CoverageTemplate)
            .filter(
                CoverageTemplate.center_id == center.id,
                CoverageTemplate.shift_id == shift.id
            )
            .first()
        )

        if not existing:
            template = CoverageTemplate(
                center_id=center.id,
                shift_id=shift.id,
                min_doctors=min_doctors,
                is_mandatory=True,
            )
            db.add(template)
            print(f"Created coverage: {center_code}-{shift_code} = {min_doctors} doctors")
        else:
            print(f"Coverage already exists: {center_code}-{shift_code}")

    db.commit()


def seed_doctors(db: Session):
    """Seed doctor profiles for testing."""
    # First, create additional doctor users
    doctor_users = [
        {"email": "dr.ahmed@roster.dev", "name": "Dr. Ahmed Hassan", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.fatima@roster.dev", "name": "Dr. Fatima Al-Rashid", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.omar@roster.dev", "name": "Dr. Omar Khan", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.sarah@roster.dev", "name": "Dr. Sarah Johnson", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.ali@roster.dev", "name": "Dr. Ali Mohammed", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.layla@roster.dev", "name": "Dr. Layla Ibrahim", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.yusuf@roster.dev", "name": "Dr. Yusuf Nasser", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.maryam@roster.dev", "name": "Dr. Maryam Ahmed", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.khalid@roster.dev", "name": "Dr. Khalid Al-Farsi", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.nour@roster.dev", "name": "Dr. Nour Hassan", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.tariq@roster.dev", "name": "Dr. Tariq Rahman", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.amina@roster.dev", "name": "Dr. Amina Malik", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.hassan@roster.dev", "name": "Dr. Hassan Zayed", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.leena@roster.dev", "name": "Dr. Leena Qasim", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.rami@roster.dev", "name": "Dr. Rami Saleh", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.dina@roster.dev", "name": "Dr. Dina Mustafa", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.karim@roster.dev", "name": "Dr. Karim Abbas", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.hana@roster.dev", "name": "Dr. Hana Farouk", "password": "doctor123", "nationality": Nationality.SAUDI},
        {"email": "dr.zain@roster.dev", "name": "Dr. Zain Abdullah", "password": "doctor123", "nationality": Nationality.NON_SAUDI},
        {"email": "dr.maya@roster.dev", "name": "Dr. Maya Osman", "password": "doctor123", "nationality": Nationality.SAUDI},
    ]

    # Create users and doctors
    for i, data in enumerate(doctor_users):
        existing_user = db.query(User).filter(User.email == data["email"]).first()
        if not existing_user:
            user = User(
                email=data["email"],
                name=data["name"],
                password_hash=get_password_hash(data["password"]),
                role=UserRole.DOCTOR,
                nationality=data["nationality"],
            )
            db.add(user)
            db.flush()  # Get the user ID

            # Create doctor profile
            doctor = Doctor(
                user_id=user.id,
                employee_id=f"DR{1001 + i}",
                is_active=True,
            )
            db.add(doctor)
            print(f"Created doctor: {data['name']} ({data['nationality'].value})")
        else:
            # Check if doctor profile exists
            existing_doctor = db.query(Doctor).filter(Doctor.user_id == existing_user.id).first()
            if not existing_doctor:
                doctor = Doctor(
                    user_id=existing_user.id,
                    employee_id=f"DR{1001 + i}",
                    is_active=True,
                )
                db.add(doctor)
                print(f"Created doctor profile for: {existing_user.name}")
            else:
                print(f"Doctor already exists: {existing_user.name}")

    db.commit()


def main():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    print("\nSeeding database...")
    db = SessionLocal()
    try:
        seed_users(db)
        seed_centers(db)
        seed_shifts(db)
        seed_coverage_templates(db)
        seed_doctors(db)
        print("\nSeeding complete!")
        print("\nDefault login credentials:")
        print("  Admin: admin@roster.dev / admin123")
        print("  Team Lead: lead@roster.dev / lead123")
        print("  Doctors: dr.ahmed@roster.dev / doctor123 (and 19 others)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
