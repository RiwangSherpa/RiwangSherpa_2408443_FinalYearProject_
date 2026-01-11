"""
Roadmaps API router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.services.ai_service import ai_service
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/generate", response_model=schemas.RoadmapGenerateResponse)
async def generate_roadmap(
    request: schemas.RoadmapGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate a study roadmap using AI"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == request.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        # Call AI service
        ai_result = await ai_service.generate_roadmap(
            goal_title=goal.title,
            goal_description=goal.description or "",
            learning_style=goal.learning_style,
            num_steps=request.num_steps
        )
        
        # Save roadmap steps to database
        steps = []
        for step_data in ai_result["steps"]:
            db_step = models.RoadmapStep(
                goal_id=goal.id,
                step_number=step_data["step_number"],
                title=step_data["title"],
                description=step_data["description"],
                estimated_hours=step_data.get("estimated_hours", 0.0),
                ai_explanation=step_data.get("ai_explanation")
            )
            db.add(db_step)
            steps.append(db_step)
        
        db.commit()
        
        # Refresh to get IDs
        for step in steps:
            db.refresh(step)
        
        return schemas.RoadmapGenerateResponse(
            success=True,
            steps=[schemas.RoadmapStepResponse.model_validate(step) for step in steps],
            confidence_score=ai_result.get("confidence_score", 0.85),
            prompt_used=None  # Could store actual prompt for transparency
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate roadmap: {str(e)}")

@router.get("/goal/{goal_id}", response_model=List[schemas.RoadmapStepResponse])
async def get_roadmap(
    goal_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get roadmap steps for a goal"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    steps = db.query(models.RoadmapStep).filter(
        models.RoadmapStep.goal_id == goal_id
    ).order_by(models.RoadmapStep.step_number).all()
    
    return steps

@router.patch("/steps/{step_id}/complete")
async def complete_step(
    step_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark a roadmap step as completed"""
    step = db.query(models.RoadmapStep).filter(models.RoadmapStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == step.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        step.is_completed = True
        from datetime import datetime
        step.completed_at = datetime.utcnow()
        
        # Check if all steps are completed, then mark goal as completed
        all_steps = db.query(models.RoadmapStep).filter(
            models.RoadmapStep.goal_id == goal.id
        ).all()
        
        if all_steps and all(step_item.is_completed for step_item in all_steps):
            goal.is_completed = True
            goal.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(step)
        return step
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update step: {str(e)}")

@router.patch("/steps/{step_id}/uncomplete")
async def uncomplete_step(
    step_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark a roadmap step as not completed"""
    step = db.query(models.RoadmapStep).filter(models.RoadmapStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == step.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        step.is_completed = False
        step.completed_at = None
        
        db.commit()
        db.refresh(step)
        return step
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update step: {str(e)}")

