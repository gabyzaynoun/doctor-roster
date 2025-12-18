"""
Seed script to populate the database with demo data for testing.
"""
import sys
import os
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
from app.models import (
    User, Doctor, Center, Shift, Schedule, Assignment,
    SwapRequest, AvailabilityPreference, SpecificDatePreference,
    Notification, Announcement, CoverageTemplate
)
from app.models.shift import ShiftType
from app.models.schedule import ScheduleStatus
from app.models.notification import NotificationType, NotificationPriority
from app.core.security import get_password_hash

def seed_demo_data():
    """Populate database with comprehensive demo data."""
    db = SessionLocal()

    try:
        print("Creating demo data...")

        # Create admin user if not exists
        admin = db.query(User).filter(User.email == "admin@hospital.com").first()
        if not admin:
            admin = User(
                email="admin@hospital.com",
                name="Dr. Admin User",
                password_hash=get_password_hash("admin123"),
                role="admin",
                nationality="saudi",
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("Created admin user: admin@hospital.com / admin123")

        # Sample doctor names
        doctor_names = [
            ("Dr. Ahmad Al-Rashid", "saudi"),
            ("Dr. Sarah Mitchell", "non_saudi"),
            ("Dr. Mohammed Hassan", "saudi"),
            ("Dr. Emily Chen", "non_saudi"),
            ("Dr. Fatima Al-Said", "saudi"),
            ("Dr. James Wilson", "non_saudi"),
            ("Dr. Nora Abdullah", "saudi"),
            ("Dr. David Park", "non_saudi"),
            ("Dr. Layla Mansour", "saudi"),
            ("Dr. Michael Brown", "non_saudi"),
            ("Dr. Reem Al-Qahtani", "saudi"),
            ("Dr. Jennifer Lee", "non_saudi"),
        ]

        # Create doctors
        doctors = []
        for i, (name, nationality) in enumerate(doctor_names):
            email = name.lower().replace("dr. ", "").replace(" ", ".") + "@hospital.com"
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    name=name,
                    password_hash=get_password_hash("doctor123"),
                    role="doctor",
                    nationality=nationality,
                    is_active=True
                )
                db.add(user)
                db.flush()

                doctor = Doctor(
                    user_id=user.id,
                    employee_id=f"EMP{1001 + i}",
                    specialty="Emergency Medicine",
                    is_pediatrics_certified=random.choice([True, False]),
                    can_work_nights=random.choice([True, True, True, False]),  # 75% can work nights
                    is_active=True
                )
                db.add(doctor)
                doctors.append(doctor)
            else:
                doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
                if doctor:
                    doctors.append(doctor)

        db.commit()
        print(f"Created {len(doctors)} doctors")

        # Create centers
        center_data = [
            ("ER1", "Emergency Room A"),
            ("ER2", "Emergency Room B"),
            ("ICU1", "Intensive Care Unit"),
            ("PED", "Pediatrics Emergency"),
            ("URG", "Urgent Care"),
        ]

        centers = []
        for code, name in center_data:
            center = db.query(Center).filter(Center.code == code).first()
            if not center:
                center = Center(
                    code=code,
                    name=name,
                    is_active=True
                )
                db.add(center)
                centers.append(center)
            else:
                centers.append(center)

        db.commit()
        print(f"Created {len(centers)} centers")

        # Create shifts
        from datetime import time as time_obj
        shift_data = [
            ("AM", "Morning", ShiftType.EIGHT_HOUR, time_obj(7, 0), time_obj(15, 0), 8, False, False),
            ("PM", "Afternoon", ShiftType.EIGHT_HOUR, time_obj(15, 0), time_obj(23, 0), 8, False, False),
            ("N", "Night", ShiftType.EIGHT_HOUR, time_obj(23, 0), time_obj(7, 0), 8, True, False),
            ("ON", "On Call", ShiftType.TWELVE_HOUR, time_obj(16, 0), time_obj(8, 0), 16, True, True),
        ]

        shifts = []
        for code, name, shift_type, start, end, hours, overnight, optional in shift_data:
            shift = db.query(Shift).filter(Shift.code == code).first()
            if not shift:
                shift = Shift(
                    code=code,
                    name=name,
                    shift_type=shift_type,
                    start_time=start,
                    end_time=end,
                    hours=hours,
                    is_overnight=overnight,
                    is_optional=optional
                )
                db.add(shift)
                shifts.append(shift)
            else:
                shifts.append(shift)

        db.commit()
        print(f"Created {len(shifts)} shifts")

        # Create coverage templates
        for center in centers[:3]:  # Main centers
            for shift in shifts[:3]:  # Regular shifts
                template = db.query(CoverageTemplate).filter(
                    CoverageTemplate.center_id == center.id,
                    CoverageTemplate.shift_id == shift.id
                ).first()
                if not template:
                    template = CoverageTemplate(
                        center_id=center.id,
                        shift_id=shift.id,
                        min_doctors=2 if shift.code == "N" else 3,
                        is_mandatory=True
                    )
                    db.add(template)

        db.commit()
        print("Created coverage templates")

        # Create current month schedule
        today = datetime.now()
        current_year = today.year
        current_month = today.month

        schedule = db.query(Schedule).filter(
            Schedule.year == current_year,
            Schedule.month == current_month
        ).first()

        if not schedule:
            schedule = Schedule(
                year=current_year,
                month=current_month,
                status=ScheduleStatus.PUBLISHED,
                published_at=datetime.now(),
                published_by_id=admin.id
            )
            db.add(schedule)
            db.commit()
            print(f"Created schedule for {current_month}/{current_year}")

        # Get all doctors for assignment
        all_doctors = db.query(Doctor).filter(Doctor.is_active == True).all()

        # Create assignments for the current month
        if schedule and all_doctors and centers and shifts:
            # Delete existing assignments for this schedule
            db.query(Assignment).filter(Assignment.schedule_id == schedule.id).delete()
            db.commit()

            # Get days in the month
            if current_month == 12:
                next_month = datetime(current_year + 1, 1, 1)
            else:
                next_month = datetime(current_year, current_month + 1, 1)

            days_in_month = (next_month - datetime(current_year, current_month, 1)).days

            assignments_created = 0
            regular_shifts = [s for s in shifts if s.code in ['AM', 'PM', 'N']]

            for day in range(1, days_in_month + 1):
                date = datetime(current_year, current_month, day).date()
                doctors_assigned_today = set()  # Track doctors assigned today

                # Assign doctors to each center and shift
                for center in centers[:3]:  # Main centers
                    for shift in regular_shifts:
                        # Assign 1-2 doctors per shift
                        num_doctors = 1 if shift.code == "N" else random.randint(1, 2)
                        available_doctors = [d for d in all_doctors if d.id not in doctors_assigned_today]
                        random.shuffle(available_doctors)

                        for doc in available_doctors[:num_doctors]:
                            assignment = Assignment(
                                schedule_id=schedule.id,
                                doctor_id=doc.id,
                                center_id=center.id,
                                shift_id=shift.id,
                                date=date
                            )
                            db.add(assignment)
                            doctors_assigned_today.add(doc.id)
                            assignments_created += 1

            db.commit()
            print(f"Created {assignments_created} assignments")

        # Create swap requests
        if all_doctors and schedule:
            # Get some assignments for swap requests
            assignments = db.query(Assignment).filter(
                Assignment.schedule_id == schedule.id,
                Assignment.date >= today.date()
            ).limit(20).all()

            swap_count = 0
            for i, assignment in enumerate(assignments[:5]):
                # Find another assignment to swap with
                other_assignments = [a for a in assignments if a.id != assignment.id and a.doctor_id != assignment.doctor_id]
                if other_assignments:
                    target = random.choice(other_assignments)

                    swap = SwapRequest(
                        requester_id=assignment.doctor_id,
                        target_id=target.doctor_id,
                        requester_assignment_id=assignment.id,
                        target_assignment_id=target.id,
                        request_type="swap",
                        status="pending" if i < 3 else random.choice(["accepted", "declined"]),
                        message="Would you be able to swap shifts? Thanks!" if i % 2 == 0 else None,
                        created_at=datetime.now() - timedelta(hours=random.randint(1, 72))
                    )
                    db.add(swap)
                    swap_count += 1

            # Create some giveaway requests (open shifts)
            for assignment in assignments[5:8]:
                swap = SwapRequest(
                    requester_id=assignment.doctor_id,
                    target_id=None,
                    requester_assignment_id=assignment.id,
                    target_assignment_id=None,
                    request_type="giveaway",
                    status="pending",
                    message="Unable to work this shift - please pick up if available!",
                    created_at=datetime.now() - timedelta(hours=random.randint(1, 48))
                )
                db.add(swap)
                swap_count += 1

            db.commit()
            print(f"Created {swap_count} swap requests")

        # Create notifications
        if all_doctors:
            notification_types = [
                (NotificationType.SCHEDULE_PUBLISHED, "Schedule Published", "The schedule for this month has been published. Check your assignments!"),
                (NotificationType.SWAP_REQUEST_RECEIVED, "New Swap Request", "You have received a new shift swap request."),
                (NotificationType.SHIFT_ASSIGNED, "Shift Assignment", "You have been assigned to a new shift."),
                (NotificationType.ANNOUNCEMENT, "Hospital Announcement", "Please review the updated scheduling policies."),
            ]

            notif_count = 0
            for doctor in all_doctors[:5]:
                for notif_type, title, message in notification_types:
                    notif = Notification(
                        user_id=doctor.user_id,
                        type=notif_type,
                        title=title,
                        message=message,
                        priority=NotificationPriority.NORMAL if notif_type != NotificationType.ANNOUNCEMENT else NotificationPriority.HIGH,
                        is_read=random.choice([True, False]),
                        created_at=datetime.now() - timedelta(hours=random.randint(1, 168))
                    )
                    db.add(notif)
                    notif_count += 1

            db.commit()
            print(f"Created {notif_count} notifications")

        # Create availability preferences
        if all_doctors:
            pref_count = 0
            for doctor in all_doctors[:6]:
                # Weekly preferences
                for day in range(7):
                    pref = AvailabilityPreference(
                        doctor_id=doctor.id,
                        day_of_week=day,
                        preference=random.choice(["preferred", "preferred", "neutral", "neutral", "avoid"])
                    )
                    db.add(pref)
                    pref_count += 1

                # Specific date preferences
                for _ in range(random.randint(1, 3)):
                    future_date = today + timedelta(days=random.randint(5, 25))
                    specific = SpecificDatePreference(
                        doctor_id=doctor.id,
                        date=future_date.date(),
                        preference=random.choice(["unavailable", "avoid"]),
                        reason=random.choice(["Personal appointment", "Family event", "Medical appointment", None])
                    )
                    db.add(specific)
                    pref_count += 1

            db.commit()
            print(f"Created {pref_count} availability preferences")

        # Create an announcement
        announcement = Announcement(
            title="Welcome to the Doctor Roster System",
            message="This system helps manage shift schedules, swap requests, and availability preferences. Please explore the features and let us know if you have any questions!",
            priority=NotificationPriority.NORMAL,
            is_active=True,
            created_by_id=admin.id,
            expires_at=datetime.now() + timedelta(days=30)
        )
        db.add(announcement)
        db.commit()
        print("Created announcement")

        print("\n" + "="*50)
        print("Demo data seeded successfully!")
        print("="*50)
        print("\nLogin credentials:")
        print("  Admin: admin@hospital.com / admin123")
        print("  Doctors: [firstname].[lastname]@hospital.com / doctor123")
        print("    Example: ahmad.al-rashid@hospital.com / doctor123")
        print("="*50)

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
