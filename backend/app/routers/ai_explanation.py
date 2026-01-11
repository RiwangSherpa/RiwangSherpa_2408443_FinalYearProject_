from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.ai_service import ai_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/explain", response_model=schemas.AIExplanationResponse)
async def explain_step(
    request: schemas.AIExplanationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    step = db.query(models.RoadmapStep).filter(
        models.RoadmapStep.id == request.roadmap_step_id
    ).first()

    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    goal = db.query(models.Goal).filter(
        models.Goal.id == step.goal_id,
        models.Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if step.ai_explanation and not request.question:
        return schemas.AIExplanationResponse(
            explanation=step.ai_explanation,
            confidence_score=0.9,
            prompt_used=None
        )

    try:
        explanation = await ai_service.explain_step(
            step_title=step.title,
            step_description=step.description or "",
            question=request.question
        )

        if not request.question and not step.ai_explanation:
            step.ai_explanation = explanation
            db.commit()

        return schemas.AIExplanationResponse(
            explanation=explanation,
            confidence_score=0.85,
            prompt_used=None
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate explanation"
        )
