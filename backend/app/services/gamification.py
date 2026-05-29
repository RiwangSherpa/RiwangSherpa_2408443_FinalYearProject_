"""
Gamification Service - Achievement Engine and XP System
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app import models
from app.services.email_service import send_achievement_emails_async


class AchievementEngine:
    """
    Achievement engine that evaluates triggers and awards achievements.
    """
    
    DEFAULT_ACHIEVEMENTS = [
        {"name": "First Steps", "description": "Complete your first roadmap step",
         "category": "roadmap", "difficulty": "bronze", "xp": 50,
         "trigger": {"type": "roadmap_step", "threshold": 1}},
        {"name": "Goal Getter", "description": "Complete your first learning goal",
         "category": "goal", "difficulty": "silver", "xp": 200,
         "trigger": {"type": "goals_completed", "threshold": 1}},
        {"name": "Overachiever", "description": "Complete 5 learning goals",
         "category": "goal", "difficulty": "gold", "xp": 400,
         "trigger": {"type": "goals_completed", "threshold": 5}},
        {"name": "Quiz Starter", "description": "Complete your first quiz",
         "category": "quiz", "difficulty": "bronze", "xp": 50,
         "trigger": {"type": "quizzes_completed", "threshold": 1}},
        {"name": "Quiz Master", "description": "Complete 5 quizzes",
         "category": "quiz", "difficulty": "silver", "xp": 150,
         "trigger": {"type": "quizzes_completed", "threshold": 5}},
        {"name": "Perfect Score", "description": "Score 100% on any quiz",
         "category": "quiz", "difficulty": "gold", "xp": 200,
         "trigger": {"type": "perfect_quiz", "threshold": 1}},
        {"name": "Consistent Learner", "description": "Maintain a 7-day study streak",
         "category": "streak", "difficulty": "silver", "xp": 150,
         "trigger": {"type": "streak_days", "threshold": 7}},
        {"name": "Week Warrior", "description": "Study for 7 consecutive days",
         "category": "streak", "difficulty": "silver", "xp": 150,
         "trigger": {"type": "streak_days", "threshold": 7}},
        {"name": "Study Starter", "description": "Study for 10 total hours",
         "category": "study", "difficulty": "bronze", "xp": 100,
         "trigger": {"type": "total_study_hours", "threshold": 10}},
        {"name": "Focus Legend", "description": "Study for 30 total hours",
         "category": "study", "difficulty": "gold", "xp": 300,
         "trigger": {"type": "total_study_hours", "threshold": 30}},
        {"name": "Note Taker", "description": "Create your first note",
         "category": "notes", "difficulty": "bronze", "xp": 50,
         "trigger": {"type": "notes_created", "threshold": 1}},
        {"name": "Knowledge Builder", "description": "Create 10 notes",
         "category": "notes", "difficulty": "silver", "xp": 200,
         "trigger": {"type": "notes_created", "threshold": 10}},
        {"name": "Brainstorm Beginner", "description": "Create your first brainstorm session",
         "category": "brainstorm", "difficulty": "bronze", "xp": 75,
         "trigger": {"type": "brainstorm_sessions", "threshold": 1}},
        {"name": "File Explorer", "description": "Upload your first study file",
         "category": "files", "difficulty": "bronze", "xp": 75,
         "trigger": {"type": "file_uploads", "threshold": 1}},
        {"name": "Flashcard Rookie", "description": "Generate your first flashcard deck",
         "category": "flashcards", "difficulty": "bronze", "xp": 75,
         "trigger": {"type": "flashcard_decks", "threshold": 1}},
        {"name": "Mindmap Maker", "description": "Generate your first mindmap",
         "category": "mindmaps", "difficulty": "bronze", "xp": 75,
         "trigger": {"type": "mindmaps", "threshold": 1}},
    ]
    
    def __init__(self, db: Session):
        self.db = db
        self._initialize_default_achievements()
    
    def _initialize_default_achievements(self):
        """Create or update the supported achievements exactly once."""
        existing_achievements = {a.name: a for a in self.db.query(models.Achievement).all()}
        default_names = {ach["name"] for ach in self.DEFAULT_ACHIEVEMENTS}
        
        for name, achievement in existing_achievements.items():
            if name not in default_names:
                self.db.query(models.UserAchievement).filter(
                    models.UserAchievement.achievement_id == achievement.id
                ).delete()
                self.db.delete(achievement)
        
        for ach_data in self.DEFAULT_ACHIEVEMENTS:
            achievement = existing_achievements.get(ach_data["name"])
            if achievement:
                achievement.description = ach_data["description"]
                achievement.category = ach_data["category"]
                achievement.difficulty = ach_data["difficulty"]
                achievement.xp_reward = ach_data["xp"]
                achievement.trigger_condition = ach_data["trigger"]
                achievement.is_hidden = ach_data.get("hidden", False)
            else:
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

    def sync_stats_from_db(self, user_id: int) -> models.UserStats:
        """Rebuild derived counters from persisted user activity."""
        stats = self.get_or_create_user_stats(user_id)
        user_goal_ids = [
            goal_id for (goal_id,) in self.db.query(models.Goal.id).filter(
                models.Goal.user_id == user_id
            ).all()
        ]

        total_minutes = self.db.query(func.sum(models.StudyStreak.study_time_minutes)).filter(
            models.StudyStreak.user_id == user_id
        ).scalar() or 0.0
        stats.total_study_hours = float(total_minutes) / 60.0
        stats.total_study_sessions = self.db.query(models.StudyStreak).filter(
            models.StudyStreak.user_id == user_id,
            models.StudyStreak.study_time_minutes > 0
        ).count()

        if user_goal_ids:
            stats.total_quizzes_taken = self.db.query(models.QuizResult).filter(
                models.QuizResult.goal_id.in_(user_goal_ids)
            ).count()
            stats.total_questions_answered = self.db.query(func.sum(models.QuizResult.total_questions)).filter(
                models.QuizResult.goal_id.in_(user_goal_ids)
            ).scalar() or 0
            stats.perfect_quiz_count = self.db.query(models.QuizResult).filter(
                models.QuizResult.goal_id.in_(user_goal_ids),
                models.QuizResult.score >= 100
            ).count()
            stats.roadmap_steps_completed = self.db.query(models.RoadmapStep).filter(
                models.RoadmapStep.goal_id.in_(user_goal_ids),
                models.RoadmapStep.is_completed == True
            ).count()
        else:
            stats.total_quizzes_taken = 0
            stats.total_questions_answered = 0
            stats.perfect_quiz_count = 0
            stats.roadmap_steps_completed = 0

        stats.goals_completed = self.db.query(models.Goal).filter(
            models.Goal.user_id == user_id,
            models.Goal.is_completed == True
        ).count()
        stats.longest_streak = self._calculate_longest_streak(user_id)

        stats.total_xp = self._earned_achievement_xp(user_id)
        stats.current_level = self._calculate_level(stats.total_xp)
        self.db.commit()
        self.db.refresh(stats)
        return stats

    def _earned_achievement_xp(self, user_id: int) -> int:
        return self.db.query(func.sum(models.Achievement.xp_reward)).join(
            models.UserAchievement,
            models.UserAchievement.achievement_id == models.Achievement.id
        ).filter(models.UserAchievement.user_id == user_id).scalar() or 0

    def _calculate_longest_streak(self, user_id: int) -> int:
        streak_dates = [
            row[0] for row in self.db.query(func.date(models.StudyStreak.date)).filter(
                models.StudyStreak.user_id == user_id,
                models.StudyStreak.study_time_minutes > 0
            ).distinct().order_by(func.date(models.StudyStreak.date)).all()
        ]
        longest = 0
        current = 0
        previous_date = None
        for raw_date in streak_dates:
            current_date = datetime.fromisoformat(str(raw_date)).date()
            if previous_date and current_date == previous_date + timedelta(days=1):
                current += 1
            else:
                current = 1
            longest = max(longest, current)
            previous_date = current_date
        return longest
    
    def add_xp(self, user_id: int, amount: int, source: str = "general") -> Dict:
        """
        Add XP to user and check for level ups.
        
        Returns:
            Dict with new XP, level, and whether level up occurred
        """
        stats = self.sync_stats_from_db(user_id)
        
        old_level = stats.current_level
        stats.total_xp += amount
        
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
        stats = self.sync_stats_from_db(user_id)
        
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
        stats = self.sync_stats_from_db(user_id)
        
        all_achievements = self.db.query(models.Achievement).all()
        
        earned_ids = {
            ua.achievement_id 
            for ua in self.db.query(models.UserAchievement).filter(
                models.UserAchievement.user_id == user_id
            ).all()
        }
        
        for achievement in all_achievements:
            if achievement.id in earned_ids:
                continue
            
            if self._check_achievement_criteria(user_id, stats, achievement.trigger_condition):
                user_achievement = models.UserAchievement(
                    user_id=user_id,
                    achievement_id=achievement.id
                )
                try:
                    self.db.add(user_achievement)
                    self.db.flush()
                except IntegrityError:
                    self.db.rollback()
                    earned_ids.add(achievement.id)
                    continue
                earned_ids.add(achievement.id)
                
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
            self.sync_stats_from_db(user_id)
            send_achievement_emails_async(self.db, user_id, new_achievements)
        
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

        elif trigger_type == "notes_created":
            return self.db.query(models.Note).filter(
                models.Note.user_id == user_id
            ).count() >= threshold

        elif trigger_type == "brainstorm_sessions":
            return self.db.query(models.BrainstormSession).filter(
                models.BrainstormSession.user_id == user_id
            ).count() >= threshold

        elif trigger_type == "file_uploads":
            return self.db.query(models.BrainstormFile).filter(
                models.BrainstormFile.user_id == user_id
            ).count() >= threshold

        elif trigger_type == "flashcard_decks":
            return self.db.query(models.FlashcardDeck).filter(
                models.FlashcardDeck.user_id == user_id
            ).count() >= threshold

        elif trigger_type == "mindmaps":
            return self.db.query(models.Mindmap).filter(
                models.Mindmap.user_id == user_id
            ).count() >= threshold
        
        elif trigger_type == "daily_steps":
            from datetime import datetime, timedelta
            today = datetime.utcnow().date()
            steps_today = self.db.query(models.RoadmapStep).join(models.Goal).filter(
                models.Goal.user_id == user_id,
                models.RoadmapStep.is_completed == True,
                func.date(models.RoadmapStep.completed_at) == today
            ).count()
            return steps_today >= threshold
        
        elif trigger_type == "goal_50_percent":
            goals = self.db.query(models.Goal).filter(
                models.Goal.user_id == user_id
            ).all()
            
            for goal in goals:
                total_steps = self.db.query(models.RoadmapStep).filter(
                    models.RoadmapStep.goal_id == goal.id
                ).count()
                completed_steps = self.db.query(models.RoadmapStep).filter(
                    models.RoadmapStep.goal_id == goal.id,
                    models.RoadmapStep.is_completed == True
                ).count()
                
                if total_steps > 0 and (completed_steps / total_steps) >= 0.5:
                    return True
            return False
        
        return False
    
    def update_stats_from_activity(self, user_id: int, activity_type: str, 
                                   value: float = 1.0) -> None:
        """Refresh derived stats after an activity mutation."""
        self.sync_stats_from_db(user_id)
    
    def get_user_achievements(self, user_id: int) -> Dict:
        """Get all achievements for a user"""
        earned = self.db.query(models.UserAchievement, models.Achievement).join(
            models.Achievement
        ).filter(
            models.UserAchievement.user_id == user_id
        ).order_by(models.UserAchievement.earned_at.desc()).all()
        
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
