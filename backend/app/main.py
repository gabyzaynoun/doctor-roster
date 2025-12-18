from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import api_router

settings = get_settings()

app = FastAPI(
    title="Doctor Roster Scheduling System",
    description="API for managing doctor schedules across multiple centers",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
