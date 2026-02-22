"""
Goals API router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user
from app.services.gamification import GamificationService

router = APIRouter()

@router.post("/", response_model=schemas.GoalResponse)
async def create_goal(
    goal: schemas.GoalCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new learning goal"""
    try:
        db_goal = models.Goal(**goal.model_dump(), user_id=current_user.id)
        db.add(db_goal)
        db.commit()
        db.refresh(db_goal)
        return db_goal
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create goal: {str(e)}")

@router.get("/", response_model=List[schemas.GoalResponse])
async def get_goals(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all goals for current user"""
    goals = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return goals

@router.get("/{goal_id}", response_model=schemas.GoalResponse)
async def get_goal(
    goal_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific goal"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.put("/{goal_id}", response_model=schemas.GoalResponse)
async def update_goal(
    goal_id: int, 
    goal_update: schemas.GoalCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a goal"""
    db_goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        for key, value in goal_update.model_dump().items():
            setattr(db_goal, key, value)
        
        db.commit()
        db.refresh(db_goal)
        return db_goal
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update goal: {str(e)}")

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a goal"""
    db_goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        db.delete(db_goal)
        db.commit()
        return {"message": "Goal deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete goal: {str(e)}")

@router.patch("/{goal_id}/complete")
async def complete_goal(
    goal_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark a goal as completed and trigger achievements"""
    db_goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        db_goal.is_completed = True
        db.commit()
        db.refresh(db_goal)
        
        # Update gamification stats and check achievements
        gamification_service = GamificationService(db)
        
        # Get level before
        old_level = gamification_service.get_level_progress(current_user.id)["current_level"]
        
        # Update goal completed stats
        gamification_service.update_stats_from_activity(current_user.id, "goal_completed")
        
        # Check for new achievements
        new_achievements = gamification_service.check_and_award_achievements(current_user.id)
        
        # Check for level up
        new_level_progress = gamification_service.get_level_progress(current_user.id)
        level_up_info = None
        if new_level_progress["current_level"] > old_level:
            level_up_info = {
                "old_level": old_level,
                "new_level": new_level_progress["current_level"]
            }
        
        return {
            "goal": db_goal,
            "new_achievements": new_achievements,
            "level_up": level_up_info
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete goal: {str(e)}")

