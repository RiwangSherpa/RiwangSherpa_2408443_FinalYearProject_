"""
Gamification Service - Achievement Engine and XP System
"""

import json
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models


class AchievementEngine:
    """
    Achievement engine that evaluates triggers and awards achievements.
    """
    
    DEFAULT_ACHIEVEMENTS = [
        # Study & Streak Achievements
        {"name": "First Steps", "description": "Complete your first study session", 
         "category": "study", "difficulty": "bronze", "xp": 50,
         "trigger": {"type": "study_sessions", "threshold": 1}},
        
        {"name": "Study Starter", "description": "Study for 10 hours total", 
         "category": "study", "difficulty": "silver", "xp": 100,
         "trigger": {"type": "total_study_hours", "threshold": 10}},
        
        {"name": "Week Warrior", "description": "Study for 7 consecutive days", 
         "category": "streak", "difficulty": "silver", "xp": 150,
         "trigger": {"type": "streak_days", "threshold": 7}},
        
        {"name": "Consistent Learner", "description": "Maintain a 30-day study streak", 
         "category": "streak", "difficulty": "gold", "xp": 500,
         "trigger": {"type": "streak_days", "threshold": 30}},
        
        # Quiz Achievements
        {"name": "Quiz Novice", "description": "Complete your first quiz", 
         "category": "quiz", "difficulty": "bronze", "xp": 50,
         "trigger": {"type": "quizzes_completed", "threshold": 1}},
        
        {"name": "Quiz Master", "description": "Complete 5 quizzes", 
         "category": "quiz", "difficulty": "silver", "xp": 150,
         "trigger": {"type": "quizzes_completed", "threshold": 5}},
        
        {"name": "Perfect Score", "description": "Score 100% on any quiz", 
         "category": "quiz", "difficulty": "gold", "xp": 200,
         "trigger": {"type": "perfect_quiz", "threshold": 1}},
        
        # Goal & Roadmap Achievements
        {"name": "Goal Getter", "description": "Complete your first learning goal", 
         "category": "goal", "difficulty": "silver", "xp": 200,
         "trigger": {"type": "goals_completed", "threshold": 1}},
        
        {"name": "Overachiever", "description": "Complete 5 learning goals", 
         "category": "goal", "difficulty": "gold", "xp": 400,
         "trigger": {"type": "goals_completed", "threshold": 5}},
        
        {"name": "Roadmap Beginner", "description": "Complete your first roadmap step", 
         "category": "roadmap", "difficulty": "bronze", "xp": 75,
         "trigger": {"type": "roadmap_step", "threshold": 1}},
    ]
    
    def __init__(self, db: Session):
        self.db = db
        self._initialize_default_achievements()
    
    def _initialize_default_achievements(self):
        """Create default achievements if they don't exist, remove old ones"""
        existing_achievements = {a.name: a for a in self.db.query(models.Achievement).all()}
        default_names = {ach["name"] for ach in self.DEFAULT_ACHIEVEMENTS}
        
        # Remove achievements that are no longer in the default list
        for name, achievement in existing_achievements.items():
            if name not in default_names:
                # Delete user achievements first (foreign key constraint)
                self.db.query(models.UserAchievement).filter(
                    models.UserAchievement.achievement_id == achievement.id
                ).delete()
                # Delete the achievement
                self.db.delete(achievement)
        
        # Add new default achievements
        for ach_data in self.DEFAULT_ACHIEVEMENTS:
            if ach_data["name"] not in existing_achievements:
                achievement = models.Achievement(
                    name=ach_data["name"],
                    description=ach_data["description"],
                    category=ach_data["category"],
                    difficulty=ach_data["difficulty"],
                    xp_reward=ach_data["xp"],
                    trigger_condition=ach_data["trigger"],
                    is_hidden=ach_data.get("hidden", False)
                )
                self.db.add(achievement)
        
        self.db.commit()


class GamificationService:
    """Service for managing gamification features"""
    
    # XP required for each level (exponential growth)
    BASE_XP = 100
    XP_MULTIPLIER = 1.5
    
    def __init__(self, db: Session):
        self.db = db
        self.engine = AchievementEngine(db)
    
    def get_or_create_user_stats(self, user_id: int) -> models.UserStats:
        """Get or create user stats record"""
        stats = self.db.query(models.UserStats).filter(
            models.UserStats.user_id == user_id
        ).first()
        
        if not stats:
            stats = models.UserStats(user_id=user_id)
            self.db.add(stats)
            self.db.commit()
            self.db.refresh(stats)
        
        return stats
    
    def add_xp(self, user_id: int, amount: int, source: str = "general") -> Dict:
        """
        Add XP to user and check for level ups.
        
        Returns:
            Dict with new XP, level, and whether level up occurred
        """
        stats = self.get_or_create_user_stats(user_id)
        
        old_level = stats.current_level
        stats.total_xp += amount
        
        # Check for level up
        new_level = self._calculate_level(stats.total_xp)
        leveled_up = new_level > old_level
        stats.current_level = new_level
        
        self.db.commit()
        
        return {
            "xp_gained": amount,
            "total_xp": stats.total_xp,
            "current_level": stats.current_level,
            "leveled_up": leveled_up,
            "old_level": old_level if leveled_up else None,
            "source": source
        }
    
    def _calculate_level(self, total_xp: int) -> int:
        """Calculate level based on total XP"""
        level = 1
        xp_required = self.BASE_XP
        
        while total_xp >= xp_required:
            total_xp -= xp_required
            level += 1
            xp_required = int(xp_required * self.XP_MULTIPLIER)
        
        return level
    
    def get_xp_for_next_level(self, current_level: int) -> int:
        """Get XP required to reach next level"""
        xp = self.BASE_XP
        for _ in range(current_level - 1):
            xp = int(xp * self.XP_MULTIPLIER)
        return xp
    
    def get_level_progress(self, user_id: int) -> Dict:
        """Get current level progress for user"""
        stats = self.get_or_create_user_stats(user_id)
        
        # Calculate XP within current level
        xp_for_current = 0
        for level in range(1, stats.current_level):
            xp_for_current += self.get_xp_for_next_level(level)
        
        xp_in_current_level = stats.total_xp - xp_for_current
        xp_needed = self.get_xp_for_next_level(stats.current_level)
        
        progress_percentage = (xp_in_current_level / xp_needed * 100) if xp_needed > 0 else 0
        
        return {
            "current_level": stats.current_level,
            "xp_in_level": xp_in_current_level,
            "xp_needed_for_level": xp_needed,
            "total_xp": stats.total_xp,
            "progress_percentage": round(progress_percentage, 1)
        }
    
    def check_and_award_achievements(self, user_id: int) -> List[Dict]:
        """
        Check all achievements and award any newly earned ones.
        
        Returns:
            List of newly earned achievements
        """
        new_achievements = []
        stats = self.get_or_create_user_stats(user_id)
        
        # Get all achievements
        all_achievements = self.db.query(models.Achievement).all()
        
        # Get user's existing achievements
        earned_ids = {
            ua.achievement_id 
            for ua in self.db.query(models.UserAchievement).filter(
                models.UserAchievement.user_id == user_id
            ).all()
        }
        
        for achievement in all_achievements:
            if achievement.id in earned_ids:
                continue
            
            # Check if criteria met
            if self._check_achievement_criteria(user_id, stats, achievement.trigger_condition):
                # Award achievement
                user_achievement = models.UserAchievement(
                    user_id=user_id,
                    achievement_id=achievement.id
                )
                self.db.add(user_achievement)
                
                # Award XP
                self.add_xp(user_id, achievement.xp_reward, f"achievement_{achievement.name}")
                
                new_achievements.append({
                    "achievement_id": achievement.id,
                    "name": achievement.name,
                    "description": achievement.description,
                    "category": achievement.category,
                    "difficulty": achievement.difficulty,
                    "xp_reward": achievement.xp_reward
                })
        
        if new_achievements:
            self.db.commit()
        
        return new_achievements
    
    def _check_achievement_criteria(self, user_id: int, stats: models.UserStats, 
                                     trigger: Dict) -> bool:
        """Check if user meets achievement criteria"""
        trigger_type = trigger.get("type")
        threshold = trigger.get("threshold", 1)
        
        if trigger_type == "study_sessions":
            return stats.total_study_sessions >= threshold
        
        elif trigger_type == "streak_days":
            return stats.longest_streak >= threshold
        
        elif trigger_type == "quizzes_completed":
            return stats.total_quizzes_taken >= threshold
        
        elif trigger_type == "perfect_quiz":
            return stats.perfect_quiz_count >= threshold
        
        elif trigger_type == "goals_completed":
            return stats.goals_completed >= threshold
        
        elif trigger_type == "total_study_hours":
            return stats.total_study_hours >= threshold
        
        elif trigger_type == "roadmap_step":
            return stats.roadmap_steps_completed >= threshold
        
        return False
    
    def update_stats_from_activity(self, user_id: int, activity_type: str, 
                                   value: float = 1.0) -> None:
        """Update user stats based on activity"""
        stats = self.get_or_create_user_stats(user_id)
        
        if activity_type == "study_session":
            stats.total_study_sessions += 1
            stats.total_study_hours += value  # value is hours
        
        elif activity_type == "quiz_completed":
            stats.total_quizzes_taken += 1
            stats.total_questions_answered += int(value)  # value is questions answered
        
        elif activity_type == "perfect_quiz":
            stats.perfect_quiz_count += 1
        
        elif activity_type == "goal_completed":
            stats.goals_completed += 1
        
        elif activity_type == "roadmap_step":
            stats.roadmap_steps_completed += int(value)
        
        self.db.commit()
    
    def get_user_achievements(self, user_id: int) -> Dict:
        """Get all achievements for a user"""
        # Get earned achievements
        earned = self.db.query(models.UserAchievement, models.Achievement).join(
            models.Achievement
        ).filter(
            models.UserAchievement.user_id == user_id
        ).order_by(models.UserAchievement.earned_at.desc()).all()
        
        # Get locked achievements
        earned_ids = {ua.achievement_id for ua, _ in earned}
        locked = self.db.query(models.Achievement).filter(
            ~models.Achievement.id.in_(earned_ids) if earned_ids else True
        ).all()
        
        return {
            "earned": [
                {
                    "id": ach.id,
                    "name": ach.name,
                    "description": ach.description,
                    "category": ach.category,
                    "difficulty": ach.difficulty,
                    "xp_reward": ach.xp_reward,
                    "earned_at": ua.earned_at.isoformat()
                }
                for ua, ach in earned
            ],
            "locked": [
                {
                    "id": ach.id,
                    "name": ach.name,
                    "description": ach.description if not ach.is_hidden else "???",
                    "category": ach.category,
                    "difficulty": ach.difficulty,
                    "xp_reward": ach.xp_reward,
                    "hidden": ach.is_hidden
                }
                for ach in locked
            ],
            "total_earned": len(earned),
            "total_available": len(earned) + len(locked)
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        """Get top users by XP"""
        top_users = self.db.query(models.UserStats, models.User).join(
            models.User
        ).order_by(
            models.UserStats.total_xp.desc()
        ).limit(limit).all()
        
        return [
            {
                "rank": idx + 1,
                "user_id": user.id,
                "name": user.full_name or user.email.split('@')[0],
                "level": stats.current_level,
                "total_xp": stats.total_xp,
                "achievements": self.db.query(models.UserAchievement).filter(
                    models.UserAchievement.user_id == user.id
                ).count()
            }
            for idx, (stats, user) in enumerate(top_users)
        ]
