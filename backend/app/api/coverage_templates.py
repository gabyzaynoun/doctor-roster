from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, get_admin_user
from app.models.coverage_template import CoverageTemplate
from app.models.center import Center
from app.models.shift import Shift
from app.models.user import User
from app.schemas.coverage_template import (
    CoverageTemplateCreate,
    CoverageTemplateUpdate,
    CoverageTemplateResponse,
)

router = APIRouter()


@router.get("/", response_model=list[CoverageTemplateResponse])
def list_coverage_templates(
    center_id: int | None = None,
    shift_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CoverageTemplate)
    if center_id:
        query = query.filter(CoverageTemplate.center_id == center_id)
    if shift_id:
        query = query.filter(CoverageTemplate.shift_id == shift_id)
    return query.all()


@router.post("/", response_model=CoverageTemplateResponse, status_code=201)
def create_coverage_template(
    template: CoverageTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    # Verify center exists
    center = db.query(Center).filter(Center.id == template.center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")

    # Verify shift exists
    shift = db.query(Shift).filter(Shift.id == template.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    # Check for duplicate
    existing = (
        db.query(CoverageTemplate)
        .filter(
            CoverageTemplate.center_id == template.center_id,
            CoverageTemplate.shift_id == template.shift_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Coverage template already exists for this center and shift",
        )

    db_template = CoverageTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.get("/{template_id}", response_model=CoverageTemplateResponse)
def get_coverage_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = (
        db.query(CoverageTemplate).filter(CoverageTemplate.id == template_id).first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Coverage template not found")
    return template


@router.patch("/{template_id}", response_model=CoverageTemplateResponse)
def update_coverage_template(
    template_id: int,
    template_update: CoverageTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    template = (
        db.query(CoverageTemplate).filter(CoverageTemplate.id == template_id).first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Coverage template not found")

    update_data = template_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_coverage_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    template = (
        db.query(CoverageTemplate).filter(CoverageTemplate.id == template_id).first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Coverage template not found")
    db.delete(template)
    db.commit()
