"""
Predictive Analytics API Router
Learning velocity, completion forecasting, and insights
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.routers.auth import get_current_user
from app.services.predictive_analytics import LearningVelocityTracker

router = APIRouter(prefix="/api/predictions", tags=["predictive-analytics"])


@router.get("/velocity")
async def get_study_velocity(
    days: int = 14,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get study velocity (hours per day) over time"""
    service = LearningVelocityTracker(db)
    velocity = service.calculate_study_velocity(current_user.id, days)
    
    return velocity


@router.get("/goal/{goal_id}")
async def predict_goal_completion(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Predict when a goal will be completed"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    service = LearningVelocityTracker(db)
    prediction = service.predict_goal_completion(goal_id)
    
    return prediction


@router.get("/at-risk-goals")
async def get_at_risk_goals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get goals that are at risk of not being completed on time"""
    service = LearningVelocityTracker(db)
    at_risk = service.identify_at_risk_goals(current_user.id)
    
    return {
        "at_risk_count": len(at_risk),
        "at_risk_goals": at_risk
    }


@router.get("/optimal-study-times")
async def get_optimal_study_times(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get optimal study times based on past performance"""
    service = LearningVelocityTracker(db)
    optimal_times = service.get_optimal_study_times(current_user.id)
    
    return optimal_times


@router.get("/learning-efficiency")
async def get_learning_efficiency(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get learning efficiency metrics"""
    service = LearningVelocityTracker(db)
    efficiency = service.calculate_learning_efficiency(current_user.id)
    
    return efficiency


@router.get("/dashboard")
async def get_predictions_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get comprehensive predictive analytics dashboard"""
    service = LearningVelocityTracker(db)
    dashboard = service.get_comprehensive_dashboard(current_user.id)
    
    return dashboard


@router.get("/all-goals")
async def get_all_goal_predictions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get predictions for all active goals"""
    service = LearningVelocityTracker(db)
    
    # Get all active goals
    goals = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id,
        models.Goal.is_completed == False
    ).all()
    
    predictions = []
    for goal in goals:
        prediction = service.predict_goal_completion(goal.id)
        predictions.append({
            "goal_id": goal.id,
            "title": goal.title,
            "prediction": prediction
        })
    
    return {
        "active_goals_count": len(predictions),
        "predictions": predictions
    }
