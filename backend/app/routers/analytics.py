"""
Analytics API router for profile dashboard
Provides comprehensive learning analytics for authenticated users
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, extract
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any, Optional

from pydantic import BaseModel
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_user
from app.services.gamification import GamificationService

logger = logging.getLogger(__name__)

router = APIRouter()

# -------------------------------------------------
# Analytics Schemas
# -------------------------------------------------

class StudyTimeData(BaseModel):
    date: str
    minutes: float

class StreakData(BaseModel):
    current_streak: int
    longest_streak: int

class GoalProgressData(BaseModel):
    goal_id: int
    title: str
    description: Optional[str] = None
    learning_style: Optional[str] = None
    completion_percentage: float
    is_completed: bool
    status: str
    target_date: Optional[datetime]

class RoadmapProgressData(BaseModel):
    total_steps: int
    completed_steps: int
    estimated_hours: float
    actual_study_hours: float
    completion_percentage: float
    steps_timeline: List[Dict[str, Any]]

class QuizAnalyticsData(BaseModel):
    total_quizzes: int
    average_score: float
    best_score: float
    worst_score: float
    score_history: List[Dict[str, Any]]
    topic_performance: List[Dict[str, Any]]

class StrengthsWeaknessesData(BaseModel):
    strong_topics: List[Dict[str, Any]]
    weak_topics: List[Dict[str, Any]]
    suggestions: List[str]

class ActivityData(BaseModel):
    id: str
    type: str  # 'goal_completed', 'goal_progress', 'quiz_attempt', 'level_up', 'study_session'
    title: str
    description: str
    timestamp: str
    goal_title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class OverviewAnalytics(BaseModel):
    total_study_time_hours: float
    study_time_last_7_days: List[StudyTimeData]
    study_time_last_30_days: List[StudyTimeData]
    streak_data: StreakData
    completed_roadmap_steps: int
    active_goal_progress: Optional[GoalProgressData]
    quiz_stats: Optional[QuizAnalyticsData] = None

class CurrentGoalAnalytics(BaseModel):
    goal: GoalProgressData
    roadmap_progress: RoadmapProgressData

class QuizAnalytics(BaseModel):
    analytics: QuizAnalyticsData
    strengths_weaknesses: StrengthsWeaknessesData

# -------------------------------------------------
# Helper Functions
# -------------------------------------------------

def get_user_streak_data(db: Session, user_id: int, is_pro: bool = False) -> StreakData:
    """Calculate current and longest study streaks"""
    # Get study streaks for the user
    query = db.query(models.StudyStreak).filter(
        models.StudyStreak.user_id == user_id
    )
    
    # For free users, only get last 7 days of streak data
    if not is_pro:
        seven_days_ago = datetime.now() - timedelta(days=7)
        query = query.filter(models.StudyStreak.date >= seven_days_ago)
    
    streaks = query.order_by(models.StudyStreak.date.desc()).all()
    
    if not streaks:
        return StreakData(current_streak=0, longest_streak=0)
    
    # Calculate current streak
    current_streak = 0
    today = datetime.now().date()
    
    for streak in streaks:
        if streak.study_time_minutes > 0:
            streak_date = streak.date.date()
            if streak_date == today or streak_date == today - timedelta(days=current_streak):
                current_streak += 1
            else:
                break
    
    # Calculate longest streak
    longest_streak = 0
    temp_streak = 0
    
    for streak in sorted(streaks, key=lambda x: x.date):
        if streak.study_time_minutes > 0:
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 0
    
    return StreakData(current_streak=current_streak, longest_streak=longest_streak)

def get_study_time_data(db: Session, user_id: int, days: int) -> List[StudyTimeData]:
    """Get study time data for the last N days"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days-1)
    
    # Get progress records and productivity sessions
    progress_data = db.query(
        func.date(models.Progress.date).label('date'),
        func.sum(models.Progress.time_spent_minutes).label('minutes')
    ).join(models.Goal).filter(
        models.Goal.user_id == user_id,
        func.date(models.Progress.date) >= start_date.date(),
        func.date(models.Progress.date) <= end_date.date()
    ).group_by(func.date(models.Progress.date)).all()
    
    # Get productivity sessions
    productivity_data = db.query(
        func.date(models.ProductivitySession.started_at).label('date'),
        func.sum(models.ProductivitySession.duration_minutes).label('minutes')
    ).filter(
        models.ProductivitySession.user_id == user_id,
        models.ProductivitySession.was_completed == True,
        func.date(models.ProductivitySession.started_at) >= start_date.date(),
        func.date(models.ProductivitySession.started_at) <= end_date.date()
    ).group_by(func.date(models.ProductivitySession.started_at)).all()
    
    # Combine data
    daily_data = {}
    for data in progress_data:
        daily_data[data.date] = daily_data.get(data.date, 0) + float(data.minutes)
    
    for data in productivity_data:
        daily_data[data.date] = daily_data.get(data.date, 0) + float(data.minutes)
    
    # Fill missing days with 0
    result = []
    for i in range(days):
        current_date = (start_date + timedelta(days=i)).date()
        result.append(StudyTimeData(
            date=current_date.isoformat(),
            minutes=daily_data.get(current_date, 0.0)
        ))
    
    return result

def get_active_goal(db: Session, user_id: int) -> Optional[models.Goal]:
    """Get the user's active (non-completed) goal with most recent activity"""
    return db.query(models.Goal).filter(
        models.Goal.user_id == user_id,
        models.Goal.is_completed == False
    ).order_by(models.Goal.updated_at.desc()).first()

def calculate_goal_progress(db: Session, goal: models.Goal) -> GoalProgressData:
    """Calculate progress percentage for a goal"""
    total_steps = len(goal.roadmap_steps)
    completed_steps = sum(1 for step in goal.roadmap_steps if step.is_completed)
    
    completion_percentage = (completed_steps / total_steps * 100) if total_steps > 0 else 0
    status = "completed" if goal.is_completed or completion_percentage >= 100 else "active"
    
    return GoalProgressData(
        goal_id=goal.id,
        title=goal.title,
        description=goal.description,
        learning_style=goal.learning_style,
        completion_percentage=completion_percentage,
        is_completed=goal.is_completed,
        status=status,
        target_date=goal.target_date
    )

def get_roadmap_progress(db: Session, goal: models.Goal) -> RoadmapProgressData:
    """Get detailed roadmap progress for a goal"""
    total_steps = len(goal.roadmap_steps)
    completed_steps = sum(1 for step in goal.roadmap_steps if step.is_completed)
    
    estimated_hours = sum(step.estimated_hours for step in goal.roadmap_steps)
    # Convert total minutes spent on this goal to hours
    actual_study_hours = (
        sum(prog.time_spent_minutes for prog in goal.progress_records) / 60
        if goal.progress_records
        else 0
    )
    
    completion_percentage = (completed_steps / total_steps * 100) if total_steps > 0 else 0
    
    # Create steps timeline
    steps_timeline = []
    for step in sorted(goal.roadmap_steps, key=lambda x: x.step_number):
        steps_timeline.append({
            "step_number": step.step_number,
            "title": step.title,
            "is_completed": step.is_completed,
            "completed_at": step.completed_at.isoformat() if step.completed_at else None,
            "estimated_hours": step.estimated_hours
        })
    
    return RoadmapProgressData(
        total_steps=total_steps,
        completed_steps=completed_steps,
        estimated_hours=estimated_hours,
        actual_study_hours=actual_study_hours,
        completion_percentage=completion_percentage,
        steps_timeline=steps_timeline
    )

def get_quiz_analytics(db: Session, user_id: int) -> QuizAnalyticsData:
    """Get comprehensive quiz analytics for a user"""
    # Get all quiz results for user's goals
    quiz_results = db.query(models.QuizResult).join(models.Goal).filter(
        models.Goal.user_id == user_id
    ).order_by(models.QuizResult.completed_at.desc()).all()
    
    if not quiz_results:
        return QuizAnalyticsData(
            total_quizzes=0,
            average_score=0.0,
            best_score=0.0,
            worst_score=0.0,
            score_history=[],
            topic_performance=[]
        )
    
    total_quizzes = len(quiz_results)
    scores = [quiz.score for quiz in quiz_results]
    average_score = sum(scores) / total_quizzes
    best_score = max(scores)
    worst_score = min(scores)
    
    # Score history for line chart
    score_history = []
    for quiz in quiz_results:
        score_history.append({
            "date": quiz.completed_at.isoformat(),
            "score": quiz.score,
            "topic": quiz.topic
        })
    
    # Topic performance
    topic_scores = {}
    for quiz in quiz_results:
        if quiz.topic not in topic_scores:
            topic_scores[quiz.topic] = []
        topic_scores[quiz.topic].append(quiz.score)
    
    topic_performance = []
    for topic, scores in topic_scores.items():
        avg_score = sum(scores) / len(scores)
        topic_performance.append({
            "topic": topic,
            "average_score": avg_score,
            "quiz_count": len(scores)
        })
    
    return QuizAnalyticsData(
        total_quizzes=total_quizzes,
        average_score=average_score,
        best_score=best_score,
        worst_score=worst_score,
        score_history=score_history,
        topic_performance=topic_performance
    )

def get_strengths_weaknesses(db: Session, user_id: int) -> StrengthsWeaknessesData:
    """Analyze strengths and weaknesses based on quiz performance"""
    quiz_analytics = get_quiz_analytics(db, user_id)
    
    strong_topics = []
    weak_topics = []
    suggestions = []
    
    for topic_data in quiz_analytics.topic_performance:
        if topic_data["average_score"] >= 75:
            strong_topics.append(topic_data)
        elif topic_data["average_score"] < 50:
            weak_topics.append(topic_data)
    
    # Generate suggestions
    if weak_topics:
        suggestions.append(f"Focus on improving {', '.join([t['topic'] for t in weak_topics[:2]])} through additional practice")
    
    if quiz_analytics.average_score < 60:
        suggestions.append("Consider reviewing fundamental concepts before attempting advanced topics")
    
    if quiz_analytics.total_quizzes < 5:
        suggestions.append("Take more quizzes to get better insights into your learning progress")
    
    if not suggestions:
        suggestions.append("Great job! Keep up the consistent learning and challenge yourself with advanced topics")
    
    return StrengthsWeaknessesData(
        strong_topics=strong_topics,
        weak_topics=weak_topics,
        suggestions=suggestions
    )

def get_user_activity(db: Session, user_id: int, limit: int = 10) -> List[ActivityData]:
    """Get recent user activity for dashboard"""
    activities = []
    
    # Get recent quiz results
    quiz_results = db.query(models.QuizResult).join(models.Goal).filter(
        models.Goal.user_id == user_id
    ).order_by(models.QuizResult.completed_at.desc()).limit(5).all()
    
    for quiz in quiz_results:
        activities.append(ActivityData(
            id=f"quiz_{quiz.id}",
            type="quiz_attempt",
            title="Quiz Attempt",
            description=f"Scored {quiz.score:.0f}% on {quiz.topic}",
            timestamp=quiz.completed_at.isoformat(),
            goal_title=quiz.goal.title if quiz.goal else None,
            metadata={"score": quiz.score, "topic": quiz.topic}
        ))
    
    # Get recent progress updates
    progress_records = db.query(models.Progress).join(models.Goal).filter(
        models.Goal.user_id == user_id,
        models.Progress.time_spent_minutes > 0
    ).order_by(models.Progress.date.desc()).limit(5).all()
    
    for progress in progress_records:
        activities.append(ActivityData(
            id=f"progress_{progress.id}",
            type="study_session",
            title="Study Session",
            description=f"Studied for {progress.time_spent_minutes:.0f} minutes",
            timestamp=progress.date.isoformat(),
            goal_title=progress.goal.title if progress.goal else None,
            metadata={"minutes": progress.time_spent_minutes}
        ))
    
    # Get recent goal completions
    completed_goals = db.query(models.Goal).filter(
        models.Goal.user_id == user_id,
        models.Goal.is_completed == True
    ).order_by(models.Goal.updated_at.desc()).limit(3).all()
    
    for goal in completed_goals:
        activities.append(ActivityData(
            id=f"goal_completed_{goal.id}",
            type="goal_completed",
            title="Goal Completed",
            description=f"Completed goal: {goal.title}",
            timestamp=goal.updated_at.isoformat(),
            goal_title=goal.title,
            metadata={"goal_id": goal.id}
        ))
    
    # Get recent goal creations (new goals, not completed)
    new_goals = db.query(models.Goal).filter(
        models.Goal.user_id == user_id,
        models.Goal.is_completed == False
    ).order_by(models.Goal.created_at.desc()).limit(3).all()
    
    for goal in new_goals:
        activities.append(ActivityData(
            id=f"goal_created_{goal.id}",
            type="goal_created",
            title="Goal Created",
            description=f"Started learning: {goal.title}",
            timestamp=goal.created_at.isoformat(),
            goal_title=goal.title,
            metadata={"goal_id": goal.id}
        ))
    
    # Get recent level ups (from user stats)
    user_stats = db.query(models.UserStats).filter(
        models.UserStats.user_id == user_id
    ).first()
    
    if user_stats and user_stats.total_xp > 0:
        # Calculate current level for display
        gamification_service = GamificationService(db)
        level_progress = gamification_service.get_level_progress(user_id)
        
        # Use the actual last_updated timestamp from user stats, not current time
        activities.append(ActivityData(
            id=f"level_{user_stats.id}",
            type="level_up",
            title="Current Level",
            description=f"Level {level_progress['current_level']} with {level_progress['total_xp']} XP",
            timestamp=user_stats.updated_at.isoformat() if user_stats.updated_at else datetime.now().isoformat(),
            metadata=level_progress
        ))
    
    # Sort by timestamp and limit
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:limit]

# -------------------------------------------------
# API Endpoints
# -------------------------------------------------

@router.get("/overview", response_model=OverviewAnalytics)
async def get_overview_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overview analytics for the dashboard"""
    user_id = current_user.id
    
    # Get total study time
    total_study_time = db.query(func.sum(models.Progress.time_spent_minutes)).join(models.Goal).filter(
        models.Goal.user_id == user_id
    ).scalar() or 0.0
    
    # Add productivity sessions
    productivity_time = db.query(func.sum(models.ProductivitySession.duration_minutes)).filter(
        models.ProductivitySession.user_id == user_id,
        models.ProductivitySession.was_completed == True
    ).scalar() or 0.0
    
    total_study_time += productivity_time
    total_study_time_hours = total_study_time / 60
    
    # Get study time data
    study_time_7_days = get_study_time_data(db, user_id, 7)
    study_time_30_days = get_study_time_data(db, user_id, 30)
    
    # Get streak data (limited to 7 days for free users)
    is_pro = current_user.subscription_plan == models.SubscriptionPlan.PRO
    streak_data = get_user_streak_data(db, user_id, is_pro)
    
    # Get completed roadmap steps
    completed_steps = db.query(func.count(models.RoadmapStep.id)).join(models.Goal).filter(
        models.Goal.user_id == user_id,
        models.RoadmapStep.is_completed == True
    ).scalar() or 0
    
    # Get active goal progress
    active_goal = get_active_goal(db, user_id)
    active_goal_progress = None
    if active_goal:
        active_goal_progress = calculate_goal_progress(db, active_goal)
    
    # Get quiz stats
    quiz_stats = get_quiz_analytics(db, user_id)
    
    return OverviewAnalytics(
        total_study_time_hours=total_study_time_hours,
        study_time_last_7_days=study_time_7_days,
        study_time_last_30_days=study_time_30_days,
        streak_data=streak_data,
        completed_roadmap_steps=completed_steps,
        active_goal_progress=active_goal_progress,
        quiz_stats=quiz_stats
    )

@router.get("/goals/current", response_model=CurrentGoalAnalytics)
async def get_current_goal_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for the current active goal"""
    active_goal = get_active_goal(db, current_user.id)
    
    if not active_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active goal found"
        )
    
    goal_progress = calculate_goal_progress(db, active_goal)
    roadmap_progress = get_roadmap_progress(db, active_goal)
    
    return CurrentGoalAnalytics(
        goal=goal_progress,
        roadmap_progress=roadmap_progress
    )

@router.get("/roadmap/current", response_model=RoadmapProgressData)
async def get_current_roadmap_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get roadmap analytics for the current active goal"""
    active_goal = get_active_goal(db, current_user.id)
    
    if not active_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active goal found"
        )
    
    return get_roadmap_progress(db, active_goal)

@router.get("/quizzes", response_model=QuizAnalytics)
async def get_quiz_analytics_endpoint(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive quiz analytics"""
    quiz_data = get_quiz_analytics(db, current_user.id)
    strengths_weaknesses = get_strengths_weaknesses(db, current_user.id)
    
    return QuizAnalytics(
        analytics=quiz_data,
        strengths_weaknesses=strengths_weaknesses
    )

@router.get("/activity", response_model=List[ActivityData])
async def get_user_activity_endpoint(
    limit: int = 10,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent user activity for dashboard"""
    return get_user_activity(db, current_user.id, limit)
