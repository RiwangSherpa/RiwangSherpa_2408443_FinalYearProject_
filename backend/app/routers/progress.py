"""
Progress tracking API router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.ProgressResponse)
async def create_progress(
    progress: schemas.ProgressCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Record progress"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == progress.goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        db_progress = models.Progress(**progress.model_dump())
        db.add(db_progress)
        db.commit()
        db.refresh(db_progress)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create progress: {str(e)}")
    
    # Update study streak (user-specific)
    today = datetime.utcnow().date()
    streak = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == current_user.id,
        func.date(models.StudyStreak.date) == today
    ).first()
    
    if not streak:
        streak = models.StudyStreak(
            user_id=current_user.id,
            date=datetime.utcnow(),
            study_time_minutes=progress.time_spent_minutes,
            goals_worked_on=[progress.goal_id]
        )
        db.add(streak)
    else:
        streak.study_time_minutes += progress.time_spent_minutes
        if progress.goal_id not in (streak.goals_worked_on or []):
            streak.goals_worked_on = (streak.goals_worked_on or []) + [progress.goal_id]
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update streak: {str(e)}")
    
    return db_progress

@router.get("/goal/{goal_id}", response_model=List[schemas.ProgressResponse])
async def get_progress(
    goal_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get progress records for a goal"""
    # Verify goal belongs to user
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    progress_records = db.query(models.Progress).filter(
        models.Progress.goal_id == goal_id
    ).order_by(models.Progress.date.desc()).all()
    
    return progress_records

@router.get("/analytics", response_model=schemas.AnalyticsResponse)
async def get_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get comprehensive analytics"""
    # Total study time from StudyStreak records (user-specific)
    total_time = db.query(func.sum(models.StudyStreak.study_time_minutes)).filter(
        models.StudyStreak.user_id == current_user.id
    ).scalar() or 0.0
    
    # Goals stats (user-specific)
    total_goals = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).count()
    completed_goals = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id,
        models.Goal.is_completed == True
    ).count()
    
    # Streak calculation (user-specific) - use StudyStreak dates
    streaks = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == current_user.id
    ).order_by(models.StudyStreak.date.desc()).all()
    
    current_streak = 0
    if streaks:
        today = datetime.utcnow().date()
        current_date = today
        for streak in streaks:
            streak_date = streak.date.date() if isinstance(streak.date, datetime) else streak.date
            if streak_date == current_date:
                current_streak += 1
                current_date -= timedelta(days=1)
            else:
                break
    
    # Quiz scores (user-specific)
    user_goal_ids = [g.id for g in db.query(models.Goal.id).filter(models.Goal.user_id == current_user.id).all()]
    quiz_results = db.query(models.QuizResult).filter(
        models.QuizResult.goal_id.in_(user_goal_ids)
    ).all() if user_goal_ids else []
    
    if quiz_results:
        avg_score = sum(r.score for r in quiz_results) / len(quiz_results)
    else:
        avg_score = 0.0
    
    # Weak and strong topics
    topic_scores = {}
    for result in quiz_results:
        topic = result.topic
        if topic not in topic_scores:
            topic_scores[topic] = []
        topic_scores[topic].append(result.score)
    
    weak_topics = [
        topic for topic, scores in topic_scores.items()
        if sum(scores) / len(scores) < 60
    ]
    strong_topics = [
        topic for topic, scores in topic_scores.items()
        if sum(scores) / len(scores) >= 80
    ]
    
    return schemas.AnalyticsResponse(
        total_study_time_minutes=float(total_time),
        total_goals=total_goals,
        completed_goals=completed_goals,
        current_streak_days=current_streak,
        average_quiz_score=avg_score,
        weak_topics=weak_topics[:5],  # Top 5
        strong_topics=strong_topics[:5]  # Top 5
    )

@router.get("/streak")
async def get_streak(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current study streak"""
    streaks = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == current_user.id
    ).order_by(models.StudyStreak.date.desc()).all()
    
    current_streak = 0
    if streaks:
        today = datetime.utcnow().date()
        current_date = today
        for streak in streaks:
            streak_date = streak.date.date() if isinstance(streak.date, datetime) else streak.date
            if streak_date == current_date:
                current_streak += 1
                current_date -= timedelta(days=1)
            else:
                break
    
    return {"current_streak_days": current_streak}


@router.post("/session")
async def record_session(
    session_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Record a user session (login/study time)"""
    today = datetime.utcnow().date()
    minutes = session_data.get("minutes", 0)
    
    # Update or create streak record for today
    streak = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == current_user.id,
        func.date(models.StudyStreak.date) == today
    ).first()
    
    if not streak:
        streak = models.StudyStreak(
            user_id=current_user.id,
            date=datetime.utcnow(),
            study_time_minutes=minutes,
            goals_worked_on=[]
        )
        db.add(streak)
    else:
        streak.study_time_minutes += minutes
    
    db.commit()
    
    return {"success": True, "message": "Session recorded", "minutes_added": minutes}


@router.post("/track-time")
async def track_study_time(
    time_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Track active study time in the app"""
    minutes = time_data.get("minutes", 0)
    today = datetime.utcnow().date()
    
    # Update today's streak record with study time
    streak = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == current_user.id,
        func.date(models.StudyStreak.date) == today
    ).first()
    
    if not streak:
        streak = models.StudyStreak(
            user_id=current_user.id,
            date=datetime.utcnow(),
            study_time_minutes=minutes,
            goals_worked_on=[]
        )
        db.add(streak)
    else:
        streak.study_time_minutes += minutes
    
    db.commit()
    db.refresh(streak)
    
    return {
        "success": True, 
        "total_minutes_today": streak.study_time_minutes,
        "minutes_added": minutes
    }


@router.get("/study-history")
async def get_study_history(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get study time history for the last N days"""
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days)
    
    # Get all streak records for the user in the date range
    streaks = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == current_user.id,
        func.date(models.StudyStreak.date) >= start_date,
        func.date(models.StudyStreak.date) <= today
    ).all()
    
    # Create a map of date to study time
    streak_map = {}
    for streak in streaks:
        date_str = streak.date.date().isoformat() if isinstance(streak.date, datetime) else str(streak.date)
        streak_map[date_str] = streak.study_time_minutes
    
    # Build the full history including days with no study time
    history = []
    for i in range(days):
        date = today - timedelta(days=(days - 1 - i))
        date_str = date.isoformat()
        history.append({
            "date": date_str,
            "minutes": streak_map.get(date_str, 0),
            "day": date.strftime("%a")
        })
    
    return {"history": history}


@router.get("/streak-history")
async def get_streak_history(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get streak history for the last N days"""
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days)
    
    # Get all streak records for the user in the date range
    streaks = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == current_user.id,
        func.date(models.StudyStreak.date) >= start_date,
        func.date(models.StudyStreak.date) <= today
    ).all()
    
    # Create a map of date to study time
    streak_map = {}
    for streak in streaks:
        date_str = streak.date.date().isoformat() if isinstance(streak.date, datetime) else str(streak.date)
        streak_map[date_str] = streak.study_time_minutes
    
    # Calculate cumulative streak
    history = []
    current_streak = 0
    
    # First pass: determine which days were studied
    studied_days = set()
    for i in range(days):
        date = today - timedelta(days=(days - 1 - i))
        date_str = date.isoformat()
        if date_str in streak_map and streak_map[date_str] > 0:
            studied_days.add(date_str)
    
    # Second pass: build streak history
    for i in range(days):
        date = today - timedelta(days=(days - 1 - i))
        date_str = date.isoformat()
        studied = date_str in studied_days
        
        if studied:
            current_streak += 1
        else:
            current_streak = 0
        
        history.append({
            "date": date_str,
            "streakDays": current_streak,
            "day": date.strftime("%a"),
            "studied": studied
        })
    
    return {"history": history}
