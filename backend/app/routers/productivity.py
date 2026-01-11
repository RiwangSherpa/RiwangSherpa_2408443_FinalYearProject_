"""
Productivity API router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/sessions", response_model=schemas.ProductivitySessionResponse)
async def create_session(
    session: schemas.ProductivitySessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Start a productivity session"""
    try:
        db_session = models.ProductivitySession(**session.model_dump(), user_id=current_user.id)
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.patch("/sessions/{session_id}/complete")
async def complete_session(
    session_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark a session as completed"""
    db_session = db.query(models.ProductivitySession).filter(
        models.ProductivitySession.id == session_id,
        models.ProductivitySession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        db_session.was_completed = True
        db_session.completed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_session)
        return db_session
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete session: {str(e)}")

@router.get("/sessions", response_model=List[schemas.ProductivitySessionResponse])
async def get_sessions(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get productivity sessions"""
    sessions = db.query(models.ProductivitySession).filter(
        models.ProductivitySession.user_id == current_user.id
    ).offset(skip).limit(limit).order_by(
        models.ProductivitySession.started_at.desc()
    ).all()
    return sessions

@router.get("/tips")
async def get_productivity_tips():
    """Get AI-generated productivity tips"""
    # This would typically call AI service, but for now return static tips
    tips = [
        "Take regular breaks to maintain focus",
        "Use the Pomodoro technique: 25 minutes work, 5 minutes break",
        "Set specific, achievable goals for each study session",
        "Eliminate distractions during focus time",
        "Review your progress regularly to stay motivated"
    ]
    return {"tips": tips}

