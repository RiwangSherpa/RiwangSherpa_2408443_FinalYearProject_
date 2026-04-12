"""
Roadmaps API router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.services.ai_service import ai_service
from app.routers.auth import get_current_user
from app.services.gamification import GamificationService

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
        ai_result = await ai_service.generate_roadmap(
            goal_title=goal.title,
            goal_description=goal.description or "",
            learning_style=goal.learning_style,
            num_steps=request.num_steps
        )
        
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
        
        for step in steps:
            db.refresh(step)
        
        return schemas.RoadmapGenerateResponse(
            success=True,
            steps=[schemas.RoadmapStepResponse.model_validate(step) for step in steps],
            confidence_score=ai_result.get("confidence_score", 0.85),
            prompt_used=None
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
    
    goal = db.query(models.Goal).filter(
        models.Goal.id == step.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        step.is_completed = True
        step.completed_at = datetime.utcnow()
        
        progress = models.Progress(
            goal_id=goal.id,
            date=datetime.utcnow().date(),
            time_spent_minutes=15,
            steps_completed=1
        )
        db.add(progress)
        
        gamification_service = GamificationService(db)
        gamification_service.update_stats_from_activity(current_user.id, "roadmap_step")
        
        new_achievements = gamification_service.check_and_award_achievements(current_user.id)
        level_up_info = None
        
        old_level = gamification_service.get_level_progress(current_user.id)["current_level"]
        
        all_steps = db.query(models.RoadmapStep).filter(
            models.RoadmapStep.goal_id == goal.id
        ).all()
        
        goal_completed = False
        if all_steps and all(step_item.is_completed for step_item in all_steps):
            goal.is_completed = True
            goal.updated_at = datetime.utcnow()
            goal_completed = True
            
            goal_progress = models.Progress(
                goal_id=goal.id,
                date=datetime.utcnow().date(),
                time_spent_minutes=30,
                steps_completed=len(all_steps)
            )
            db.add(goal_progress)
            
            gamification_service.update_stats_from_activity(current_user.id, "goal_completed")
            
            additional_achievements = gamification_service.check_and_award_achievements(current_user.id)
            new_achievements.extend(additional_achievements)
            
            new_level_progress = gamification_service.get_level_progress(current_user.id)
            new_level = new_level_progress["current_level"]
            
            if new_level > old_level:
                level_up_info = {
                    "old_level": old_level,
                    "new_level": new_level
                }
        
        db.commit()
        
        db.refresh(step)
        return {
            "step": step,
            "goal_completed": goal_completed,
            "new_achievements": new_achievements,
            "level_up": level_up_info
        }
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


@router.get("/my-roadmaps", response_model=List[schemas.RoadmapStepResponse])
async def get_my_roadmaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all roadmap steps for current user across all goals"""
    steps = db.query(models.RoadmapStep).join(
        models.Goal, models.RoadmapStep.goal_id == models.Goal.id
    ).filter(
        models.Goal.user_id == current_user.id
    ).order_by(models.Goal.created_at.desc(), models.RoadmapStep.step_number).all()
    
    return steps


@router.delete("/goal/{goal_id}")
async def delete_roadmap(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete all roadmap steps for a goal"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        steps = db.query(models.RoadmapStep).filter(models.RoadmapStep.goal_id == goal_id).all()
        for step in steps:
            db.delete(step)
        db.commit()
        return {"message": "Roadmap deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete roadmap: {str(e)}")

