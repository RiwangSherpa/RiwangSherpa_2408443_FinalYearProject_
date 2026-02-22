"""
Gamification API Router
Achievements, XP, and leveling system
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.routers.auth import get_current_user
from app.services.gamification import GamificationService

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


@router.get("/profile")
async def get_gamification_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get complete gamification profile for the user"""
    service = GamificationService(db)
    
    # Ensure stats exist
    service.get_or_create_user_stats(current_user.id)
    
    # Check for new achievements
    new_achievements = service.check_and_award_achievements(current_user.id)
    
    # Get all data
    level_progress = service.get_level_progress(current_user.id)
    achievements = service.get_user_achievements(current_user.id)
    
    return {
        "level_progress": level_progress,
        "achievements": achievements,
        "newly_earned": new_achievements
    }


@router.get("/achievements")
async def get_achievements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all achievements (earned and locked)"""
    service = GamificationService(db)
    achievements = service.get_user_achievements(current_user.id)
    
    return achievements


@router.post("/check-achievements")
async def check_achievements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check and award any newly earned achievements"""
    service = GamificationService(db)
    
    # Get level before checking achievements
    old_level = service.get_level_progress(current_user.id)["current_level"]
    
    # Check for new achievements (this also awards XP)
    new_achievements = service.check_and_award_achievements(current_user.id)
    
    # Get level after (to detect level ups)
    new_level_progress = service.get_level_progress(current_user.id)
    new_level = new_level_progress["current_level"]
    
    return {
        "new_achievements": new_achievements,
        "count": len(new_achievements),
        "level_up": new_level > old_level if new_achievements else False,
        "old_level": old_level if new_achievements and new_level > old_level else None,
        "new_level": new_level if new_achievements and new_level > old_level else None,
        "current_level_progress": new_level_progress
    }


@router.get("/level")
async def get_level_progress(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current level and XP progress"""
    service = GamificationService(db)
    progress = service.get_level_progress(current_user.id)
    
    return progress


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get top users by XP"""
    service = GamificationService(db)
    leaderboard = service.get_leaderboard(limit)
    
    # Find current user's rank
    user_rank = None
    for entry in leaderboard:
        if entry["user_id"] == current_user.id:
            user_rank = entry["rank"]
            break
    
    return {
        "leaderboard": leaderboard,
        "user_rank": user_rank,
        "total_participants": db.query(models.UserStats).count()
    }


@router.get("/stats")
async def get_detailed_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get detailed user statistics"""
    service = GamificationService(db)
    stats = service.get_or_create_user_stats(current_user.id)
    
    return {
        "xp_and_level": {
            "total_xp": stats.total_xp,
            "current_level": stats.current_level
        },
        "study_stats": {
            "total_sessions": stats.total_study_sessions,
            "total_hours": round(stats.total_study_hours, 1)
        },
        "quiz_stats": {
            "quizzes_taken": stats.total_quizzes_taken,
            "questions_answered": stats.total_questions_answered,
            "perfect_quizzes": stats.perfect_quiz_count
        },
        "streak_and_goals": {
            "longest_streak": stats.longest_streak,
            "goals_completed": stats.goals_completed,
            "roadmap_steps_completed": stats.roadmap_steps_completed
        }
    }
