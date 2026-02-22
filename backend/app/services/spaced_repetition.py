"""
Spaced Repetition System using the SM-2 Algorithm
Based on the SuperMemo-2 algorithm by Piotr Wozniak
"""

import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app import models


class SM2Algorithm:
    """
    Implementation of the SuperMemo-2 (SM-2) spaced repetition algorithm.
    
    The algorithm adjusts review intervals based on user performance ratings (0-5):
    - 5: Perfect response
    - 4: Correct response after hesitation
    - 3: Correct response with difficulty
    - 2: Incorrect response but easy to recall
    - 1: Incorrect response with recall
    - 0: Complete blackout
    """
    
    MIN_EASE_FACTOR = 1.3
    
    @classmethod
    def calculate_next_review(
        cls,
        current_ease_factor: float,
        current_interval: float,
        repetition_count: int,
        quality_score: int
    ) -> Dict[str, float]:
        """
        Calculate next review parameters based on SM-2 algorithm.
        
        Args:
            current_ease_factor: Current ease factor (EF)
            current_interval: Current interval in days
            repetition_count: Number of successful reviews (n)
            quality_score: Performance rating 0-5
            
        Returns:
            Dict with new_ease_factor, new_interval, new_repetition_count
        """
        # Validate quality score
        quality_score = max(0, min(5, quality_score))
        
        # Calculate new ease factor
        new_ease_factor = current_ease_factor + (0.1 - (5 - quality_score) * (0.08 + (5 - quality_score) * 0.02))
        new_ease_factor = max(cls.MIN_EASE_FACTOR, new_ease_factor)
        
        # Calculate new repetition count
        if quality_score < 3:
            # Failed review - reset repetition count
            new_repetition_count = 0
            new_interval = 0  # Review again today
        else:
            # Successful review
            new_repetition_count = repetition_count + 1
            
            if new_repetition_count == 1:
                new_interval = 1
            elif new_repetition_count == 2:
                new_interval = 6
            else:
                new_interval = current_interval * new_ease_factor
        
        return {
            "new_ease_factor": round(new_ease_factor, 2),
            "new_interval": round(new_interval, 1),
            "new_repetition_count": new_repetition_count
        }
    
    @classmethod
    def get_due_date(cls, interval_days: float) -> datetime:
        """Calculate due date based on interval"""
        if interval_days == 0:
            # Due today
            return datetime.utcnow()
        return datetime.utcnow() + timedelta(days=interval_days)


class SpacedRepetitionService:
    """Service for managing spaced repetition flashcards"""
    
    def __init__(self, db: Session):
        self.db = db
        self.algorithm = SM2Algorithm()
    
    def create_flashcard(
        self,
        user_id: int,
        front_content: str,
        back_content: str,
        goal_id: Optional[int] = None,
        tags: Optional[List[str]] = None
    ) -> models.Flashcard:
        """Create a new flashcard"""
        flashcard = models.Flashcard(
            user_id=user_id,
            goal_id=goal_id,
            front_content=front_content,
            back_content=back_content,
            tags=tags or [],
            ease_factor=2.5,
            interval_days=0.0,
            repetition_count=0,
            next_review_date=datetime.utcnow()  # Review immediately after creation
        )
        self.db.add(flashcard)
        self.db.commit()
        self.db.refresh(flashcard)
        return flashcard
    
    def get_due_flashcards(
        self,
        user_id: int,
        limit: int = 20,
        goal_id: Optional[int] = None
    ) -> List[models.Flashcard]:
        """Get flashcards due for review"""
        query = self.db.query(models.Flashcard).filter(
            models.Flashcard.user_id == user_id,
            models.Flashcard.next_review_date <= datetime.utcnow()
        )
        
        if goal_id:
            query = query.filter(models.Flashcard.goal_id == goal_id)
        
        return query.order_by(models.Flashcard.next_review_date).limit(limit).all()
    
    def get_new_flashcards(self, user_id: int, limit: int = 10) -> List[models.Flashcard]:
        """Get newly created flashcards (never reviewed)"""
        return self.db.query(models.Flashcard).filter(
            models.Flashcard.user_id == user_id,
            models.Flashcard.repetition_count == 0,
            models.Flashcard.next_review_date <= datetime.utcnow()
        ).order_by(models.Flashcard.created_at).limit(limit).all()
    
    def submit_review(
        self,
        flashcard_id: int,
        user_id: int,
        quality_score: int,
        review_time_seconds: Optional[int] = None
    ) -> models.Flashcard:
        """
        Submit a review for a flashcard.
        
        Args:
            flashcard_id: ID of the flashcard
            user_id: ID of the user reviewing
            quality_score: Performance rating 0-5
            review_time_seconds: Optional time taken to answer
            
        Returns:
            Updated flashcard
        """
        flashcard = self.db.query(models.Flashcard).filter(
            models.Flashcard.id == flashcard_id,
            models.Flashcard.user_id == user_id
        ).first()
        
        if not flashcard:
            raise ValueError("Flashcard not found")
        
        # Calculate new parameters using SM-2
        result = self.algorithm.calculate_next_review(
            current_ease_factor=flashcard.ease_factor,
            current_interval=flashcard.interval_days,
            repetition_count=flashcard.repetition_count,
            quality_score=quality_score
        )
        
        # Record the review
        review = models.FlashcardReview(
            flashcard_id=flashcard_id,
            user_id=user_id,
            quality_score=quality_score,
            previous_interval=flashcard.interval_days,
            new_interval=result["new_interval"],
            previous_ease_factor=flashcard.ease_factor,
            new_ease_factor=result["new_ease_factor"]
        )
        self.db.add(review)
        
        # Update flashcard
        flashcard.ease_factor = result["new_ease_factor"]
        flashcard.interval_days = result["new_interval"]
        flashcard.repetition_count = result["new_repetition_count"]
        flashcard.next_review_date = self.algorithm.get_due_date(result["new_interval"])
        flashcard.last_reviewed_at = datetime.utcnow()
        flashcard.total_reviews += 1
        
        if quality_score >= 3:
            flashcard.correct_reviews += 1
        
        self.db.commit()
        self.db.refresh(flashcard)
        
        return flashcard
    
    def get_stats(self, user_id: int) -> Dict[str, Any]:
        """Get spaced repetition statistics for a user"""
        # Total flashcards
        total_cards = self.db.query(models.Flashcard).filter(
            models.Flashcard.user_id == user_id
        ).count()
        
        # Cards due today
        due_today = self.db.query(models.Flashcard).filter(
            models.Flashcard.user_id == user_id,
            models.Flashcard.next_review_date <= datetime.utcnow()
        ).count()
        
        # New cards (never reviewed)
        new_cards = self.db.query(models.Flashcard).filter(
            models.Flashcard.user_id == user_id,
            models.Flashcard.repetition_count == 0
        ).count()
        
        # Mastered cards (interval > 21 days)
        mastered = self.db.query(models.Flashcard).filter(
            models.Flashcard.user_id == user_id,
            models.Flashcard.interval_days >= 21
        ).count()
        
        # Reviews today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        reviews_today = self.db.query(models.FlashcardReview).filter(
            models.FlashcardReview.user_id == user_id,
            models.FlashcardReview.reviewed_at >= today
        ).count()
        
        # Average ease factor
        avg_ease = self.db.query(models.Flashcard).filter(
            models.Flashcard.user_id == user_id
        ).with_entities(
            func.avg(models.Flashcard.ease_factor)
        ).scalar() or 2.5
        
        return {
            "total_flashcards": total_cards,
            "due_today": due_today,
            "new_cards": new_cards,
            "mastered_cards": mastered,
            "reviews_today": reviews_today,
            "average_ease_factor": round(avg_ease, 2),
            "retention_rate": self._calculate_retention_rate(user_id)
        }
    
    def _calculate_retention_rate(self, user_id: int) -> float:
        """Calculate retention rate based on recent reviews"""
        from sqlalchemy import func
        
        # Get last 100 reviews
        recent_reviews = self.db.query(models.FlashcardReview).filter(
            models.FlashcardReview.user_id == user_id
        ).order_by(
            models.FlashcardReview.reviewed_at.desc()
        ).limit(100).all()
        
        if not recent_reviews:
            return 0.0
        
        successful = sum(1 for r in recent_reviews if r.quality_score >= 3)
        return round((successful / len(recent_reviews)) * 100, 1)
    
    def generate_flashcards_from_content(
        self,
        user_id: int,
        content: str,
        goal_id: Optional[int] = None,
        num_cards: int = 5
    ) -> List[models.Flashcard]:
        """
        Generate flashcards from learning content using AI.
        This would integrate with the AI service.
        """
        # Placeholder for AI-generated flashcards
        # In implementation, this would call the AI service to generate Q&A pairs
        flashcards = []
        
        # For now, create a simple example
        if num_cards > 0:
            card = self.create_flashcard(
                user_id=user_id,
                front_content="What is the key concept from this material?",
                back_content="This is a placeholder. AI-generated cards would appear here.",
                goal_id=goal_id,
                tags=["ai-generated"]
            )
            flashcards.append(card)
        
        return flashcards


# Import for stats calculation
from sqlalchemy import func
