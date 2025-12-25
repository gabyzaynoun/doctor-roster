from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import SessionLocal, engine, Base
from app.api import api_router

settings = get_settings()


def init_database():
    """Initialize database tables and seed data if empty."""
    from app.models.user import User
    from app.models.center import Center
    from app.models.shift import Shift

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Check if database needs seeding
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        center_count = db.query(Center).count()
        shift_count = db.query(Shift).count()

        if user_count == 0 or center_count == 0 or shift_count == 0:
            print("Database is empty, running seed script...")
            from app.scripts.seed_data import (
                seed_users, seed_centers, seed_shifts,
                seed_coverage_templates, seed_doctors
            )
            seed_users(db)
            seed_centers(db)
            seed_shifts(db)
            seed_coverage_templates(db)
            seed_doctors(db)
            print("Database seeding complete!")
        else:
            print(f"Database already has data: {user_count} users, {center_count} centers, {shift_count} shifts")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - runs on startup and shutdown."""
    # Startup
    print("Starting Doctor Roster API...")
    init_database()
    yield
    # Shutdown
    print("Shutting down Doctor Roster API...")


app = FastAPI(
    title="Doctor Roster Scheduling System",
    description="API for managing doctor schedules across multiple centers",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "doctor-roster-api"}
