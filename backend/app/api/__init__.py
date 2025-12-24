from fastapi import APIRouter
from app.api import (
    auth,
    users,
    centers,
    shifts,
    doctors,
    schedules,
    assignments,
    leaves,
    audit,
    coverage_templates,
    swap_requests,
    notifications,
    availability,
    schedule_templates,
    marketplace,
    fairness,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(centers.router, prefix="/centers", tags=["centers"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
api_router.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(assignments.router, prefix="/assignments", tags=["assignments"])
api_router.include_router(leaves.router, prefix="/leaves", tags=["leaves"])
api_router.include_router(audit.router)
api_router.include_router(coverage_templates.router, prefix="/coverage-templates", tags=["coverage-templates"])
api_router.include_router(swap_requests.router, prefix="/swaps", tags=["swaps"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(availability.router, prefix="/availability", tags=["availability"])
api_router.include_router(schedule_templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(fairness.router, prefix="/fairness", tags=["fairness"])
