"""
Predictive Analytics Service
Learning velocity tracking, completion forecasting, and at-risk identification
"""

import math
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models


class LearningVelocityTracker:
    """Tracks and analyzes learning velocity metrics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_study_velocity(self, user_id: int, days: int = 14) -> Dict:
        """
        Calculate study velocity (hours per day) over a period.
        
        Returns:
            Dict with daily velocities and trend
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get daily study hours from progress records
        daily_hours = self.db.query(
            func.date(models.Progress.date).label('date'),
            func.sum(models.Progress.time_spent_minutes).label('minutes')
        ).join(models.Goal).filter(
            models.Goal.user_id == user_id,
            models.Progress.date >= start_date
        ).group_by(func.date(models.Progress.date)).all()
        
        # Convert to hours and fill missing days
        hours_by_day = {d.date: float(d.minutes) / 60 for d in daily_hours}
        
        velocities = []
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).date()
            hours = hours_by_day.get(date, 0)
            velocities.append({
                "date": date.isoformat(),
                "hours": round(hours, 2)
            })
        
        # Calculate trend
        if len(velocities) >= 7:
            recent_avg = sum(v["hours"] for v in velocities[:7]) / 7
            previous_avg = sum(v["hours"] for v in velocities[7:14]) / 7 if len(velocities) >= 14 else recent_avg
            
            trend = "increasing" if recent_avg > previous_avg * 1.1 else \
                    "decreasing" if recent_avg < previous_avg * 0.9 else "stable"
        else:
            recent_avg = sum(v["hours"] for v in velocities) / len(velocities) if velocities else 0
            trend = "insufficient_data"
        
        return {
            "daily_velocities": velocities,
            "average_hours_per_day": round(recent_avg, 2),
            "trend": trend,
            "total_hours": round(sum(v["hours"] for v in velocities), 2)
        }
    
    def predict_goal_completion(self, goal_id: int) -> Dict:
        """
        Predict when a goal will be completed based on current velocity.
        
        Returns:
            Dict with predicted completion date and confidence
        """
        goal = self.db.query(models.Goal).filter(models.Goal.id == goal_id).first()
        if not goal:
            return {"error": "Goal not found"}
        
        # Get total steps and completed steps
        total_steps = self.db.query(models.RoadmapStep).filter(
            models.RoadmapStep.goal_id == goal_id
        ).count()
        
        completed_steps = self.db.query(models.RoadmapStep).filter(
            models.RoadmapStep.goal_id == goal_id,
            models.RoadmapStep.is_completed == True
        ).count()
        
        if completed_steps >= total_steps:
            return {
                "status": "completed",
                "completion_percentage": 100,
                "predicted_completion": "Already completed"
            }
        
        remaining_steps = total_steps - completed_steps
        
        # Calculate velocity (steps completed per day)
        # Look at last 30 days
        start_date = datetime.utcnow() - timedelta(days=30)
        
        recent_completions = self.db.query(models.RoadmapStep).filter(
            models.RoadmapStep.goal_id == goal_id,
            models.RoadmapStep.is_completed == True,
            models.RoadmapStep.completed_at >= start_date
        ).count()
        
        steps_per_day = recent_completions / 30 if recent_completions > 0 else 0.1  # Minimum assumption
        
        # Predict days to completion
        if steps_per_day > 0:
            days_to_completion = remaining_steps / steps_per_day
            predicted_completion = datetime.utcnow() + timedelta(days=int(days_to_completion))
        else:
            days_to_completion = float('inf')
            predicted_completion = None
        
        # Calculate confidence based on consistency
        if recent_completions >= 5:
            confidence = "high"
        elif recent_completions >= 2:
            confidence = "medium"
        else:
            confidence = "low"
        
        # Check if predicted date exceeds target date
        at_risk = False
        if goal.target_date and predicted_completion:
            if predicted_completion > goal.target_date:
                at_risk = True
        
        completion_pct = (completed_steps / total_steps * 100) if total_steps > 0 else 0
        
        return {
            "goal_id": goal_id,
            "status": "in_progress",
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "remaining_steps": remaining_steps,
            "completion_percentage": round(completion_pct, 1),
            "steps_per_day": round(steps_per_day, 2),
            "predicted_completion_days": int(days_to_completion) if days_to_completion != float('inf') else None,
            "predicted_completion_date": predicted_completion.isoformat() if predicted_completion else None,
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "confidence": confidence,
            "at_risk": at_risk,
            "risk_reason": "Behind schedule" if at_risk else None
        }
    
    def identify_at_risk_goals(self, user_id: int) -> List[Dict]:
        """Identify goals that are at risk of not being completed on time"""
        goals = self.db.query(models.Goal).filter(
            models.Goal.user_id == user_id,
            models.Goal.is_completed == False,
            models.Goal.target_date != None
        ).all()
        
        at_risk = []
        
        for goal in goals:
            prediction = self.predict_goal_completion(goal.id)
            
            if prediction.get("at_risk"):
                at_risk.append({
                    "goal_id": goal.id,
                    "title": goal.title,
                    "target_date": goal.target_date.isoformat(),
                    "predicted_completion": prediction.get("predicted_completion_date"),
                    "days_behind": self._days_behind(goal.target_date, prediction.get("predicted_completion_date")),
                    "recommendation": self._generate_recommendation(prediction)
                })
        
        return sorted(at_risk, key=lambda x: x["days_behind"], reverse=True)
    
    def _days_behind(self, target_date: datetime, predicted_date: str) -> int:
        """Calculate how many days behind schedule"""
        if not predicted_date:
            return 0
        
        predicted = datetime.fromisoformat(predicted_date.replace('Z', '+00:00'))
        diff = (predicted - target_date).days
        return max(0, diff)
    
    def _generate_recommendation(self, prediction: Dict) -> str:
        """Generate recommendation based on prediction"""
        steps_per_day = prediction.get("steps_per_day", 0)
        
        if steps_per_day < 0.2:
            return "Low activity detected. Try setting a daily study reminder."
        elif steps_per_day < 0.5:
            return "Consider increasing study sessions to stay on track."
        else:
            return "Good pace! You may need to extend the deadline or increase intensity."
    
    def get_optimal_study_times(self, user_id: int) -> Dict:
        """
        Analyze past study sessions to find optimal study times.
        
        Returns:
            Dict with peak productivity hours and recommendations
        """
        # Get all study sessions with timestamps
        sessions = self.db.query(
            models.ProductivitySession.started_at,
            models.ProductivitySession.was_completed,
            models.ProductivitySession.duration_minutes
        ).filter(
            models.ProductivitySession.user_id == user_id,
            models.ProductivitySession.was_completed == True
        ).all()
        
        if not sessions:
            return {
                "optimal_hours": [],
                "recommendation": "Start tracking study sessions to get personalized recommendations"
            }
        
        # Analyze by hour of day
        hourly_completions = {}
        for session in sessions:
            hour = session.started_at.hour
            if hour not in hourly_completions:
                hourly_completions[hour] = {"count": 0, "total_duration": 0}
            hourly_completions[hour]["count"] += 1
            hourly_completions[hour]["total_duration"] += session.duration_minutes
        
        # Find peak hours (top 3)
        sorted_hours = sorted(
            hourly_completions.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )[:3]
        
        optimal_hours = [
            {
                "hour": h[0],
                "sessions": h[1]["count"],
                "avg_duration": round(h[1]["total_duration"] / h[1]["count"], 1)
            }
            for h in sorted_hours
        ]
        
        # Format for display
        hour_labels = {
            h["hour"]: f"{h['hour']}:00 - {h['sessions']} sessions"
            for h in optimal_hours
        }
        
        return {
            "optimal_hours": optimal_hours,
            "hour_labels": hour_labels,
            "recommendation": f"Your most productive study time is around {optimal_hours[0]['hour']}:00"
        }
    
    def calculate_learning_efficiency(self, user_id: int) -> Dict:
        """
        Calculate learning efficiency metrics.
        
        Returns:
            Dict with efficiency score and breakdown
        """
        # Get quiz performance vs time spent
        quiz_results = self.db.query(models.QuizResult).join(
            models.Goal
        ).filter(
            models.Goal.user_id == user_id
        ).all()
        
        if not quiz_results:
            return {"error": "No quiz data available"}
        
        avg_quiz_score = sum(q.score for q in quiz_results) / len(quiz_results)
        
        # Get total study time
        total_study = self.db.query(func.sum(models.Progress.time_spent_minutes)).join(
            models.Goal
        ).filter(
            models.Goal.user_id == user_id
        ).scalar() or 0
        
        # Calculate efficiency (score per hour)
        hours_studied = total_study / 60
        efficiency = avg_quiz_score / hours_studied if hours_studied > 0 else 0
        
        # Categorize efficiency
        if efficiency >= 20:
            category = "excellent"
        elif efficiency >= 15:
            category = "good"
        elif efficiency >= 10:
            category = "average"
        else:
            category = "needs_improvement"
        
        return {
            "efficiency_score": round(efficiency, 2),
            "category": category,
            "avg_quiz_score": round(avg_quiz_score, 1),
            "total_study_hours": round(hours_studied, 1),
            "interpretation": self._efficiency_interpretation(category)
        }
    
    def _efficiency_interpretation(self, category: str) -> str:
        """Provide interpretation of efficiency category"""
        interpretations = {
            "excellent": "Excellent learning efficiency! You're retaining information very well.",
            "good": "Good efficiency. Consider reviewing weak areas to improve further.",
            "average": "Average efficiency. Try active recall and spaced repetition techniques.",
            "needs_improvement": "Low efficiency detected. Focus on understanding before memorizing."
        }
        return interpretations.get(category, "")
    
    def get_comprehensive_dashboard(self, user_id: int) -> Dict:
        """Get comprehensive predictive analytics dashboard"""
        return {
            "study_velocity": self.calculate_study_velocity(user_id),
            "optimal_study_times": self.get_optimal_study_times(user_id),
            "learning_efficiency": self.calculate_learning_efficiency(user_id),
            "at_risk_goals": self.identify_at_risk_goals(user_id),
            "active_goal_predictions": self._get_active_goal_predictions(user_id)
        }
    
    def _get_active_goal_predictions(self, user_id: int) -> List[Dict]:
        """Get predictions for all active goals"""
        goals = self.db.query(models.Goal).filter(
            models.Goal.user_id == user_id,
            models.Goal.is_completed == False
        ).all()
        
        return [self.predict_goal_completion(g.id) for g in goals]
